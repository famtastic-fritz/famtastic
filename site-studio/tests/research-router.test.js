import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const router = require('../lib/research-router.js');
const registryModule = require('../lib/research-registry.js');
const { RESEARCH_REGISTRY } = registryModule;

const originalEnv = { ...process.env };
const originalQueries = Object.fromEntries(
  Object.entries(RESEARCH_REGISTRY).map(([key, source]) => [key, source.query])
);
const originalStatuses = Object.fromEntries(
  Object.entries(RESEARCH_REGISTRY).map(([key, source]) => [key, source.status])
);
const originalCosts = Object.fromEntries(
  Object.entries(RESEARCH_REGISTRY).map(([key, source]) => [key, source.costPerQuery])
);

describe('research router', () => {
  beforeEach(() => {
    delete process.env.PINECONE_API_KEY;
    for (const [key, source] of Object.entries(RESEARCH_REGISTRY)) {
      source.query = originalQueries[key];
      source.status = originalStatuses[key];
      source.costPerQuery = originalCosts[key];
    }
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    for (const [key, source] of Object.entries(RESEARCH_REGISTRY)) {
      source.query = originalQueries[key];
      source.status = originalStatuses[key];
      source.costPerQuery = originalCosts[key];
    }
  });

  it('does not reference cache state when skipCache bypasses Pinecone', async () => {
    RESEARCH_REGISTRY.build_patterns.query = async () => ({
      answer: 'fresh internal research answer',
      meta: { source: 'build_patterns', snippetCount: 1 },
    });

    const result = await router.queryResearch('landscaping', 'what works?', { skipCache: true });

    expect(result).toMatchObject({
      answer: 'fresh internal research answer',
      source: 'build_patterns',
      fromCache: false,
      stale: false,
    });
  });

  it('does not reference cache state when forceSource bypasses Pinecone', async () => {
    RESEARCH_REGISTRY.manual.query = async () => ({
      answer: 'manual research answer',
      meta: { source: 'manual', file: 'general.md' },
    });

    const result = await router.queryResearch('salon', 'what should we know?', { forceSource: 'manual' });

    expect(result).toMatchObject({
      answer: 'manual research answer',
      source: 'manual',
      fromCache: false,
      stale: false,
    });
  });

  it('preserves Perplexity citations, search results, usage, and cost metadata', async () => {
    RESEARCH_REGISTRY.perplexity.status = 'active';
    RESEARCH_REGISTRY.perplexity.costPerQuery = 0.002;
    RESEARCH_REGISTRY.perplexity.query = async () => ({
      answer: 'current cited answer',
      meta: {
        source: 'perplexity',
        model: 'sonar',
        citations: ['https://example.com/source-a'],
        search_results: [{ title: 'Source A', url: 'https://example.com/source-a' }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        cost: { total: 0.002, currency: 'USD' },
      },
    });

    const result = await router.queryResearch('ai web design', 'latest trust signals?', {
      forceSource: 'perplexity',
      skipCache: true,
    });

    expect(result).toMatchObject({
      answer: 'current cited answer',
      source: 'perplexity',
      fromCache: false,
      stale: false,
      meta: {
        source: 'perplexity',
        model: 'sonar',
        citations: ['https://example.com/source-a'],
        search_results: [{ title: 'Source A', url: 'https://example.com/source-a' }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        cost: { total: 0.002, currency: 'USD' },
      },
    });
  });
});
