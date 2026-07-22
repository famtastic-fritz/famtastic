'use strict';
const { ModelRunnerRegistry } = require('./model-runner-registry');

// Milestone B — bootstrap/config
const { RepoBootstrapRunner } = require('../families/repo-bootstrap-runner');
const { ConfigScaffoldRunner } = require('../families/config-scaffold-runner');

// Milestone C planning
const { ArchitectureDeciderRunner } = require('../families/architecture-decider-runner');
const { SitemapPlannerRunner } = require('../families/sitemap-planner-runner');

// Milestone C content
const { PageCopyRunner } = require('../families/page-copy-runner');
const { DesignTokenRunner } = require('../families/design-token-runner');
const { JsBehaviorRunner } = require('../families/js-behavior-runner');

// Milestone C build
const { PageBuilderRunner } = require('../families/page-builder-runner');
const { SharedAssetsRunner } = require('../families/shared-assets-runner');
const { AssemblyRunner } = require('../families/assembly-runner');

// Milestone D — components/media
const { ComponentSelectorRunner } = require('../families/component-selector-runner');
const { CustomComponentBuilderRunner } = require('../families/custom-component-builder-runner');
const { MediaPlannerRunner } = require('../families/media-planner-runner');
const { MediaGenerationRunner } = require('../families/media-generation-runner');

// Milestone E — SEO/QA/proof
const { SeoPackRunner } = require('../families/seo-pack-runner');
const { StructuralQaRunner } = require('../families/structural-qa-runner');
const { ContentQaRunner } = require('../families/content-qa-runner');
const { BrowserQaRunner } = require('../families/browser-qa-runner');
const { ProofCuratorRunner } = require('../families/proof-curator-runner');
const { GapLoggerRunner } = require('../families/gap-logger-runner');

// Milestone F — deploy
const { NetlifyStagingDeployRunner } = require('../families/netlify-staging-deploy-runner');
const { ProdDeployRouterRunner } = require('../families/prod-deploy-router-runner');

function buildSiteBuildRegistry() {
  const registry = new ModelRunnerRegistry();
  const det = 'deterministic';

  // B
  registry.register('repo-bootstrap', det, new RepoBootstrapRunner());
  registry.register('config-scaffold', det, new ConfigScaffoldRunner());

  // C planning
  registry.register('architecture-decider', det, new ArchitectureDeciderRunner());
  registry.register('sitemap-planner', det, new SitemapPlannerRunner());

  // C content
  registry.register('page-copy', det, new PageCopyRunner());
  registry.register('design-token', det, new DesignTokenRunner());
  registry.register('js-behavior', det, new JsBehaviorRunner());

  // C build
  registry.register('page-builder', det, new PageBuilderRunner());
  registry.register('shared-assets', det, new SharedAssetsRunner());
  registry.register('assembly', det, new AssemblyRunner());

  // D
  registry.register('component-selector', det, new ComponentSelectorRunner());
  registry.register('custom-component-builder', det, new CustomComponentBuilderRunner());
  registry.register('media-planner', det, new MediaPlannerRunner());
  registry.register('media-generation', det, new MediaGenerationRunner());

  // E
  registry.register('seo-pack', det, new SeoPackRunner());
  registry.register('structural-qa', det, new StructuralQaRunner());
  registry.register('content-qa', det, new ContentQaRunner());
  registry.register('browser-qa', det, new BrowserQaRunner());
  registry.register('proof-curator', det, new ProofCuratorRunner());
  registry.register('gap-logger', det, new GapLoggerRunner());

  // F
  registry.register('netlify-staging-deploy', det, new NetlifyStagingDeployRunner());
  registry.register('prod-deploy-router', det, new ProdDeployRouterRunner());

  return registry;
}

module.exports = { buildSiteBuildRegistry };
