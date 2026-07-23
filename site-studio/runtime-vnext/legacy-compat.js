'use strict';
/**
 * Legacy compatibility shim.
 *
 * Maps legacy server.js build-request shapes (pre-vnext) to the canonical
 * BuildRequest contract. Called by the opt-in branch in server.js when
 * FAMTASTIC_USE_RUNTIME_VNEXT=1 but the caller is still sending the old shape.
 *
 * This file has a deliberate short lifespan — it is removed once
 * all callers are migrated to the canonical BuildRequest schema.
 */

function normalizeLegacyRequest(legacy) {
  if (!legacy || typeof legacy !== 'object') {
    throw new Error('legacy-compat: input must be an object');
  }

  // Already canonical if it has a site_tag at the top level
  if (legacy.site_tag && legacy.business) return legacy;

  // Legacy shape had flat keys: siteName, siteTag, industry, description, etc.
  const biz = {
    name: legacy.siteName || legacy.business_name || legacy.name || '',
    industry: legacy.industry || legacy.business_type || '',
    description: legacy.description || legacy.siteDescription || '',
    location: legacy.location || legacy.city || '',
    public_contact: legacy.phone || legacy.email || legacy.contact || '',
    tagline: legacy.tagline || legacy.subtitle || '',
  };

  const brand = {
    mood: legacy.mood || legacy.brand_mood || 'professional',
    color_hint: legacy.primaryColor || legacy.color || null,
    typography: legacy.font || legacy.typography || null,
  };

  const contentInputs = {
    services: (legacy.services || []).map(s =>
      typeof s === 'string' ? { name: s, description: '' } : s
    ),
    testimonials: legacy.testimonials || [],
    team_members: legacy.team || [],
    about_text: legacy.about || legacy.about_text || '',
  };

  const positioning = {
    target_audience: legacy.audience || legacy.targetAudience || '',
    desired_outcome: legacy.outcome || legacy.cta || '',
    differentiators: legacy.differentiators || [],
  };

  const deploy = {
    staging_deploy: legacy.staging_deploy || false,
    prod_deploy: false, // never auto-prod from legacy shape
    netlify_site_id: legacy.netlify_site_id || null,
    custom_domains: legacy.custom_domains || [],
  };

  const legacyPages = Array.isArray(legacy.pages) ? legacy.pages : [];
  const siteType = legacyPages.length > 1 ? 'multi-page' : 'single-page';
  const architecturePreference = legacy.architecture_preference
    || (siteType === 'multi-page' ? 'multi-page' : 'single-page');
  const requiredPages = legacyPages
    .map((page) => {
      if (typeof page === 'string') {
        const normalized = page.replace(/\.html$/i, '').trim();
        if (!normalized || normalized === 'index' || normalized === 'home') return null;
        return normalized;
      }
      if (page && typeof page === 'object') {
        const candidate = page.page_id || page.name || page.title || page.route || '';
        const normalized = String(candidate)
          .replace(/^\//, '')
          .replace(/\.html$/i, '')
          .replace(/\/$/, '')
          .trim();
        if (!normalized || normalized === 'index' || normalized === 'home') return null;
        return page;
      }
      return null;
    })
    .filter(Boolean);

  return {
    site_tag: legacy.siteTag || legacy.site_tag || 'site',
    site_type: siteType,
    architecture_preference: architecturePreference,
    architecture_constraints: {
      required_pages: requiredPages,
      rejected_patterns: legacy.rejected_patterns || [],
    },
    business: biz,
    brand,
    content_inputs: contentInputs,
    positioning,
    deploy,
    assets_available: legacy.assets_available || {},
    custom_pages: legacyPages,
    rejected_patterns: legacy.rejected_patterns || [],
  };
}

module.exports = { normalizeLegacyRequest };
