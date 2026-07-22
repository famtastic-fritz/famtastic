'use strict';
/**
 * runtime-vnext/lib/event-bus.js — internal runtime event bus.
 *
 * WebSocket consumers subscribe to it; the runtime does not own ws objects.
 */

class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(eventType, handler) {
    if (!this._listeners.has(eventType)) {
      this._listeners.set(eventType, new Set());
    }
    this._listeners.get(eventType).add(handler);
    return () => this.off(eventType, handler);
  }

  off(eventType, handler) {
    const set = this._listeners.get(eventType);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this._listeners.delete(eventType);
      }
    }
  }

  emit(eventType, payload) {
    const eventPayload = { type: eventType, ...payload };
    const specific = this._listeners.get(eventType);
    if (specific) {
      for (const handler of specific) {
        try {
          handler(eventPayload);
        } catch (err) {
          // Swallow listener errors to protect runtime integrity
          // eslint-disable-next-line no-console
          console.error(`EventBus listener error for ${eventType}:`, err.message);
        }
      }
    }
    const wildcard = this._listeners.get('*');
    if (wildcard) {
      for (const handler of wildcard) {
        try {
          handler(eventPayload);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`EventBus wildcard listener error for ${eventType}:`, err.message);
        }
      }
    }
  }

  once(eventType, handler) {
    const wrapped = (payload) => {
      this.off(eventType, wrapped);
      handler(payload);
    };
    this.on(eventType, wrapped);
  }
}

module.exports = { EventBus };
