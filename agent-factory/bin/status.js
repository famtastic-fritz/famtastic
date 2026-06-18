#!/usr/bin/env node
// Terminal status readout + (re)write dashboard.html.
import { loadEnv } from '../src/util.js';
import dashboard from '../src/dashboard.js';

loadEnv();
const path = dashboard.writeHtml();
console.log(dashboard.terminal());
console.log(`\nDashboard written to ${path}`);
