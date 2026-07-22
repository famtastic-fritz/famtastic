'use strict';

const SCHEMAS = {
  BuildRequest: {
    validate(d) {
      if (!d || typeof d !== 'object') return ['must be an object'];
      const e = [];
      if (!d.project_id) e.push('project_id required');
      if (!d.run_id) e.push('run_id required');
      if (!d.site_tag) e.push('site_tag required');
      if (!d.product_type) e.push('product_type required');
      if (!d.deployment_mode) e.push('deployment_mode required');
      if (!d.architecture_preference) e.push('architecture_preference required');
      if (!d.business || typeof d.business !== 'object') e.push('business (object) required');
      if (!d.positioning || typeof d.positioning !== 'object') e.push('positioning (object) required');
      if (!d.brand || typeof d.brand !== 'object') e.push('brand (object) required');
      return e;
    },
  },
  ArchitectureDecision: {
    validate(d) {
      if (!d || typeof d !== 'object') return ['must be an object'];
      const e = [];
      if (!d.architecture) e.push('architecture required');
      if (typeof d.page_count !== 'number') e.push('page_count (number) required');
      if (!d.route_model) e.push('route_model required');
      if (!d.layout_model) e.push('layout_model required');
      if (!Array.isArray(d.rejected_patterns)) e.push('rejected_patterns (array) required');
      if (!d.rationale) e.push('rationale required');
      return e;
    },
  },
  SiteManifest: {
    validate(d) {
      if (!d || typeof d !== 'object') return ['must be an object'];
      const e = [];
      if (!d.site_tag) e.push('site_tag required');
      if (!d.site_name) e.push('site_name required');
      if (!Array.isArray(d.pages)) e.push('pages (array) required');
      if (!d.architecture) e.push('architecture required');
      return e;
    },
  },
  PageManifest: {
    validate(d) {
      if (!d || typeof d !== 'object') return ['must be an object'];
      const e = [];
      if (!d.page_id) e.push('page_id required');
      if (!d.route) e.push('route required');
      if (!d.title) e.push('title required');
      if (!d.purpose) e.push('purpose required');
      if (!Array.isArray(d.required_sections)) e.push('required_sections (array) required');
      if (!d.cta) e.push('cta required');
      return e;
    },
  },
  ContentPacket: {
    validate(d) {
      if (!d || typeof d !== 'object') return ['must be an object'];
      const e = [];
      if (!d.page_id) e.push('page_id required');
      if (!d.headline) e.push('headline required');
      if (d.subheadline === undefined) e.push('subheadline required');
      if (!d.primary_cta || typeof d.primary_cta !== 'object') e.push('primary_cta (object) required');
      if (!Array.isArray(d.sections)) e.push('sections (array) required');
      return e;
    },
  },
  DesignTokenPack: {
    validate(d) {
      if (!d || typeof d !== 'object') return ['must be an object'];
      const e = [];
      if (!d.colors || typeof d.colors !== 'object') e.push('colors (object) required');
      if (!d.typography || typeof d.typography !== 'object') e.push('typography (object) required');
      if (!d.spacing || typeof d.spacing !== 'object') e.push('spacing (object) required');
      if (typeof d.css_output !== 'string') e.push('css_output (string) required');
      return e;
    },
  },
  ComponentPlan: {
    validate(d) {
      if (!d || typeof d !== 'object') return ['must be an object'];
      const e = [];
      if (!d.page_id) e.push('page_id required');
      if (!Array.isArray(d.components)) e.push('components (array) required');
      return e;
    },
  },
  MediaPlan: {
    validate(d) {
      if (!d || typeof d !== 'object') return ['must be an object'];
      const e = [];
      if (!d.page_id) e.push('page_id required');
      if (!Array.isArray(d.media_items)) e.push('media_items (array) required');
      return e;
    },
  },
  JsBehaviorPlan: {
    validate(d) {
      if (!d || typeof d !== 'object') return ['must be an object'];
      const e = [];
      if (!Array.isArray(d.modules)) e.push('modules (array) required');
      return e;
    },
  },
  SeoPack: {
    validate(d) {
      if (!d || typeof d !== 'object') return ['must be an object'];
      const e = [];
      if (!Array.isArray(d.pages)) e.push('pages (array) required');
      return e;
    },
  },
  BuildAssemblyManifest: {
    validate(d) {
      if (!d || typeof d !== 'object') return ['must be an object'];
      const e = [];
      if (!d.site_tag) e.push('site_tag required');
      if (!d.dist_root) e.push('dist_root required');
      if (!Array.isArray(d.pages)) e.push('pages (array) required');
      if (!Array.isArray(d.assets)) e.push('assets (array) required');
      return e;
    },
  },
  QaReport: {
    validate(d) {
      if (!d || typeof d !== 'object') return ['must be an object'];
      const e = [];
      if (!d.qa_type) e.push('qa_type required');
      if (!d.status) e.push('status required');
      if (!Array.isArray(d.checks)) e.push('checks (array) required');
      return e;
    },
  },
  DeployReport: {
    validate(d) {
      if (!d || typeof d !== 'object') return ['must be an object'];
      const e = [];
      if (!d.deploy_type) e.push('deploy_type required');
      if (!d.status) e.push('status required');
      return e;
    },
  },
  ProofReport: {
    validate(d) {
      if (!d || typeof d !== 'object') return ['must be an object'];
      const e = [];
      if (!d.run_id) e.push('run_id required');
      if (!d.site_tag) e.push('site_tag required');
      if (!d.status) e.push('status required');
      if (!d.summary) e.push('summary required');
      if (!Array.isArray(d.artifacts)) e.push('artifacts (array) required');
      return e;
    },
  },
};

function validate(artifactType, data) {
  const schema = SCHEMAS[artifactType];
  if (!schema) throw new Error(`Unknown artifact type: ${artifactType}`);
  const errors = schema.validate(data);
  if (errors.length > 0) {
    throw new Error(`Contract violation [${artifactType}]: ${errors.join('; ')}`);
  }
  return true;
}

module.exports = { validate, SCHEMAS };
