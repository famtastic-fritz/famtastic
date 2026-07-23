'use strict';
/**
 * runtime-vnext/lib/expression-engine.js — minimal sandboxed {{...}} evaluator.
 *
 * Allowed root variables: project, spec, stages, item, env.
 * No arbitrary JavaScript evaluation.
 */

const TEMPLATE_RE = /\{\{\s*([^}]+?)\s*\}\}/g;

function getPath(obj, path) {
  const parts = path.split('.');
  let value = obj;
  for (const part of parts) {
    if (value == null || typeof value !== 'object') {
      return undefined;
    }
    value = value[part];
  }
  return value;
}

function evaluateExpression(expr, context) {
  const trimmed = expr.trim();
  const allowedRoots = new Set(['project', 'spec', 'stages', 'item', 'env']);

  // Disallow anything that looks like function calls, operators, or literals
  if (/[(){}[\];,]/.test(trimmed)) {
    throw new Error(`Expression contains forbidden characters: ${expr}`);
  }
  if (/[+*/=!?&|<>]/.test(trimmed)) {
    throw new Error(`Expression contains operators: ${expr}`);
  }

  const rootMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
  if (!rootMatch) {
    throw new Error(`Expression must start with an allowed variable: ${expr}`);
  }
  const root = rootMatch[1];
  if (!allowedRoots.has(root)) {
    throw new Error(`Variable '${root}' is not allowed in expressions: ${expr}`);
  }

  const rest = trimmed.slice(root.length).replace(/^\./, '');
  const value = rest ? getPath(context[root], rest) : context[root];
  return value;
}

function resolveTemplate(value, context) {
  if (typeof value !== 'string') return value;

  const matches = [...value.matchAll(TEMPLATE_RE)];
  if (matches.length === 0) return value;

  // Single expression occupying the whole string: preserve type
  if (matches.length === 1 && matches[0][0] === value) {
    return evaluateExpression(matches[0][1], context);
  }

  // Interpolated string: coerce each expression to string
  let result = value;
  for (const match of matches) {
    const exprValue = evaluateExpression(match[1], context);
    result = result.replace(match[0], exprValue == null ? '' : String(exprValue));
  }
  return result;
}

function resolveObject(obj, context) {
  if (Array.isArray(obj)) {
    return obj.map((item) => resolveObject(item, context));
  }
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(obj)) {
      out[key] = resolveObject(val, context);
    }
    return out;
  }
  return resolveTemplate(obj, context);
}

module.exports = {
  resolveTemplate,
  resolveObject,
  evaluateExpression,
};
