// transcriber.js — voice -> text interface.
//
// transcribe() is the clean seam. By default there is NO speech provider, so
// it returns a graceful "unavailable" result and the UI falls back to typing.
// Set TRANSCRIBER_PROVIDER + TRANSCRIBER_API_KEY in .env to enable a real one.

export async function transcribe(_audioBuffer) {
  const provider = process.env.TRANSCRIBER_PROVIDER;
  if (provider && process.env.TRANSCRIBER_API_KEY) {
    return transcribeWithProvider(_audioBuffer, provider);
  }
  return {
    ok: false,
    reason: "no_provider",
    text: "",
    message:
      "Voice transcription isn't configured yet. Your recording is kept in the browser — type what you remember, or add a TRANSCRIBER provider in .env (see SETUP.md).",
  };
}

// STUB: real speech-to-text path. Wire your provider here later.
async function transcribeWithProvider(_audioBuffer, provider) {
  // Example:
  //   const res = await fetch(endpoint(provider), { method: "POST",
  //     headers: { authorization: `Bearer ${process.env.TRANSCRIBER_API_KEY}` },
  //     body: _audioBuffer });
  //   const json = await res.json();
  //   return { ok: true, text: json.text };
  return {
    ok: false,
    reason: "stub",
    text: "",
    message: `Provider "${provider}" is configured but its transcription call is not implemented in this sandbox build (see SETUP.md).`,
  };
}
