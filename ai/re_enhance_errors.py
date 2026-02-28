# ai/re_enhance_errors.py
#!/usr/bin/env python3
"""
Re-run ai/enhance.py for records whose AI block is still entirely "ERROR".
Usage example (single file):
  uv run python re_enhance_errors.py \
      --data data/2025-11-05_AI_enhanced_Chinese.jsonl

Usage example (batch/glob):
  uv run python re_enhance_errors.py \
      --glob "data/*_AI_enhanced_Chinese.jsonl"

This will modify the specified JSONL file(s) in place.
"""
import argparse
import json
import os
import shlex
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List

import dotenv
dotenv.load_dotenv(Path(__file__).parent / ".env")

AI_FIELDS = [
    "title_translation",
    "tldr",
    "motivation",
    "method",
    "result",
    "conclusion",
    "translation",
    "summary",
    "keywords",
    "comments",
]


def needs_refresh(entry: Dict) -> bool:
    ai = entry.get("AI")
    if not isinstance(ai, dict):
        return False
    return all(ai.get(field) == "ERROR" for field in AI_FIELDS)


def run_batch_enhance(
    papers: List[Dict],
    language: str,
    runner: str,
    api_keys: str,
    model_priority: str,
    skip_probe: bool = False,
) -> Dict[str, Dict]:
    if not papers:
        return {}

    # 临时目录放在项目根目录下，与 data/ 同盘，避免跨盘复制
    project_root = Path(__file__).parent.parent
    tmp_base = project_root / ".tmp_enhance"
    tmp_base.mkdir(exist_ok=True)

    with tempfile.TemporaryDirectory(dir=tmp_base) as tmpdir:
        tmp_in = Path(tmpdir) / "batch.jsonl"
        with tmp_in.open("w", encoding="utf-8") as fh:
            for paper in papers:
                fh.write(json.dumps(paper, ensure_ascii=False) + "\n")

        tmp_out = tmp_in.with_name(f"{tmp_in.stem}_AI_enhanced_{language}{tmp_in.suffix}")

        env = os.environ.copy()
        if api_keys:
            env["GOOGLE_API_KEYS"] = api_keys
        if model_priority:
            env["MODEL_PRIORITY_LIST"] = model_priority

        cmd = shlex.split(runner) + [
            "ai/enhance.py",
            "--data",
            str(tmp_in),
            "--language",
            language,
        ]
        if skip_probe:
            cmd.append("--probe")
        proc = subprocess.Popen(
            cmd,
            env=env,
        )
        try:
            proc.wait(timeout=86400)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
            raise RuntimeError("enhance.py timed out after 24 hours.")
        except KeyboardInterrupt:
            proc.kill()
            proc.wait()
            raise
        if proc.returncode != 0:
            raise RuntimeError(f"enhance.py exited with code {proc.returncode}.")

        if not tmp_out.exists():
            raise FileNotFoundError(f"Expected enhanced file at {tmp_out}")

        results: Dict[str, Dict] = {}
        with tmp_out.open("r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                paper = json.loads(line)
                results[paper["id"]] = paper
        return results


def process_single_file(data_path: Path, args, api_keys: str, model_priority: str) -> None:
    if not data_path.exists():
        raise FileNotFoundError(data_path)

    entries: List[Dict] = []
    with data_path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                entries.append(json.loads(line))

    error_indices = [idx for idx, paper in enumerate(entries) if needs_refresh(paper)]
    if not error_indices:
        print("No AI blocks require refresh; nothing to do.")
        return

    batch = [entries[idx] for idx in error_indices]
    print(f"Re-enhancing {len(batch)} record(s) via ai/enhance.py...")

    refreshed = run_batch_enhance(
        papers=batch,
        language=args.language,
        runner=args.runner,
        api_keys=api_keys,
        model_priority=model_priority,
        skip_probe=args.probe,
    )

    updated = 0
    for idx in error_indices:
        paper_id = entries[idx]["id"]
        if paper_id in refreshed and "AI" in refreshed[paper_id]:
            entries[idx]["AI"] = refreshed[paper_id]["AI"]
            updated += 1
    if not updated:
        print("Enhanced call completed, but no records were updated.")
        return

    tmp_path = data_path.with_suffix(data_path.suffix + ".tmp")
    with tmp_path.open("w", encoding="utf-8") as fh:
        for paper in entries:
            fh.write(json.dumps(paper, ensure_ascii=False) + "\n")
    tmp_path.replace(data_path)

    print(f"Done. Updated {updated} record(s) in {data_path}.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Re-enhance ERROR AI entries in JSONL file(s).")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--data", help="Path to a single enhanced JSONL file.")
    group.add_argument(
        "--glob",
        help="Glob pattern for batch processing (e.g. 'data/*_AI_enhanced_Chinese.jsonl'). Processes newest files first.",
    )
    parser.add_argument(
        "--language",
        default="Chinese",
        help="Language parameter passed to enhance.py (default: Chinese).",
    )
    parser.add_argument(
        "--api-keys",
        help="Comma-separated GOOGLE_API_KEYS passed to enhance.py. Defaults to env var if omitted.",
    )
    parser.add_argument(
        "--model-priority",
        help="Comma-separated MODEL_PRIORITY_LIST passed to enhance.py. Defaults to env var if omitted.",
    )
    parser.add_argument(
        "--runner",
        default="uv run",
        help="Command used to execute enhance.py (default: 'uv run').",
    )
    parser.add_argument(
        "--probe",
        action="store_true",
        help="Pass --probe to enhance.py to enable connectivity check (recommended in CI/CD).",
    )
    args = parser.parse_args()

    api_keys = (args.api_keys or os.getenv("GOOGLE_API_KEYS", "")).strip()
    model_priority = (args.model_priority or os.getenv("MODEL_PRIORITY_LIST", "")).strip()

    # Require at least one of Google or OpenAI keys to be configured
    oai_keys = os.getenv("OPENAI_API_KEYS", "").strip()
    if not api_keys and not oai_keys:
        raise ValueError(
            "No API keys configured: set GOOGLE_API_KEYS or OPENAI_API_KEYS "
            "(or pass --api-keys for Google)."
        )

    if args.glob:
        import glob as globmodule
        files = sorted(globmodule.glob(args.glob), reverse=True)  # newest first
        if not files:
            print(f"No files matched glob pattern: {args.glob}")
            return
        print(f"Found {len(files)} file(s) to process.")
        for fp in files:
            print(f"\n=== Processing: {fp} ===")
            try:
                process_single_file(Path(fp), args, api_keys, model_priority)
            except Exception as e:
                print(f"[Error] {fp}: {e}, skipping.")
    else:
        process_single_file(Path(args.data), args, api_keys, model_priority)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[Info] Interrupted by user.")
