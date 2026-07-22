'use strict';
/**
 * runtime-vnext/families/deterministic-tool-runner.js — DeterministicToolRunner.
 *
 * Pure, deterministic tools that operate only inside the run workspace.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { generateArtifactId } = require('../lib/id');
const db = require('../state/db');

function hashBuffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function hashString(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function ensureInsideWorkspace(workspaceRoot, targetPath) {
  const resolved = path.resolve(path.join(workspaceRoot, targetPath));
  const root = path.resolve(workspaceRoot);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error(`Path escapes workspace: ${targetPath}`);
  }
  return resolved;
}

function resolveWorkspacePath(workspaceRoot, relativePath) {
  ensureInsideWorkspace(workspaceRoot, relativePath);
  const outputsPath = path.join(workspaceRoot, 'outputs', relativePath);
  if (fs.existsSync(outputsPath)) {
    return outputsPath;
  }
  return path.join(workspaceRoot, 'staging', relativePath);
}

function stagingPath(workspaceRoot, relativePath) {
  ensureInsideWorkspace(workspaceRoot, relativePath);
  return path.join(workspaceRoot, 'staging', relativePath);
}

function writeArtifactRecord({ runId, stageAttemptId, kind, relativePath, checksum, metadata, createdAt }) {
  const artifactId = generateArtifactId();
  db.createArtifact({
    artifactId,
    runId,
    stageAttemptId,
    kind,
    path: relativePath,
    checksum,
    metadataJson: metadata ? JSON.stringify(metadata) : null,
    createdAt,
  });
  return artifactId;
}

const TOOLS = {
  write_file: ({ arguments: args, runContext, stageAttempt }) => {
    const relativePath = args.path;
    const content = args.content || '';
    const fullPath = stagingPath(runContext.workspace_root, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
    const checksum = hashString(content);
    const createdAt = new Date().toISOString();
    const artifactId = writeArtifactRecord({
      runId: runContext.run_id,
      stageAttemptId: stageAttempt.stage_attempt_id,
      kind: 'file',
      relativePath,
      checksum,
      metadata: { size: Buffer.byteLength(content) },
      createdAt,
    });
    return {
      result: { path: relativePath, bytes: Buffer.byteLength(content) },
      sideEffects: [{ path: relativePath, kind: 'write' }],
      artifactReferences: [artifactId],
    };
  },

  copy_template: ({ arguments: args, runContext, stageAttempt }) => {
    const sourcePath = path.resolve(args.source);
    const relativeDest = args.destination;
    const destPath = stagingPath(runContext.workspace_root, relativeDest);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Template source not found: ${sourcePath}`);
    }
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(sourcePath, destPath);
    const content = fs.readFileSync(destPath);
    const checksum = hashBuffer(content);
    const createdAt = new Date().toISOString();
    const artifactId = writeArtifactRecord({
      runId: runContext.run_id,
      stageAttemptId: stageAttempt.stage_attempt_id,
      kind: 'file',
      relativePath: relativeDest,
      checksum,
      metadata: { source: sourcePath },
      createdAt,
    });
    return {
      result: { source: sourcePath, destination: relativeDest },
      sideEffects: [{ path: relativeDest, kind: 'copy' }],
      artifactReferences: [artifactId],
    };
  },

  apply_transform: ({ arguments: args, runContext, stageAttempt }) => {
    const relativePath = args.path;
    const fullPath = resolveWorkspacePath(runContext.workspace_root, relativePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found for transform: ${relativePath}`);
    }
    let content = fs.readFileSync(fullPath, 'utf8');
    const replacements = args.replacements || [];
    for (const { from, to } of replacements) {
      content = content.split(from).join(to);
    }
    fs.writeFileSync(fullPath, content, 'utf8');
    const checksum = hashString(content);
    const createdAt = new Date().toISOString();
    const artifactId = writeArtifactRecord({
      runId: runContext.run_id,
      stageAttemptId: stageAttempt.stage_attempt_id,
      kind: 'file',
      relativePath,
      checksum,
      metadata: { transform: true, replacements: replacements.length },
      createdAt,
    });
    return {
      result: { path: relativePath, replacementsApplied: replacements.length },
      sideEffects: [{ path: relativePath, kind: 'transform' }],
      artifactReferences: [artifactId],
    };
  },

  verify_file_exists: ({ arguments: args, runContext }) => {
    const relativePath = args.path;
    const fullPath = resolveWorkspacePath(runContext.workspace_root, relativePath);
    const exists = fs.existsSync(fullPath);
    return {
      result: { path: relativePath, exists },
      sideEffects: [],
      artifactReferences: [],
    };
  },

  read_file: ({ arguments: args, runContext }) => {
    const relativePath = args.path;
    const fullPath = resolveWorkspacePath(runContext.workspace_root, relativePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${relativePath}`);
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    return {
      result: { path: relativePath, content },
      sideEffects: [],
      artifactReferences: [],
    };
  },
};

class DeterministicToolRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = Date.now();
    const { toolName, arguments: args, executionContext } = request;
    const handler = TOOLS[toolName];
    if (!handler) {
      throw new Error(`Unknown deterministic tool: ${toolName}`);
    }

    if (abortSignal && abortSignal.aborted) {
      throw new Error('Stage cancelled before tool execution');
    }

    const response = handler({
      arguments: args,
      runContext,
      stageAttempt,
      executionContext: executionContext || {},
    });

    return {
      ...response,
      durationMs: Date.now() - start,
      costUsd: 0,
    };
  }
}

module.exports = {
  DeterministicToolRunner,
  TOOLS,
  ensureInsideWorkspace,
};
