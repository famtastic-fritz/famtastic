'use strict';
/**
 * runtime-vnext/lib/project-context.js — immutable ProjectContext loader.
 *
 * Eliminates mutable global TAG as a runtime authority.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../state/db');
const { generateProjectId } = require('./id');

function deriveDeterministicProjectId(siteTag, hubRoot) {
  const hash = crypto.createHash('sha256')
    .update(`${siteTag}:${hubRoot}`)
    .digest('hex')
    .slice(0, 16);
  return `project_${Date.now()}_${hash.slice(0, 4)}`;
}

function loadProjectContext({ siteTag, hubRoot }) {
  const hubRootAbs = path.resolve(hubRoot || process.cwd());
  const sitesRoot = path.join(hubRootAbs, 'sites');
  const siteDir = path.join(sitesRoot, siteTag);
  const projectFile = path.join(siteDir, '.project.json');

  fs.mkdirSync(siteDir, { recursive: true });

  let project;
  if (fs.existsSync(projectFile)) {
    project = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
    // Reconcile with DB if missing
    const existing = db.getProject(project.project_id);
    if (!existing) {
      db.createProject({
        projectId: project.project_id,
        siteTag: project.site_tag,
        hubRoot: project.hub_root,
        sitesRoot: project.sites_root,
        createdAt: project.created_at,
      });
    }
    return project;
  }

  // Migration path for existing sites: deterministic project_id
  const projectId = deriveDeterministicProjectId(siteTag, hubRootAbs);
  const createdAt = new Date().toISOString();
  project = {
    project_id: projectId,
    site_tag: siteTag,
    hub_root: hubRootAbs,
    sites_root: sitesRoot,
    created_at: createdAt,
  };

  fs.writeFileSync(projectFile, JSON.stringify(project, null, 2));
  db.createProject({
    projectId,
    siteTag,
    hubRoot: hubRootAbs,
    sitesRoot,
    createdAt,
  });

  return project;
}

module.exports = { loadProjectContext };
