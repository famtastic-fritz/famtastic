// Generic handler for lightweight task types (triage, classify, summarize, report).
// These are the cheap, high-throughput tasks the router keeps on tier-1.
import { writeArtifact } from './_lib.js';

export async function run(task, { llm }) {
  const think = await llm.complete({
    system: `You are a fast ${task.type} agent.`,
    prompt: JSON.stringify(task.payload).slice(0, 2000),
    model: task._model.id,
  });
  let artifacts = [];
  if (task.type === 'report' || task.payload.persist) {
    artifacts.push(writeArtifact(
      `docs/ncs7/generic-${task.type}-${task.id}.md`,
      `# ${task.type}\n\nTask ${task.id}\n\n${think.text}\n`));
  }
  return {
    summary: `${task.type} handled (${think.mode})`,
    artifacts,
    usage: think.usage,
    metrics: {},
  };
}
