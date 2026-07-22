'use strict';

class MediaPlannerRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    try {
      const pm = request.pageManifest || {};
      const b = request.buildRequest || {};
      const assets = (b.assets_available || {});
      const hasPhoto = !!assets.photography;

      const sections = pm.required_sections || [];
      const media_items = [];
      const missing_ideal = [];

      if (sections.includes('hero')) {
        const status = hasPhoto ? 'available' : 'placeholder';
        const source_type = hasPhoto ? 'available' : 'placeholder';
        if (!hasPhoto) missing_ideal.push('hero-image');
        media_items.push({
          id: 'hero-bg-' + (pm.page_id || 'home'),
          slot: 'hero-background',
          status,
          source_type,
          path: 'images/hero-bg.svg',
        });
      }

      const servicesSections = sections.filter(s => s.startsWith('services'));
      if (servicesSections.length > 0) {
        const services = (b.content_inputs || {}).services || [];
        services.slice(0, 3).forEach((svc, i) => {
          media_items.push({
            id: 'service-icon-' + i,
            slot: 'service-' + i + '-icon',
            status: 'placeholder',
            source_type: 'placeholder',
            path: 'images/service-' + i + '.svg',
          });
        });
      }

      return {
        result: {
          page_id: pm.page_id || 'home',
          media_items,
          missing_ideal,
          has_blocking_media: false,
        },
        sideEffects: [],
        artifactReferences: [],
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
        costUsd: 0,
      };
    } catch (err) {
      return {
        result: { page_id: 'unknown', media_items: [], missing_ideal: [], has_blocking_media: false },
        sideEffects: [],
        artifactReferences: [],
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
        costUsd: 0,
      };
    }
  }
}

module.exports = { MediaPlannerRunner };
