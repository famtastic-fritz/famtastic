'use strict';

function createSpecStore({
  fs,
  path,
  getTag,
  getSiteDir,
  getSpecFile,
  normalizeTierAndMode,
  normalizeRequiredFields,
}) {
  let specCache = null;
  let specCacheTag = null;
  let specRevision = 0;

  function readSpec() {
    const tag = getTag();
    const specFile = getSpecFile();

    if (specCache && specCacheTag === tag) return specCache;
    if (fs.existsSync(specFile)) {
      try {
        specCache = JSON.parse(fs.readFileSync(specFile, 'utf8'));
        specCacheTag = tag;
        specRevision = specCache._revision || 0;
        if (specCache && typeof specCache === 'object') {
          if (!specCache.tag) console.warn(`[spec] ${tag}: missing 'tag' field`);
          if (!specCache.site_name) console.warn(`[spec] ${tag}: missing 'site_name' field`);
          if (specCache.media_specs && !Array.isArray(specCache.media_specs)) {
            console.warn(`[spec] ${tag}: media_specs is not an array, resetting`);
            specCache.media_specs = [];
          }
          if (Array.isArray(specCache.media_specs)) {
            let migrated = false;
            specCache.media_specs = specCache.media_specs.map((s) => {
              if (s.slot_id && s.role && s.status !== 'missing') return s;
              migrated = true;
              const slotId = s.slot_id || s.slot || 'unknown';
              const status = s.status === 'missing' ? 'empty' : (s.status || 'empty');
              const role = s.role || (slotId.match(/hero/i) ? 'hero'
                : slotId.match(/logo/i) ? 'logo'
                : slotId.match(/gallery/i) ? 'gallery'
                : slotId.match(/team/i) ? 'team'
                : slotId.match(/service/i) ? 'service'
                : slotId.match(/testimonial/i) ? 'testimonial'
                : slotId.match(/favicon/i) ? 'favicon'
                : 'gallery');
              return { ...s, slot_id: slotId, status, role, page: s.page || 'index.html' };
            });
            if (migrated) {
              console.log(`[spec] ${tag}: migrated old-format media_specs to slot-based format`);
              writeSpec(specCache);
            }
          }
          if (specCache.design_decisions && !Array.isArray(specCache.design_decisions)) {
            console.warn(`[spec] ${tag}: design_decisions is not an array, resetting`);
            specCache.design_decisions = [];
          }
          if (specCache.deployed_url && !specCache.environments) {
            specCache.environments = {
              staging: {
                provider: specCache.deploy_provider || 'netlify',
                site_id: specCache.netlify_site_id || null,
                url: specCache.deployed_url,
                deployed_at: specCache.deployed_at || null,
                state: 'deployed',
              },
            };
            console.log(`[spec] ${tag}: migrated flat deploy fields to environments.staging`);
            fs.writeFileSync(specFile, JSON.stringify(specCache, null, 2));
          }
          const { dirty: tierDirty } = normalizeTierAndMode(specCache);
          const { dirty: schemaDirty } = normalizeRequiredFields(specCache);
          if (tierDirty || schemaDirty) {
            console.log(`[spec] ${tag}: spec normalized (tier=${tierDirty}, schema=${schemaDirty}) — writing drift repair`);
            const tierTmp = specFile + '.tmp';
            fs.writeFileSync(tierTmp, JSON.stringify(specCache, null, 2));
            fs.renameSync(tierTmp, specFile);
          }
        }
      } catch (e) {
        console.error(`[spec] Failed to parse ${specFile}: ${e.message}`);
        specCache = {};
        specCacheTag = tag;
      }
    } else {
      specCache = {};
      specCacheTag = tag;
    }
    return specCache;
  }

  function writeSpec(spec, options = {}) {
    const { source = 'unknown', mutationLevel, mutationTarget, oldValue, newValue } = options;
    const tag = getTag();
    const siteDir = getSiteDir();
    const specFile = getSpecFile();

    specRevision += 1;
    spec._revision = specRevision;
    spec._last_modified = new Date().toISOString();

    specCache = spec;
    specCacheTag = tag;
    fs.mkdirSync(siteDir, { recursive: true });
    const specTmp = specFile + '.tmp';
    fs.writeFileSync(specTmp, JSON.stringify(spec, null, 2));
    fs.renameSync(specTmp, specFile);

    if (mutationLevel && mutationTarget) {
      const mutationLog = path.join(siteDir, 'mutations.jsonl');
      const entry = {
        timestamp: new Date().toISOString(),
        level: mutationLevel,
        target_id: mutationTarget,
        action: options.action || 'update',
        old_value: oldValue,
        new_value: newValue,
        source,
        revision: specRevision,
      };
      try { fs.appendFileSync(mutationLog, JSON.stringify(entry) + '\n'); } catch {}
    }
  }

  function invalidateSpecCache() {
    specCache = null;
    specCacheTag = null;
  }

  function readSpecForSite(siteDir) {
    const specPath = path.join(siteDir, 'spec.json');
    if (!fs.existsSync(specPath)) return {};
    try {
      const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
      normalizeTierAndMode(spec);
      return spec;
    } catch {
      return {};
    }
  }

  function writeSpecForSite(siteDir, spec) {
    const specPath = path.join(siteDir, 'spec.json');
    fs.mkdirSync(siteDir, { recursive: true });
    if (!spec._revision && fs.existsSync(specPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(specPath, 'utf8'));
        if (existing._revision) spec._revision = existing._revision;
        if (existing._last_modified) spec._last_modified = existing._last_modified;
      } catch {}
    }
    const tmpPath = specPath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(spec, null, 2));
    fs.renameSync(tmpPath, specPath);
  }

  return {
    readSpec,
    writeSpec,
    invalidateSpecCache,
    readSpecForSite,
    writeSpecForSite,
  };
}

module.exports = { createSpecStore };
