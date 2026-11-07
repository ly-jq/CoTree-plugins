import asyncio
import json
import os
import sys
from agents import Agent, Runner, set_tracing_disabled

set_tracing_disabled(True)

def build_options(model: str) -> Agent:
    return Agent(name="Assistant", model=model, instructions="Answer clearly. State uncertainty and do not claim unperformed actions.", tools=[])

async def run_app(prompt: str, model: str) -> None:
    result = await Runner.run(build_options(model), prompt, max_turns=3)
    if result.final_output is None:
        raise RuntimeError("No output")
    print(result.final_output)

if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--check":
        build_options("offline-fixture-model")
        print(json.dumps({"sdk": "openai", "constructed": True, "liveApiCalled": False}))
    else:
        model = os.environ.get("OPENAI_MODEL", "").strip()
        if not model or not os.environ.get("OPENAI_API_KEY", "").strip() or len(sys.argv) != 2 or not sys.argv[1].strip():
            sys.exit("Set OPENAI_API_KEY, OPENAI_MODEL and supply one prompt.")
        try:
            asyncio.run(asyncio.wait_for(run_app(sys.argv[1], model), timeout=90))
        except (Exception, KeyboardInterrupt):
            sys.exit("SDK run failed or was cancelled. Inspect redacted diagnostics in your application.")
