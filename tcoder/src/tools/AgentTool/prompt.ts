export const AGENT_PROMPT = `# Sub-Agent Guidelines
- Use sub-agents for complex, multi-step tasks that benefit from focused attention
- Available agent types: explore (code search), executor (implementation), architect (design), planner (planning), reviewer (code review), general (any task)
- Each agent runs in its own context with access to tools
- Agents can be spawned in parallel when tasks are independent
- Use maxTurns to limit agent iteration count
- Provide clear, specific task descriptions for best results
- Agents return their results when complete
- Do not use agents for trivial single-step operations`;
