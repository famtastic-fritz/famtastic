'use strict';
/**
 * memory.js — cross-session memory for Shay-Shay (Mem0 + Kuzu semantics)
 *
 * Entity types: 'site', 'user', 'session', 'vertical', 'global'
 * Categories: 'preference', 'decision', 'fact', 'feedback', 'goal', 'general'
 * Importance: 1 (ephemeral) → 10 (critical)
 *
 * Graph (Kuzu-style): memory_links table with from/to entity + relation string.
 * Relations: 'built_by', 'uses_vertical', 'references', 'decided_with', 'similar_to'
 */

const { randomUUID } = require('crypto');
const db = require('./db');

const ENTITY_TYPES = new Set(['site', 'user', 'session', 'vertical', 'global']);
const CATEGORIES   = new Set(['preference', 'decision', 'fact', 'feedback', 'goal', 'general']);

function _assertEntityType(type) {
  if (!ENTITY_TYPES.has(type)) throw new Error(`Invalid entity_type: ${type}`);
}

function remember(entityType, entityId, content, { category = 'general', source, importance = 5 } = {}) {
  _assertEntityType(entityType);
  if (!CATEGORIES.has(category)) category = 'general';
  const id = randomUUID();
  db.addMemory({ id, entity_type: entityType, entity_id: entityId, content, category, source, importance });
  return id;
}

function recall(entityType, entityId, { category, limit = 20 } = {}) {
  return db.getMemories({ entity_type: entityType, entity_id: entityId, category, limit });
}

function recallGlobal({ category, limit = 20 } = {}) {
  return db.getMemories({ entity_type: 'global', entity_id: 'global', category, limit });
}

function search(query, limit = 10) {
  return db.searchMemories(query, limit);
}

function link(fromType, fromId, toType, toId, relation) {
  _assertEntityType(fromType);
  _assertEntityType(toType);
  const id = randomUUID();
  db.addMemoryLink({ id, from_type: fromType, from_id: fromId, to_type: toType, to_id: toId, relation });
  return id;
}

function getLinks({ fromType, fromId, toType, toId, relation } = {}) {
  return db.getMemoryLinks({ from_type: fromType, from_id: fromId, to_type: toType, to_id: toId, relation });
}

function buildShayShayContext(siteTag) {
  const sections = [];

  const global = recallGlobal({ limit: 5 });
  if (global.length) {
    sections.push('GLOBAL MEMORY:\n' + global.map(m => `- [${m.category}] ${m.content}`).join('\n'));
  }

  if (siteTag) {
    const site = recall('site', siteTag, { limit: 8 });
    if (site.length) {
      sections.push(`SITE MEMORY (${siteTag}):\n` + site.map(m => `- [${m.category}] ${m.content}`).join('\n'));
    }

    const links = getLinks({ fromType: 'site', fromId: siteTag });
    if (links.length) {
      sections.push('SITE RELATIONSHIPS:\n' + links.map(l => `- ${siteTag} ${l.relation} ${l.to_type}:${l.to_id}`).join('\n'));
    }
  }

  return sections.length ? sections.join('\n\n') : null;
}

module.exports = { remember, recall, recallGlobal, search, link, getLinks, buildShayShayContext };
