'use strict';

// lib/famtastic/recipes/route.js
// HTTP routes for the recipe library.
// Mount: app.use('/api/recipes', require('./lib/famtastic/recipes/route.js'))

const express = require('express');
const recipes = require('./index.js');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ recipes: recipes.list({ vertical: req.query.vertical, confidence: req.query.confidence }) });
});

router.get('/summary', (req, res) => res.json(recipes.summary()));

router.get('/find', (req, res) => {
  res.json({ matches: recipes.find({ intent: req.query.intent, vertical: req.query.vertical }) });
});

router.get('/:id', (req, res) => {
  const r = recipes.get(req.params.id);
  if (!r) return res.status(404).json({ error: 'not_found', id: req.params.id });
  res.json(r);
});

module.exports = router;
