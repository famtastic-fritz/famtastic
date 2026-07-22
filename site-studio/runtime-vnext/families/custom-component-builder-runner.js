'use strict';
const fs = require('fs');
const path = require('path');

class CustomComponentBuilderRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    try {
      const need = request.componentNeed || {};
      const id = need.id || 'custom-component';
      const type = need.type || 'generic';
      const relPath = 'components/' + id + '.html';
      const fullPath = path.join(runContext.workspace_root, 'staging', relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });

      const snippet = `<div class="component ${type}" id="${id}">\n  <!-- ${type} component -->\n  <div class="container"></div>\n</div>\n`;
      fs.writeFileSync(fullPath, snippet, 'utf8');

      return {
        result: {
          component_id: id,
          type,
          output_path: relPath,
          status: 'built',
          metadata: { reusable: true, tokens_used: [] },
        },
        sideEffects: [{ path: relPath, kind: 'write' }],
        artifactReferences: [],
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
        costUsd: 0,
      };
    } catch (err) {
      const need = request.componentNeed || {};
      return {
        result: { component_id: need.id || 'unknown', type: need.type || 'unknown', output_path: null, status: 'deferred', metadata: {} },
        sideEffects: [],
        artifactReferences: [],
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
        costUsd: 0,
      };
    }
  }
}

module.exports = { CustomComponentBuilderRunner };
