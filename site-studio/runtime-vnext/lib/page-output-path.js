'use strict';

function normalizeRoute(route) {
  if (!route || route === '/') return '/';
  const trimmed = String(route).trim();
  if (!trimmed || trimmed === '/') return '/';
  const withoutQuery = trimmed.split('?')[0].split('#')[0];
  const core = withoutQuery.replace(/^\/+/, '').replace(/\/+$/, '');
  return core ? '/' + core : '/';
}

function outputPathForPage(pageManifest = {}) {
  if (pageManifest.output_path) return pageManifest.output_path;
  const route = normalizeRoute(pageManifest.route || '/');
  return route === '/' ? 'index.html' : route.slice(1) + '.html';
}

function urlPathForPage(pageManifest = {}) {
  const route = normalizeRoute(pageManifest.route || '/');
  return route === '/' ? '/' : route + '.html';
}

module.exports = {
  normalizeRoute,
  outputPathForPage,
  urlPathForPage,
};
