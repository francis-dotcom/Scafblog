import fs from "fs/promises";

export function createAgentRegistry(definitions) {
  return new Map(definitions.map((definition) => [definition.id, definition]));
}

export async function runAgent(runtime, agentId, input) {
  const agent = runtime.registry.get(agentId);

  if (!agent) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  const startedAt = new Date().toISOString();
  runtime.logger.info(`🤖 ${agent.label} started`);

  const output = await agent.run({
    runtime,
    input,
  });

  const completedAt = new Date().toISOString();
  const event = {
    agentId,
    label: agent.label,
    stage: agent.stage,
    startedAt,
    completedAt,
    outputSummary: agent.summarize ? agent.summarize(output) : null,
  };

  runtime.events.push(event);

  if (runtime.trackEvent) {
    await runtime.trackEvent(event);
  }

  runtime.logger.info(`✅ ${agent.label} completed`);
  return output;
}

export async function executeWorkflow(runtime, steps, initialContext) {
  let context = { ...initialContext };

  for (const step of steps) {
    const shouldRun =
      typeof step.when === "function" ? await step.when(context, runtime) : true;

    if (!shouldRun) {
      continue;
    }

    const input =
      typeof step.input === "function" ? await step.input(context, runtime) : context;

    const output = await runAgent(runtime, step.agentId, input);

    if (typeof step.assign === "function") {
      context = await step.assign(context, output, runtime);
    } else {
      context = {
        ...context,
        [step.agentId]: output,
      };
    }
  }

  return context;
}

export async function ensureJsonFile(filepath, initialValue) {
  try {
    await fs.access(filepath);
  } catch {
    await fs.writeFile(filepath, `${JSON.stringify(initialValue, null, 2)}\n`, "utf8");
  }
}
