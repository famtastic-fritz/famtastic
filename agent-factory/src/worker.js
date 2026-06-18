// Worker agent (spawned as a child process by the orchestrator). Lifecycle:
// take ONE task -> execute its skill -> report {result, cost, latency} on stdout
// -> exit. Workers only READ the queue DB; the orchestrator owns DB writes to
// avoid SQLite write contention across concurrent children.
//
// Usage: node src/worker.js --task <id> --model <modelId> --tier <n> --agent <name>
import queue from './queue.js';
import { getSkill } from './skills/index.js';
import { loadModels } from './util.js';
import router from './router.js';
import llm from './llm.js';

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : def;
}

async function main() {
  const taskId = arg('--task');
  const modelId = arg('--model');
  const tier = Number(arg('--tier', '1'));
  const agent = arg('--agent', 'worker');

  const task = queue.getTask(taskId);
  if (!task) { console.log(JSON.stringify({ ok: false, error: 'task not found' })); process.exit(1); }

  const model = loadModels().find(m => m.id === modelId) || { id: modelId, tier, input_per_m: 0, output_per_m: 0 };
  task._model = model;

  const t0 = Date.now();
  try {
    const skill = getSkill(task.type);
    const out = await skill(task, { llm });
    const latency_ms = Date.now() - t0;
    const usage = out.usage || { input_tokens: 20, output_tokens: 20 };
    const cost_usd = router.charge({ task, model, usage, latency_ms, mode: llm.isLive() ? 'live' : 'stub' });
    console.log(JSON.stringify({
      ok: true, agent, task_id: taskId, type: task.type,
      model: model.id, tier: model.tier, cost_usd, latency_ms,
      summary: out.summary, artifacts: out.artifacts || [], metrics: out.metrics || {},
    }));
    process.exit(0);
  } catch (err) {
    console.log(JSON.stringify({
      ok: false, agent, task_id: taskId, type: task.type,
      model: model.id, tier, latency_ms: Date.now() - t0, error: String(err && err.stack || err),
    }));
    process.exit(2);
  }
}

main();
