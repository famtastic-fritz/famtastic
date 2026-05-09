// Lane C — Component routes
// Read-only Express surface that exposes the component inventory and the
// surgical insertion contract to the Operator Workspace.
//
// Mount line for orchestrator (Lane A applies, NOT this file):
//   app.use('/api/components', require('./server/component-routes').createComponentRouter());

'use strict';

const express = require('express');
const inventory = require('./component-inventory');

function createComponentRouter() {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json({ components: inventory.listInventory() });
  });

  router.get('/check', (req, res) => {
    const id = typeof req.query.id === 'string' ? req.query.id : '';
    const result = inventory.checkExisting({ id });
    res.json(result);
  });

  router.get('/contract', (req, res) => {
    res.json({ contract: inventory.SURGICAL_INSERTION_CONTRACT });
  });

  return router;
}

module.exports = { createComponentRouter };
