import asyncio
import json
import os
import sys
from claude_agent_sdk import ClaudeAgentOptions, ResultMessage, query

def build_options(model: str) -> ClaudeAgentOptions:
    return ClaudeAgentOptions(model=model, tools=[], setting_sources=[], permission_mode="default", max_turns=3, extra_args={"no-session-persistence": None})

async def run_app(prompt: str, model: str) -> None:
    result_seen = False
    async for message in query(prompt=prompt, options=build_options(model)):
        if isinstance(message, ResultMessage):
            result_seen = True
            if message.is_error or message.subtype != "success":
                raise RuntimeError("SDK run did not succeed")
            print(message.result or "")
    if not result_seen:
        raise RuntimeError("No terminal result")

if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--check":
        build_options("offline-fixture-model")
        print(json.dumps({"sdk": "claude", "constructed": True, "liveApiCalled": False}))
    else:
        model = os.environ.get("CLAUDE_MODEL", "").strip()
        if not model or not os.environ.get("ANTHROPIC_API_KEY", "").strip() or len(sys.argv) != 2 or not sys.argv[1].strip():
            sys.exit("Set ANTHROPIC_API_KEY, CLAUDE_MODEL and supply one prompt.")
        try:
            asyncio.run(asyncio.wait_for(run_app(sys.argv[1], model), timeout=90))
        except (Exception, KeyboardInterrupt):
            sys.exit("SDK run failed or was cancelled. Inspect redacted diagnostics in your application.")
