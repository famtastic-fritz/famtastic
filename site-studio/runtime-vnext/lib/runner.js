'use strict';
/**
 * runtime-vnext/lib/runner.js — narrow SQLite-backed recipe runner.
 *
 * Executes resolved recipes with topological order, foreach fanout, retries,
 * cancellation, and crash recovery.
 */

const fs = require('fs');
const path = require('path');
const db = require('../state/db');
const { generateStageAttemptId } = require('./id');
const { resolveObject } = require('./expression-engine');
const { appendAuditEvent } = require('./run-context');

class RecipeRunner {
  constructor({ registry, eventBus, envWhitelist = [] }) {
    this.registry = registry;
    this.eventBus = eventBus;
    this.envWhitelist = new Set(envWhitelist);
    this._activeRuns = new Map(); // run_id -> AbortController
  }

  _emit(eventType, payload) {
    if (this.eventBus) {
      this.eventBus.emit(eventType, payload);
    }
  }

  _buildExpressionContext({ projectContext, runContext, spec, stages, item }) {
    const env = {};
    for (const key of this.envWhitelist) {
      if (process.env[key] !== undefined) {
        env[key] = process.env[key];
      }
    }
    return {
      project: projectContext,
      spec,
      stages,
      item,
      env,
    };
  }

  _resolveStageOutputs(stageId, stageOutputs) {
    return stageOutputs[stageId] || { outputs: {} };
  }

  async prepare({ projectContext, runContext, resolvedRecipe, spec = {} }) {
    const workspaceRoot = runContext.workspace_root;
    fs.writeFileSync(
      path.join(workspaceRoot, 'resolved-recipe.json'),
      JSON.stringify(resolvedRecipe, null, 2)
    );

    db.updateRunStatus(runContext.run_id, 'running');
    runContext.status = 'running';
    appendAuditEvent(workspaceRoot, {
      type: 'run:running',
      run_id: runContext.run_id,
    });
    this._emit('run:running', { runContext });

    return { resolvedRecipe, spec };
  }

  async execute({ projectContext, runContext, resolvedRecipe, spec = {}, publish = false }) {
    const controller = new AbortController();
    this._activeRuns.set(runContext.run_id, controller);

    try {
      await this.prepare({ projectContext, runContext, resolvedRecipe, spec });

      const stageOutputs = {};
      const stageMap = new Map(resolvedRecipe.rawStages.map((s) => [s.id, s]));
      const graphNodeMap = new Map(resolvedRecipe.stageGraph.map((n) => [n.stageId, n]));

      for (const stageId of resolvedRecipe.executionOrder) {
        if (controller.signal.aborted) {
          throw new Error('Run cancelled');
        }

        const stage = stageMap.get(stageId);
        const graphNode = graphNodeMap.get(stageId);

        // Guard
        if (stage.guard) {
          const guardCtx = this._buildExpressionContext({
            projectContext,
            runContext,
            spec,
            stages: stageOutputs,
            item: null,
          });
          const guardValue = resolveObject(stage.guard, guardCtx);
          if (!guardValue) {
            stageOutputs[stageId] = { outputs: {}, skipped: true };
            continue;
          }
        }

        // Foreach expansion
        let items = [null];
        if (stage.foreach) {
          const foreachCtx = this._buildExpressionContext({
            projectContext,
            runContext,
            spec,
            stages: stageOutputs,
            item: null,
          });
          const expanded = resolveObject(stage.foreach, foreachCtx);
          if (!Array.isArray(expanded)) {
            throw new Error(`Stage ${stageId} foreach expression did not resolve to an array`);
          }
          items = expanded;
        }

        // Execute for each item
        const itemResults = [];
        for (let index = 0; index < items.length; index++) {
          const item = items[index];
          const result = await this._executeStageAttempt({
            projectContext,
            runContext,
            stage,
            graphNode,
            spec,
            stageOutputs,
            item,
            itemIndex: index,
            signal: controller.signal,
          });
          itemResults.push(result);
        }

        // Store outputs for downstream stages
        const outputName = stage.outputs && stage.outputs[0] ? stage.outputs[0] : 'result';
        stageOutputs[stageId] = {
          outputs: {
            [outputName]: items.length === 1 ? itemResults[0] : itemResults,
          },
        };
      }

      db.updateRunStatus(runContext.run_id, 'committing');
      appendAuditEvent(runContext.workspace_root, {
        type: 'run:committed',
        run_id: runContext.run_id,
      });
      this._emit('run:committed', { runContext });

      db.updateRunStatus(runContext.run_id, 'published', new Date().toISOString());
      runContext.status = 'published';
      runContext.ended_at = new Date().toISOString();
      appendAuditEvent(runContext.workspace_root, {
        type: 'run:published',
        run_id: runContext.run_id,
      });
      this._emit('run:published', { runContext });

      if (publish) {
        await this.publish({ runContext, projectContext });
      }

      return { status: 'published', runContext, stageOutputs };
    } catch (err) {
      runContext.status = 'failed';
      runContext.ended_at = new Date().toISOString();
      db.updateRunStatus(runContext.run_id, 'failed', runContext.ended_at);
      appendAuditEvent(runContext.workspace_root, {
        type: 'run:failed',
        run_id: runContext.run_id,
        error: err.message,
      });
      this._emit('run:failed', { runContext, error: err.message });
      return { status: 'failed', runContext, error: err.message };
    } finally {
      this._activeRuns.delete(runContext.run_id);
    }
  }

  async _executeStageAttempt({ projectContext, runContext, stage, graphNode, spec, stageOutputs, item, itemIndex, signal }) {
    const stageId = stage.id;
    const maxAttempts = (stage.retries != null ? stage.retries : this._defaultRetries(stage.family)) + 1;
    const timeoutSec = stage.timeout_sec || this._defaultTimeout(stage.family);

    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const stageAttemptId = generateStageAttemptId();
      const startedAt = new Date().toISOString();

      const resolvedInputs = resolveObject(stage.inputs || {}, this._buildExpressionContext({
        projectContext,
        runContext,
        spec,
        stages: stageOutputs,
        item,
      }));

      db.createStageAttempt({
        stageAttemptId,
        runId: runContext.run_id,
        stageId,
        attemptNumber: attempt,
        status: 'running',
        inputsJson: JSON.stringify(resolvedInputs),
        outputsJson: null,
        startedAt,
      });

      this._emit('stage:running', { runContext, stageId, stageAttemptId, attempt });
      appendAuditEvent(runContext.workspace_root, {
        type: 'stage:running',
        run_id: runContext.run_id,
        stage_id: stageId,
        stage_attempt_id: stageAttemptId,
        attempt,
      });

      try {
        const runner = this.registry.get(stage.family, stage.provider || null);
        const request = {
          ...resolvedInputs,
          runId: runContext.run_id,
          stageAttemptId,
        };

        const result = await this._runWithTimeout(
          runner.execute(request, {
            runContext,
            stageAttempt: { stage_attempt_id: stageAttemptId, stage_id: stageId, attempt_number: attempt },
            abortSignal: signal,
          }),
          timeoutSec,
          signal
        );

        // Move staging -> outputs for file artifacts
        this._commitStageArtifacts(runContext.workspace_root, result);

        const endedAt = new Date().toISOString();
        db.updateStageAttemptStatus(stageAttemptId, 'succeeded', endedAt);
        db.updateStageAttemptOutputs(stageAttemptId, JSON.stringify(result));
        this._emit('stage:succeeded', { runContext, stageId, stageAttemptId });
        appendAuditEvent(runContext.workspace_root, {
          type: 'stage:succeeded',
          run_id: runContext.run_id,
          stage_id: stageId,
          stage_attempt_id: stageAttemptId,
        });

        return result;
      } catch (err) {
        lastError = err;
        const endedAt = new Date().toISOString();
        db.updateStageAttemptStatus(stageAttemptId, 'failed', endedAt);
        this._emit('stage:failed', { runContext, stageId, stageAttemptId, error: err.message });
        appendAuditEvent(runContext.workspace_root, {
          type: 'stage:failed',
          run_id: runContext.run_id,
          stage_id: stageId,
          stage_attempt_id: stageAttemptId,
          error: err.message,
        });

        if (attempt === maxAttempts) {
          if (graphNode.compensation) {
            // Compensation is best-effort; does not trigger publish
            await this._runCompensation({
              projectContext,
              runContext,
              stage,
              spec,
              stageOutputs,
              signal,
            });
          }
          if (graphNode.onFailure === 'continue') {
            return { error: err.message, failed: true };
          }
          throw err;
        }
      }
    }

    throw lastError || new Error(`Stage ${stageId} failed`);
  }

  async _runWithTimeout(promise, timeoutSec, signal) {
    if (!timeoutSec || timeoutSec <= 0) return promise;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Stage timed out after ${timeoutSec}s`));
      }, timeoutSec * 1000);

      const onAbort = () => {
        clearTimeout(timer);
        reject(new Error('Stage cancelled'));
      };

      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }

      promise
        .then((result) => {
          clearTimeout(timer);
          if (signal) signal.removeEventListener('abort', onAbort);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          if (signal) signal.removeEventListener('abort', onAbort);
          reject(err);
        });
    });
  }

  _commitStageArtifacts(workspaceRoot, result) {
    if (!result || !result.sideEffects) return;
    const stagingDir = path.join(workspaceRoot, 'staging');
    const outputsDir = path.join(workspaceRoot, 'outputs');
    for (const effect of result.sideEffects) {
      if (effect.kind === 'write' || effect.kind === 'copy' || effect.kind === 'transform') {
        const src = path.join(stagingDir, effect.path);
        const dest = path.join(outputsDir, effect.path);
        if (fs.existsSync(src)) {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.renameSync(src, dest);
        }
      }
    }
  }

  async _runCompensation({ projectContext, runContext, stage, spec, stageOutputs, signal }) {
    // Compensation stage must be defined in the recipe
    const compensationStage = stage.compensation;
    if (!compensationStage) return;
    // Minimal compensation support: run the named tool with stage inputs
    // For M10, compensation is stubbed as a trace event.
    appendAuditEvent(runContext.workspace_root, {
      type: 'stage:compensating',
      run_id: runContext.run_id,
      stage_id: stage.id,
      compensation_stage: compensationStage,
    });
  }

  async publish({ runContext, projectContext }) {
    const outputsDir = path.join(runContext.workspace_root, 'outputs');
    const distDir = path.join(projectContext.sites_root, projectContext.site_tag, 'dist');
    fs.mkdirSync(distDir, { recursive: true });

    if (!fs.existsSync(outputsDir)) return;

    for (const entry of fs.readdirSync(outputsDir, { withFileTypes: true })) {
      const src = path.join(outputsDir, entry.name);
      const dest = path.join(distDir, entry.name);
      if (entry.isDirectory()) {
        fs.cpSync(src, dest, { recursive: true, force: true });
      } else {
        fs.copyFileSync(src, dest);
      }
    }

    appendAuditEvent(runContext.workspace_root, {
      type: 'run:published',
      run_id: runContext.run_id,
      destination: distDir,
    });
  }

  cancel(runId) {
    const controller = this._activeRuns.get(runId);
    if (controller) {
      controller.abort();
      db.updateRunStatus(runId, 'cancelled', new Date().toISOString());
      return true;
    }
    return false;
  }

  crashRecoveryScan() {
    const running = db.listRunningRuns();
    const recovered = [];
    for (const run of running) {
      // Simple policy: if resolved-recipe.json exists and run is running,
      // mark as failed because we cannot safely resume arbitrary stages in M10.
      db.updateRunStatus(run.run_id, 'failed', new Date().toISOString());
      recovered.push(run.run_id);
    }
    return recovered;
  }

  _defaultRetries(family) {
    switch (family) {
      case 'TextModelRunner': return 2;
      case 'ImageGenerator': return 2;
      case 'ImageEditor': return 2;
      case 'BrowserCapture': return 1;
      case 'DeterministicToolRunner': return 0;
      default: return 0;
    }
  }

  _defaultTimeout(family) {
    switch (family) {
      case 'TextModelRunner': return 180;
      case 'ImageGenerator': return 120;
      case 'ImageEditor': return 120;
      case 'BrowserCapture': return 60;
      case 'DeterministicToolRunner': return 30;
      default: return 30;
    }
  }
}

module.exports = { RecipeRunner };
