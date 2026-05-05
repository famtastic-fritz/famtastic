'use strict';

// lib/famtastic/capture/route.js
// SHAY V2 (2026-05-02 iter 3): Express router exposing capture flywheel via HTTP.
// Mount in server.js:
//   const captureRouter = require('./lib/famtastic/capture/route.js');
//   app.use('/api/capture', captureRouter);
//
// Endpoints:
//   GET /summary    — high-level inventory
//   GET /scan       — detailed input listing
//   GET /captures   — list existing captures
//   GET /patterns   — pattern detection across captures
//   POST /scaffold  — { session, surface, source_file } → creates new scaffold

const express = require('express');
const cap = require('./index.js');
const patterns = require('./patterns.js');

const router = express.Router();

router.get('/summary', (req, res) => {
  try { res.json(cap.summary()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/scan', (req, res) => {
  try {
    res.json({
      imports: cap.scanImports(),
      studio_conversations: cap.scanStudioConversations(),
      existing_captures: cap.listExistingCaptures()
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/captures', (req, res) => {
  try { res.json(cap.listExistingCaptures()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/patterns', (req, res) => {
  try { res.json(patterns.detectAcrossCaptures()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/scaffold', express.json(), (req, res) => {
  try {
    const r = cap.scaffoldCapture(req.body || {});
    if (!r.ok) return res.status(400).json(r);
    res.json(r);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
