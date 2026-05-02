'use strict';

// lib/famtastic/ecosystem/route.js
// SHAY V2 (2026-05-02 iter 3): HTTP routes exposing the ecosystem registry.
// Mount on server.js:
//   app.use('/api/ecosystem', require('./lib/famtastic/ecosystem/route.js'));

const express = require('express');
const ecosystem = require('./index.js');

const router = express.Router();

router.get('/studios', (req, res) => {
  res.json({ studios: ecosystem.listStudios() });
});

router.get('/studios/:id', (req, res) => {
  const s = ecosystem.getStudio(req.params.id);
  if (!s) return res.status(404).json({ error: 'not_found', id: req.params.id });
  res.json(s);
});

router.get('/route', (req, res) => {
  const target = req.query.target;
  if (!target) return res.status(400).json({ error: 'target query param required' });
  res.json(ecosystem.resolveHandoffRoute(target));
});

module.exports = router;
