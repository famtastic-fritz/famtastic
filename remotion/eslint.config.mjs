import { config } from "@remotion/eslint-config-flat";

// The Remotion config targets browser/React code under src/. The faceless
// pipeline (*.mjs) is Node code — it uses process/console/fetch/Buffer.
// Give those files the Node globals so lint reflects where they actually run.
export default [
  ...config,
  {
    files: ["src/pipeline/**/*.mjs", "bin/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        fetch: "readonly",
        Buffer: "readonly",
      },
    },
  },
];
