import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const serverSource = fs.readFileSync(path.join(import.meta.dirname, '../server.js'), 'utf8');

describe('Site Studio quality-flow prompt integration', () => {
  it('loads the shared site-quality-flow module', () => {
    expect(serverSource).toContain("require('../lib/famtastic/site-quality-flow')");
  });

  it('injects SITE QUALITY FLOW context into briefContext before prompt return', () => {
    expect(serverSource).toContain('buildSiteQualityFlowContext');
    expect(serverSource).toContain('briefContext += `\\n\\n${siteQualityFlow.promptBlock}`');
  });
});
