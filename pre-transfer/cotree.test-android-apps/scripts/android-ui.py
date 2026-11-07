"""Select a unique Android UI node from a saved dump; never control a device."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET


def pick_node(file: Path, field: str, value: str) -> dict:
    if field not in {"text", "content-desc", "resource-id"} or not value:
        raise ValueError("Choose a nonempty exact selector.")
    if file.is_symlink() or not file.is_file() or file.stat().st_size > 2 * 1024 * 1024:
        raise ValueError("Use a regular XML dump no larger than 2 MiB.")
    raw = file.read_bytes()
    if len(raw) > 2 * 1024 * 1024:
        raise ValueError("UI dump exceeds the size limit.")
    text = raw.decode("utf-8-sig")
    if "<!DOCTYPE" in text.upper() or "<!ENTITY" in text.upper():
        raise ValueError("DTD / entity declarations are not supported.")
    start, end = text.find("<hierarchy"), text.find("</hierarchy>")
    if start < 0 or end < start:
        raise ValueError("No complete hierarchy in the capture.")
    tree = ET.fromstring(text[start:end + len("</hierarchy>")])
    nodes = [node for node in tree.iter("node") if node.get(field) == value and node.get("password") != "true"]
    if len(nodes) != 1:
        raise ValueError(f"Expected one node; found {len(nodes)}. Refine the selector or capture again.")
    node = nodes[0]
    if node.get("enabled") != "true":
        raise ValueError("Selected node is not enabled.")
    bounds = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", node.get("bounds", ""))
    if bounds is None:
        raise ValueError("Node has no valid bounds.")
    x1, y1, x2, y2 = map(int, bounds.groups())
    if x2 <= x1 or y2 <= y1 or max(x2, y2) > 32768:
        raise ValueError("Node has empty or unsupported bounds.")
    return {"bounds": [x1, y1, x2, y2], "center": [(x1 + x2) // 2, (y1 + y2) // 2],
            "clickable": node.get("clickable") == "true", "sourceSha256": hashlib.sha256(raw).hexdigest(),
            "deviceActionExecuted": False, "freshnessVerified": False}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--field", choices=["text", "content-desc", "resource-id"], required=True)
    parser.add_argument("--value", required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(pick_node(args.input, args.field, args.value), ensure_ascii=False))
        return 0
    except (OSError, ValueError, ET.ParseError):
        print("UI selection failed: require one enabled non-password node in a complete bounded dump.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
