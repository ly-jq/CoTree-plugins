"""CoTree's local review entrypoint; no source-host state or model loop."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
from urllib.parse import quote
from review_renderer import build_review_html


def digest(file: Path) -> str:
    return hashlib.sha256(file.read_bytes()).hexdigest()


def validate_board(data: dict, root: Path) -> list[dict]:
    if data.get("schemaVersion") != 1 or not isinstance(data.get("boardId"), str) or not data["boardId"].strip():
        raise ValueError("schemaVersion 1 and explicit boardId required")
    if type(data.get("revision")) is not int or data["revision"] < 1:
        raise ValueError("revision must be a positive integer")
    items = data.get("items")
    if not isinstance(items, list) or not 1 <= len(items) <= 100:
        raise ValueError("items must contain 1 to 100 entries")
    ids, result = set(), []
    for item in items:
        identity, title, source = item.get("id"), item.get("title"), item.get("src")
        if not isinstance(identity, str) or not identity or identity in ids:
            raise ValueError("Each item needs a unique stable id")
        ids.add(identity)
        if not isinstance(title, str) or not title.strip() or len(title) > 500:
            raise ValueError("Item title is required and limited to 500 characters")
        row = {"id": identity, "title": title, "prompt": str(item.get("prompt", ""))[:20000]}
        if source is not None:
            if not isinstance(source, str) or Path(source).is_absolute() or ":" in source:
                raise ValueError("src must be a relative local image path")
            raw = root / source
            if any(p.is_symlink() for p in [raw, *raw.parents]):
                raise ValueError("Image path must not contain symlinks")
            file = raw.resolve()
            if not file.is_relative_to(root) or not file.is_file() or file.stat().st_size > 32 * 1024 * 1024:
                raise ValueError("Image must exist inside the board directory and be at most 32 MiB")
            signature = file.read_bytes()[:12]
            if not (signature.startswith(b"\x89PNG\r\n\x1a\n") or signature.startswith(b"\xff\xd8\xff") or (signature[:4] == b"RIFF" and signature[8:12] == b"WEBP")):
                raise ValueError("Only actual PNG, JPEG and WebP images are supported")
            row["src"] = row["href"] = quote(file.relative_to(root).as_posix())
        elif not row["prompt"].strip():
            raise ValueError("A pending item needs a prompt and cannot claim an image exists")
        result.append(row)
    # The upstream renderer chooses image cards OR prompt cards. Mixing would hide pending items.
    if any("src" in r for r in result) and not all("src" in r for r in result):
        raise ValueError("Render completed images and pending prompt items as separate review pages")
    return result


def render_board(manifest: Path, directory: Path, expected_sha: str | None = None) -> dict:
    root = directory.resolve(strict=True)
    if any(p.is_symlink() for p in [directory, *directory.parents]):
        raise ValueError("Board directory cannot be a symlink")
    if manifest.stat().st_size > 1024 * 1024:
        raise ValueError("Manifest exceeds 1 MiB")
    data = json.loads(manifest.read_text(encoding="utf-8"))
    items = validate_board(data, root)
    target = root / "review-board.html"
    lock = root / ".cotree-review.lock"
    with lock.open("x", encoding="utf-8") as guard:
        try:
            if target.is_symlink():
                raise ValueError("Review file cannot be a symlink")
            previous = digest(target) if target.exists() else None
            if previous != expected_sha:
                raise ValueError("Expected previous SHA-256 does not match the existing review")
            backup = None
            if previous:
                backup = root / f"review-board.{previous}.bak"
                if not backup.exists():
                    with backup.open("xb") as stream:
                        stream.write(target.read_bytes())
            temporary = root / ".cotree-review.next.html"
            if temporary.exists():
                raise ValueError("Unfinished review output exists; inspect it before retrying")
            build_review_html(root, items, {"preset": data.get("preset", "image-wall"), "title": str(data.get("title", "Creative review")), "showControls": True, "showCaptions": True, "minTileWidth": 220, "output": temporary.name})
            os.replace(temporary, target)
            return {"boardId": data["boardId"], "revision": data["revision"], "output": str(target), "sha256": digest(target), "previousSha256": previous, "backup": str(backup) if backup else None, "items": len(items), "generatedImages": False}
        finally:
            guard.close()
            lock.unlink()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    parser.add_argument("directory", type=Path)
    parser.add_argument("--expected-sha")
    args = parser.parse_args()
    print(json.dumps(render_board(args.manifest, args.directory, args.expected_sha), ensure_ascii=False))


if __name__ == "__main__":
    main()
