'use strict';
/**
 * runtime-vnext/lib/model-runner-registry.js — ModelRunner registry.
 *
 * ModelRunner is the collective name for execution-family runners.
 * Each family has provider-specific adapters registered under it.
 */

class ModelRunnerRegistry {
  constructor() {
    this._families = new Map();
  }

  register(familyName, providerName, adapter) {
    if (!this._families.has(familyName)) {
      this._families.set(familyName, new Map());
    }
    this._families.get(familyName).set(providerName, adapter);
  }

  get(familyName, providerName = null) {
    const family = this._families.get(familyName);
    if (!family) {
      throw new Error(`Unknown execution family: ${familyName}`);
    }
    if (providerName) {
      const adapter = family.get(providerName);
      if (!adapter) {
        throw new Error(`No adapter registered for ${familyName} / ${providerName}`);
      }
      return adapter;
    }
    // Return default provider (first registered) if no provider specified
    if (family.size === 0) {
      throw new Error(`No adapters registered for family: ${familyName}`);
    }
    return family.values().next().value;
  }

  hasFamily(familyName) {
    return this._families.has(familyName);
  }

  listFamilies() {
    return Array.from(this._families.keys());
  }
}

const globalRegistry = new ModelRunnerRegistry();

module.exports = {
  ModelRunnerRegistry,
  registry: globalRegistry,
};
