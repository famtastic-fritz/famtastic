// shay-bridge-client.js — shared client-side bridge-result handoff helper.
// Keeps Shay Lite and Shay Desk bridge operation results serializable across turns.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var api = factory();
    root.createShayBridgeClient = api.createShayBridgeClient;
    root.ShayBridgeClient = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function createShayBridgeClient(initialResult, options) {
    var pendingResult = isBridgeResult(initialResult) ? initialResult : null;
    var opts = options || {};
    var surface = typeof opts.surface === 'string' && opts.surface ? opts.surface : null;
    var inFlight = false;
    var queue = [];

    function drainQueue() {
      if (inFlight || queue.length === 0) return;
      var next = queue.shift();
      inFlight = true;
      next();
    }

    function prepareRequestPayload(message, context) {
      var outgoingBridge = pendingResult;
      pendingResult = null;
      var payload = {
        message: message,
        context: context || {},
        bridge_result: outgoingBridge || null,
      };
      if (surface) payload.surface = surface;
      return payload;
    }

    function storeResponseResult(data) {
      if (data && isBridgeResult(data.bridge_result)) {
        pendingResult = data.bridge_result;
      }
      return pendingResult;
    }

    function clearPending() {
      pendingResult = null;
    }

    function getPendingResult() {
      return pendingResult;
    }

    function enqueue(fn) {
      if (typeof fn !== 'function') return;
      queue.push(fn);
      drainQueue();
    }

    function markResponseReceived() {
      inFlight = false;
      drainQueue();
    }

    function isInFlight() {
      return inFlight;
    }

    return {
      surface: surface,
      clearPending: clearPending,
      prepareRequestPayload: prepareRequestPayload,
      storeResponseResult: storeResponseResult,
      getPendingResult: getPendingResult,
      enqueue: enqueue,
      markResponseReceived: markResponseReceived,
      isInFlight: isInFlight,
    };
  }

  function isBridgeResult(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  return { createShayBridgeClient: createShayBridgeClient };
});
