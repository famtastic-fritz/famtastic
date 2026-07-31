'use strict';
/**
 * server/content-field-routes.js
 *
 * Operator V1 content-field endpoints, ported from the content-field slice of
 * feature/site-studio-runtime-vnext-closeout's
 * server/build-content-capability-routes.js and adapted to main (which keeps
 * the rest of that router's blueprint/capability routes inline in server.js).
 *
 *   GET  /api/content-fields/:page  -> spec.content[page].fields for an
 *                                      EXPLICIT siteTag
 *   POST /api/content-field         -> surgical dist-vnext HTML edit + global
 *                                      field cascade + spec write (atomic)
 *
 * Both routes REQUIRE an explicit siteTag (400 site_tag_required otherwise) —
 * the legacy zero-tag ambient behavior is removed on these routes. The V1
 * artifact is dist-vnext, and only dist-vnext: a site with no vNext build is a
 * 409 (no_vnext_build), never a silent fallback to legacy dist.
 *
 * Mount BEFORE the legacy cross-origin allow-list in server.js, matching the
 * feature's route ordering: V1 callers authenticate via lib/auth (session+CSRF
 * or bearer), not the Origin header.
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const cheerio = require('cheerio');
const { siteTagOr400 } = require('../lib/request-context');
const { isValidPageName } = require('./validators');

/** Atomic file replace: temp file in the same directory + rename. */
function writeFileAtomic(filePath, content) {
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, filePath);
}

function createContentFieldRouter(options = {}) {
  const {
    readSpec,
    writeSpec,
    getDistVnextDir,
    listPagesInDir,
    studioEvents,
    STUDIO_EVENTS,
  } = options;

  if (
    typeof readSpec !== 'function' ||
    typeof writeSpec !== 'function' ||
    typeof getDistVnextDir !== 'function' ||
    typeof listPagesInDir !== 'function'
  ) {
    throw new Error('createContentFieldRouter missing required dependencies');
  }

  const router = express.Router();

  router.get('/content-fields/:page', (req, res) => {
    const page = req.params.page;
    if (!isValidPageName(page)) return res.status(400).json({ error: 'Invalid page name' });
    // Explicit site authority — V1 never reads the ambient operator site.
    const siteTag = siteTagOr400(req, res);
    if (!siteTag) return;
    const spec = readSpec(siteTag);
    const fields = spec.content?.[page]?.fields || [];
    res.json({ page, fields, total: fields.length });
  });

  // Update a single content field — surgical edit endpoint.
  router.post('/content-field', (req, res) => {
    const { page, field_id, new_value } = req.body || {};
    if (!page || !field_id || new_value === undefined) {
      return res.status(400).json({ error: 'page, field_id, and new_value required' });
    }

    // Resolve the site ONCE, explicitly, at request start — the HTML edit, the
    // cascade, the spec write and the EDIT_APPLIED event all name this site.
    // No ambient fallback: a V1 edit that cannot name its site is a 400.
    const siteTag = siteTagOr400(req, res);
    if (!siteTag) return;

    // The V1 artifact is dist-vnext, and only dist-vnext — the edit and the
    // global-field cascade below read and write that tree atomically. No silent
    // fallback to legacy dist: a site with no vNext build is a 409.
    const distVnextDir = getDistVnextDir(siteTag);
    if (!fs.existsSync(distVnextDir)) {
      return res.status(409).json({
        error: 'no_vnext_build',
        message: `Site ${siteTag} has no vNext build (dist-vnext is missing). Run POST /api/site-studio/build-vnext first.`,
      });
    }

    const spec = readSpec(siteTag);
    const field = spec.content?.[page]?.fields?.find((entry) => entry.field_id === field_id);
    if (!field) return res.status(404).json({ error: 'Field not found in spec.content' });

    const oldValue = typeof field.value === 'string'
      ? field.value
      : (field.value?.text || JSON.stringify(field.value));

    const pagePath = path.join(distVnextDir, page);
    if (!fs.existsSync(pagePath)) return res.status(404).json({ error: 'Page HTML not found' });

    let html = fs.readFileSync(pagePath, 'utf8');
    const $ = cheerio.load(html);
    const element = $(`[data-field-id="${field_id}"]`);

    if (element.length > 0) {
      element.text(new_value);
      if (field.type === 'phone' && element.attr('href')?.startsWith('tel:')) {
        element.attr('href', `tel:+1${new_value.replace(/\D/g, '')}`);
      } else if (field.type === 'email' && element.attr('href')?.startsWith('mailto:')) {
        element.attr('href', `mailto:${new_value}`);
      }
      writeFileAtomic(pagePath, $.html());
    } else if (html.includes(oldValue)) {
      html = html.replace(new RegExp(oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), new_value);
      writeFileAtomic(pagePath, html);
    } else {
      return res.status(404).json({ error: `Value "${oldValue}" not found in HTML` });
    }

    field.value = new_value;
    const globalFieldTypes = ['phone', 'email', 'address', 'hours'];
    const cascadePages = [];

    if (globalFieldTypes.includes(field.type) || field.scope === 'global') {
      const allPages = listPagesInDir(distVnextDir).filter((entry) => entry !== page);
      for (const otherPage of allPages) {
        const otherFields = spec.content?.[otherPage]?.fields || [];
        const matchField = otherFields.find((entry) =>
          entry.type === field.type ||
          entry.field_id === field_id ||
          (entry.field_id.includes(field.type) && entry.type === field.type)
        );
        if (!matchField) continue;

        const otherPath = path.join(distVnextDir, otherPage);
        if (!fs.existsSync(otherPath)) continue;

        const otherHtml = fs.readFileSync(otherPath, 'utf8');
        const $other = cheerio.load(otherHtml);
        const otherElement = $other(`[data-field-id="${matchField.field_id}"]`);
        if (otherElement.length === 0) continue;

        otherElement.text(new_value);
        if (field.type === 'phone' && otherElement.attr('href')?.startsWith('tel:')) {
          otherElement.attr('href', `tel:+1${new_value.replace(/\D/g, '')}`);
        } else if (field.type === 'email' && otherElement.attr('href')?.startsWith('mailto:')) {
          otherElement.attr('href', `mailto:${new_value}`);
        }
        writeFileAtomic(otherPath, $other.html());
        matchField.value = new_value;
        cascadePages.push(otherPage);
      }
    }

    writeSpec(spec, {
      siteTag,
      source: 'content_field_api',
      mutationLevel: 'field',
      mutationTarget: field_id,
      oldValue,
      newValue: new_value,
    });

    if (studioEvents && STUDIO_EVENTS) {
      studioEvents.emit(STUDIO_EVENTS.EDIT_APPLIED, { tag: siteTag, page, field_id, new_value });
    }
    res.json({ success: true, field_id, old_value: oldValue, new_value, cascade_pages: cascadePages });
  });

  return router;
}

module.exports = { createContentFieldRouter, writeFileAtomic };
