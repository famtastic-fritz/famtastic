'use strict';
/**
 * runtime-vnext/lib/recipe-resolver.js — compile YAML/JSON recipes to resolved graph.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function loadRecipe(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, 'utf8');
  if (ext === '.yaml' || ext === '.yml') {
    return yaml.load(content);
  }
  return JSON.parse(content);
}

function validateRecipe(recipeDoc) {
  if (!recipeDoc || typeof recipeDoc !== 'object') {
    throw new Error('Recipe must be an object');
  }
  const recipe = recipeDoc.recipe;
  if (!recipe || typeof recipe !== 'object') {
    throw new Error('Recipe must have a top-level "recipe" object');
  }
  if (!recipe.id || typeof recipe.id !== 'string') {
    throw new Error('Recipe must have recipe.id');
  }
  if (!recipe.version || typeof recipe.version !== 'string') {
    throw new Error('Recipe must have recipe.version');
  }
  if (!Array.isArray(recipeDoc.stages)) {
    throw new Error('Recipe must have a "stages" array');
  }
  for (const stage of recipeDoc.stages) {
    if (!stage.id || typeof stage.id !== 'string') {
      throw new Error('Every stage must have an id');
    }
    if (!stage.family || typeof stage.family !== 'string') {
      throw new Error(`Stage ${stage.id} must have a family`);
    }
  }

  const ids = new Set();
  for (const stage of recipeDoc.stages) {
    if (ids.has(stage.id)) {
      throw new Error(`Duplicate stage id: ${stage.id}`);
    }
    ids.add(stage.id);
  }
}

function topologicalSort(stageGraph) {
  const visited = new Set();
  const visiting = new Set();
  const order = [];

  function visit(stageId) {
    if (visited.has(stageId)) return;
    if (visiting.has(stageId)) {
      throw new Error(`Cyclic dependency detected at stage: ${stageId}`);
    }
    visiting.add(stageId);
    const node = stageGraph.find((n) => n.stageId === stageId);
    if (!node) {
      throw new Error(`Unknown stage in dependencies: ${stageId}`);
    }
    for (const dep of node.dependencies) {
      visit(dep);
    }
    visiting.delete(stageId);
    visited.add(stageId);
    order.push(stageId);
  }

  for (const node of stageGraph) {
    visit(node.stageId);
  }
  return order;
}

function resolveRecipe(recipeDoc) {
  validateRecipe(recipeDoc);

  const stageMap = new Map();
  for (const stage of recipeDoc.stages) {
    stageMap.set(stage.id, stage);
  }

  const stageGraph = recipeDoc.stages.map((stage) => ({
    stageId: stage.id,
    dependencies: Array.isArray(stage.needs) ? stage.needs : [],
    fanout: stage.foreach ? { from: stage.foreach } : null,
    compensation: stage.compensation || null,
    onFailure: stage.on_failure || 'fail_fast',
    guard: stage.guard || null,
    retryOwner: stage.retry_owner || 'stage',
    timeoutSec: stage.timeout_sec || null,
    retries: stage.retries != null ? stage.retries : null,
  }));

  const executionOrder = topologicalSort(stageGraph);

  return {
    recipe: {
      id: recipeDoc.recipe.id,
      version: recipeDoc.recipe.version,
      description: recipeDoc.recipe.description || '',
    },
    resolvedAt: new Date().toISOString(),
    stageGraph,
    executionOrder,
    rawStages: recipeDoc.stages,
  };
}

function loadAndResolve(filePath) {
  return resolveRecipe(loadRecipe(filePath));
}

module.exports = {
  loadRecipe,
  resolveRecipe,
  loadAndResolve,
  topologicalSort,
};
