"""Run preserved local analytical helpers from a fresh user-designated directory."""
from __future__ import annotations
import argparse
import json
import math
import os
from pathlib import Path
import subprocess
import sys

SOURCE_ROOT = Path(__file__).resolve().parents[1] / "resources/source-01/content"
TOOLS = {
    "normalize": "skills/financials-normalizer/scripts/normalize_extracted_financials.py",
    "dcf": "skills/dcf-model-builder/scripts/build_banker_formula_workbook.py",
    "three-statement": "skills/three-statement-model-builder/scripts/build_banker_formula_workbook.py",
    "event": "skills/event-driven-analyzer/scripts/event_math.py",
}


def finite_data(value: object) -> None:
    if isinstance(value, float) and not math.isfinite(value):
        raise ValueError("Input contains a non-finite number")
    if isinstance(value, dict):
        for item in value.values():
            finite_data(item)
    elif isinstance(value, list):
        for item in value:
            finite_data(item)


def prepare(action: str, input_file: Path, output_dir: Path, mode: str | None = None) -> list[str]:
    if action not in TOOLS:
        raise ValueError("Unsupported analytical tool")
    if not input_file.is_absolute() or not input_file.is_file() or input_file.stat().st_size > 8 * 1024 * 1024:
        raise ValueError("Input must be an explicit JSON file of at most 8 MiB")
    if not output_dir.is_absolute() or output_dir.exists() or not output_dir.parent.is_dir():
        raise ValueError("Output must be a new absolute directory with an existing parent")
    if any(p.is_symlink() for p in [input_file, *input_file.parents, output_dir.parent, *output_dir.parent.parents]):
        raise ValueError("Input/output paths cannot use symlinks")
    data = json.loads(input_file.read_text(encoding="utf-8"))
    finite_data(data)
    if action == "normalize":
        if not isinstance(data, list) or not data:
            raise ValueError("Normalization requires nonempty extracted rows")
        for index, row in enumerate(data):
            if not isinstance(row, dict):
                raise ValueError(f"Row {index + 1} must be an object")
            for key in ["entity", "source_id", "period_end", "currency", "units", "source_location", "evidence_label", "freshness_status"]:
                if not isinstance(row.get(key), str) or not row[key].strip():
                    raise ValueError(f"Row {index + 1} lacks explicit {key}; supply the source evidence before normalization")
            if not str(row.get("line_item_original") or row.get("line_item") or "").strip():
                raise ValueError(f"Row {index + 1} lacks a source line label")
    if action in {"dcf", "three-statement"}:
        if not isinstance(data, dict) or not data.get("source_basis"):
            raise ValueError("Financial model requires explicit source_basis")
        # Native UI cannot certify the source template's heuristic readiness classifier.
        # Require a disclosed analytical purpose and preserve sources/limitations in the generated files.
        if not data.get("meta"):
            raise ValueError("Financial model requires explicit metadata")
    if action == "event":
        if mode not in {"cash_merger", "stock_deal", "scenario_ev", "cvr"}:
            raise ValueError("Event calculation needs a documented explicit mode")
        if not isinstance(data, dict):
            raise ValueError("Event input must be an object")
        if mode in {"scenario_ev", "cvr"}:
            field = "scenarios" if mode == "scenario_ev" else "milestones"
            rows = data.get(field)
            if not isinstance(rows, list) or not rows or any(not isinstance(row, dict) or not isinstance(row.get("name"), str) or not row["name"].strip() for row in rows):
                raise ValueError(f"Every {field} row requires an explicit name")
        def reject_numeric_strings(value: object) -> None:
            if isinstance(value, str) and value.strip().lower() in {"nan", "inf", "infinity", "-inf", "+inf"}:
                raise ValueError("Event input contains a non-finite numeric string")
            if isinstance(value, dict):
                for item in value.values():
                    reject_numeric_strings(item)
            elif isinstance(value, list):
                for item in value:
                    reject_numeric_strings(item)
        reject_numeric_strings(data)
    source = (SOURCE_ROOT / TOOLS[action]).resolve(strict=True)
    if not source.is_relative_to(SOURCE_ROOT.resolve()) or source.is_symlink():
        raise ValueError("Analytical entrypoint escaped package resources")
    if action == "event":
        return [sys.executable, "-B", str(source), "--mode", mode, "--input", str(input_file)]
    return [sys.executable, "-B", str(source), str(input_file), "--output-dir", str(output_dir)]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=sorted(TOOLS))
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--mode")
    parser.add_argument("--plan", action="store_true")
    args = parser.parse_args()
    command = prepare(args.action, args.input, args.output, args.mode)
    if args.plan:
        print(json.dumps({"command": command, "externalRequests": 0, "executionPerformed": False}))
        return 0
    args.output.mkdir()
    if args.action == "normalize":
        # The preserved extractor expects text like CSV cells; numeric zero must
        # not fall through its legacy truthiness-based alternate field lookup.
        rows = json.loads(args.input.read_text(encoding="utf-8"))
        for row in rows:
            for key in ("source_value", "value", "amount"):
                if isinstance(row.get(key), (int, float)) and not isinstance(row[key], bool):
                    row[key] = str(row[key])
        prepared_input = args.output / "cotree-normalization-input.json"
        prepared_input.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
        command[command.index(str(args.input))] = str(prepared_input)
    completed = subprocess.run(command, cwd=args.output, env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1", "PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1"}, capture_output=True, text=True, encoding="utf-8", timeout=120, check=False)
    (args.output / "helper.stdout.txt").write_text(completed.stdout, encoding="utf-8")
    (args.output / "helper.stderr.txt").write_text(completed.stderr, encoding="utf-8")
    report = {"action": args.action, "exitCode": completed.returncode, "output": str(args.output), "marketDataFetched": False, "formulasRecalculated": False, "semanticCompletion": "Main model must review sources, numerical results and limitations. Template model_status fields are technical heuristics, not investment or publication approval."}
    (args.output / "cotree-execution.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report))
    return completed.returncode


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, subprocess.TimeoutExpired) as error:
        print(f"Equity helper could not complete: {error}", file=sys.stderr)
        raise SystemExit(1)
