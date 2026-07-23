'use strict';

const path = require('path');
const fs = require('fs');

function collectDistFiles(distDir) {
  const files = [];
  if (!fs.existsSync(distDir)) return files;

  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const rel = prefix ? `${prefix}/${entry}` : entry;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full, rel);
      } else {
        files.push({ name: rel, size: stat.size });
      }
    }
  };

  walk(distDir, 'dist');
  return files;
}

function registerStudioStateRoutes({
  app,
  readSpec,
  getSiteDir,
  getDistDir,
  getTag,
  getPreviewPort,
  listPages,
  getCurrentPage,
  setCurrentPage,
  saveStudio,
  isValidPageName,
}) {
  app.get('/api/spec', (req, res) => {
    const spec = readSpec();
    if (Object.keys(spec).length > 0) {
      res.json(spec);
    } else {
      res.json({ error: 'No spec.json found' });
    }
  });

  app.get('/api/site-info', (req, res) => {
    const spec = readSpec();
    res.json({ spec });
  });

  app.get('/api/pages', (req, res) => {
    res.json({ pages: listPages(), currentPage: getCurrentPage() });
  });

  app.post('/api/pages/current', (req, res) => {
    const page = req.body.page;
    if (!page) return res.status(400).json({ error: 'page required' });
    if (!isValidPageName(page)) return res.status(400).json({ error: 'Invalid page name' });
    if (!fs.existsSync(path.join(getDistDir(), page))) {
      return res.status(404).json({ error: 'Page not found' });
    }
    setCurrentPage(page);
    saveStudio();
    res.json({ currentPage: getCurrentPage() });
  });

  app.get('/api/studio-state', (req, res) => {
    const spec = readSpec();
    const stateFile = path.join(getSiteDir(), 'state.json');
    const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
    const files = collectDistFiles(getDistDir());

    res.json({
      tag: getTag(),
      lastUpdated: state.last_build || null,
      brief: spec.design_brief || null,
      decisions: (spec.design_decisions || []).filter((d) => d.status === 'approved').slice(-10),
      files,
      spec,
      previewUrl: `http://localhost:${getPreviewPort()}`,
    });
  });
}

module.exports = { registerStudioStateRoutes, collectDistFiles };
