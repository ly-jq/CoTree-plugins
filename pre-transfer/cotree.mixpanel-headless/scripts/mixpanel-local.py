"""Offline introspection and typed draft validation; never creates a Workspace."""
import argparse
import importlib.metadata
import inspect
import json
from pathlib import Path
import sys
from typing import Any

VERSION = "0.4.0"
DRAFT_TYPES = ("Metric", "FunnelStep", "RetentionEvent", "FlowStep", "CreateDashboardParams", "UpdateDashboardParams", "CreateBookmarkParams")


def describe(symbol: str) -> dict[str, Any]:
    import mixpanel_headless as mp
    parts = symbol.split(".")
    if not 1 <= len(parts) <= 2 or any(not p.isidentifier() or p.startswith("_") for p in parts):
        raise ValueError("Use a public type or Workspace.method name.")
    obj = getattr(mp, parts[0], None)
    if len(parts) == 2:
        if parts[0] != "Workspace":
            raise ValueError("Only Workspace methods may be inspected by dotted name.")
        obj = inspect.getattr_static(obj, parts[1], None)
    if not inspect.isclass(obj) and not inspect.isfunction(obj):
        raise ValueError("Public class or method was not found in the pinned library.")
    return {"symbol": symbol, "signature": str(inspect.signature(obj)), "documentation": inspect.getdoc(obj),
            "methods": [name for name, member in inspect.getmembers_static(obj) if not name.startswith("_") and inspect.isfunction(member)] if inspect.isclass(obj) else []}


def validate_draft(symbol: str, document: Any) -> dict[str, Any]:
    import mixpanel_headless as mp
    from pydantic import TypeAdapter
    if symbol not in DRAFT_TYPES or not isinstance(document, dict):
        raise ValueError("Choose a supported draft type and a JSON object.")
    cls = getattr(mp, symbol)
    if set(document) - set(inspect.signature(cls).parameters):
        raise ValueError("Draft contains unsupported fields; inspect the current signature.")
    adapter = TypeAdapter(cls)
    value = adapter.validate_python(document)
    return {"symbol": symbol, "validatedDraft": adapter.dump_python(value, mode="json"), "networkExecuted": False,
            "limitation": "Typed local validation only; events, object access and server-side constraints still need account verification."}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("diagnose", "describe", "validate"))
    parser.add_argument("--symbol")
    parser.add_argument("--input")
    args = parser.parse_args()
    version = importlib.metadata.version("mixpanel-headless")
    if version != VERSION:
        raise ValueError("This helper requires mixpanel-headless 0.4.0; check the API before upgrading.")
    if args.action == "diagnose":
        if args.symbol or args.input:
            raise ValueError("diagnose does not accept symbol or input.")
        result = {"version": version, "python": sys.version.split()[0], "draftTypes": DRAFT_TYPES, "credentialsRead": False, "networkExecuted": False}
    elif args.action == "describe":
        if not args.symbol or args.input:
            raise ValueError("describe requires only --symbol.")
        result = describe(args.symbol)
    else:
        if not args.symbol or not args.input:
            raise ValueError("validate requires --symbol and --input.")
        file = Path(args.input)
        if file.is_symlink() or not file.is_file() or file.stat().st_size > 2 * 1024 * 1024:
            raise ValueError("Expected a regular draft file no larger than 2 MiB.")
        result = validate_draft(args.symbol, json.loads(file.read_text(encoding="utf-8-sig")))
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # Validation exceptions can contain entire submitted values. Do not echo them.
        print(json.dumps({"ok": False, "errorType": type(error).__name__, "message": "Local validation failed; check version, symbol, fields and input file."}), file=sys.stderr)
        sys.exit(1)
