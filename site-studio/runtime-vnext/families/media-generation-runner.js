'use strict';
const fs = require('fs');
const path = require('path');

class MediaGenerationRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    try {
      const item = request.mediaPlanItem || {};
      const id = item.id || 'media-item';
      const slot = item.slot || id;
      const source_type = item.source_type || 'placeholder';

      if (source_type === 'generate') {
        return {
          result: { id, status: 'deferred', output_path: null, source: 'generate', prompt: 'Generation provider not configured' },
          sideEffects: [],
          artifactReferences: [],
          durationMs: Number(process.hrtime.bigint() - start) / 1e6,
          costUsd: 0,
        };
      }

      if (source_type === 'available') {
        const srcPath = item.path || null;
        return {
          result: { id, status: 'available', output_path: srcPath, source: 'available', prompt: null },
          sideEffects: [],
          artifactReferences: [],
          durationMs: Number(process.hrtime.bigint() - start) / 1e6,
          costUsd: 0,
        };
      }

      // Placeholder — write SVG
      const relPath = (item.path && item.path.startsWith('images/')) ? item.path : 'images/' + id + '.svg';
      const fullPath = path.join(runContext.workspace_root, 'staging', relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });

      const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600">',
        '  <rect width="1200" height="600" fill="#cccccc"/>',
        `  <text x="600" y="310" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="#666666">${slot.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`,
        '</svg>',
      ].join('\n');

      fs.writeFileSync(fullPath, svg, 'utf8');

      return {
        result: { id, status: 'placeholder', output_path: relPath, source: 'placeholder', prompt: null },
        sideEffects: [{ path: relPath, kind: 'write' }],
        artifactReferences: [],
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
        costUsd: 0,
      };
    } catch (err) {
      const item = request.mediaPlanItem || {};
      return {
        result: { id: item.id || 'unknown', status: 'deferred', output_path: null, source: 'error', prompt: null },
        sideEffects: [],
        artifactReferences: [],
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
        costUsd: 0,
      };
    }
  }
}

module.exports = { MediaGenerationRunner };
