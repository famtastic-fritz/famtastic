/**
 * gemini-generate.mjs — Called by scripts/gemini-cli
 * Reads prompt from stdin, calls Gemini generateContent, prints response to stdout.
 *
 * Usage: node scripts/lib/gemini-generate.mjs <model> <node_modules_path>
 */
import { readFileSync } from 'fs';
import { createInterface } from 'readline';

const [,, model, nodePath] = process.argv;

if (!model || !nodePath) {
  process.stderr.write('Usage: gemini-generate.mjs <model> <node_modules_path>\n');
  process.exit(1);
}

// Read prompt from stdin
let prompt = '';
const rl = createInterface({ input: process.stdin });
for await (const line of rl) {
  prompt += line + '\n';
}
prompt = prompt.trim() || 'say ok';

// Dynamically import the SDK from the provided node_modules path
const { GoogleGenerativeAI } = await import(nodePath + '/@google/generative-ai/dist/index.mjs');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const m = genAI.getGenerativeModel({ model });
const result = await m.generateContent(prompt);
const text = result.response?.text?.() ||
  result.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
  '';
process.stdout.write(text.trim() + '\n');
