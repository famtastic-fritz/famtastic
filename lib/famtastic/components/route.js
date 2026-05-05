'use strict';

// lib/famtastic/components/route.js
// HTTP routes for the component library.
// Mount: app.use('/api/components', require('./lib/famtastic/components/route.js'))

const express = require('express');
const components = require('./index.js');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ components: components.list({ kind: req.query.kind, studio: req.query.studio }) });
});

router.get('/summary', (req, res) => {
  res.json(components.summary());
});

router.get('/:id', (req, res) => {
  const c = components.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'not_found', id: req.params.id });
  res.json(c);
});

router.post('/refresh', (req, res) => {
  components.discover();
  res.json(components.summary());
});

module.exports = router;
