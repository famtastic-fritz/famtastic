'use strict';

function registerRuntimeStatusRoutes({
  app,
  fs,
  path,
  sitesRoot,
  getTag,
  isBuildInProgress,
  readSpec,
  writeSpec,
  readSpecForSite,
  listPages,
  runBuildVerification,
}) {
  app.get('/api/build-status/:tag', (req, res) => {
    const tagParam = req.params.tag;
    if (!tagParam || !/^[a-z0-9][a-z0-9-]*$/.test(tagParam)) {
      return res.status(400).json({ error: 'invalid tag' });
    }

    const siteDir = path.join(sitesRoot, tagParam);
    const specPath = path.join(siteDir, 'spec.json');
    if (!fs.existsSync(specPath)) return res.status(404).json({ error: 'site not found' });

    try {
      const spec = readSpecForSite(siteDir);
      const distDir = path.join(siteDir, 'dist');
      const htmlFiles = fs.existsSync(distDir)
        ? fs.readdirSync(distDir).filter((f) => f.endsWith('.html') && !f.startsWith('_'))
        : [];
      res.json({
        tag: tagParam,
        state: spec.state || 'unknown',
        building: isBuildInProgress() && getTag() === tagParam,
        pages_built: htmlFiles.length,
        pages: htmlFiles,
        has_brief: !!(spec.client_brief || spec.design_brief),
        fam_score: spec.fam_score || null,
        deployed_url: spec.deployed_url || null,
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/verify', (req, res) => {
    const spec = readSpec();
    res.json(spec.last_verification || null);
  });

  app.post('/api/verify', (req, res) => {
    const pages = listPages();
    if (pages.length === 0) {
      return res.json({
        status: 'failed',
        checks: [],
        issues: ['No pages found'],
        timestamp: new Date().toISOString(),
      });
    }
    const result = runBuildVerification(pages);
    try {
      const spec = readSpec();
      spec.last_verification = result;
      writeSpec(spec);
    } catch {}
    res.json(result);
  });
}

module.exports = { registerRuntimeStatusRoutes };
