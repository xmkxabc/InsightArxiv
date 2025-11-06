# ai/re_enhance_errors.py
#!/usr/bin/env python3
"""
Re-run ai/enhance.py for records whose AI block is still entirely "ERROR".
Usage example:
  uv run python re_enhance_errors.py \
      --data data/2025-11-05_AI_enhanced_Chinese.jsonl \
      --api-keys KEY1,KEY2 \
      --model-priority gemini-flash-latest,gemini-2.5-flash,gemini-flash-lite-latest,gemini-2.5-flash-lite
This will modify the specified JSONL file in place.

uv run python re_enhance_errors.py --data data/2025-11-05_AI_enhanced_Chinese.jsonl --api-keys KEY1,KEY2 --model-priority gemini-flash-latest,gemini-2.5-flash,gemini-flash-lite-latest,gemini-2.5-flash-lite

"""
import argparse
import json
import os
import shlex
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List

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
) -> Dict[str, Dict]:
    if not papers:
        return {}

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_in = Path(tmpdir) / "batch.jsonl"
        with tmp_in.open("w", encoding="utf-8") as fh:
            for paper in papers:
                fh.write(json.dumps(paper, ensure_ascii=False) + "\n")

        tmp_out = tmp_in.with_name(f"{tmp_in.stem}_AI_enhanced_{language}{tmp_in.suffix}")

        env = os.environ.copy()
        env["GOOGLE_API_KEYS"] = api_keys
        env["MODEL_PRIORITY_LIST"] = model_priority

        cmd = shlex.split(runner) + [
            "ai/enhance.py",
            "--data",
            str(tmp_in),
            "--language",
            language,
        ]
        try:
            result = subprocess.run(
                cmd,
                env=env,
                check=True,
                capture_output=True,
                text=True,
            )
        except subprocess.CalledProcessError as exc:
            combined = (exc.stdout or "") + ("\n" + exc.stderr if exc.stderr else "")
            msg = ["Failed to run enhance.py."]
            if combined.strip():
                msg.append("Captured output:\n" + combined.strip())
            raise RuntimeError("\n".join(msg)) from exc
        else:
            if result.stdout:
                print(result.stdout.rstrip())
            if result.stderr:
                print(result.stderr.rstrip())

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


def main() -> None:
    parser = argparse.ArgumentParser(description="Re-enhance ERROR AI entries in a JSONL file.")
    parser.add_argument("--data", required=True, help="Path to the enhanced JSONL file.")
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
    args = parser.parse_args()

    data_path = Path(args.data)
    if not data_path.exists():
        raise FileNotFoundError(data_path)

    api_keys = (args.api_keys or os.getenv("GOOGLE_API_KEYS", "")).strip()
    model_priority = (args.model_priority or os.getenv("MODEL_PRIORITY_LIST", "")).strip()
    if not api_keys:
        raise ValueError("GOOGLE_API_KEYS not provided via --api-keys or environment variable.")
    if not model_priority:
        raise ValueError("MODEL_PRIORITY_LIST not provided via --model-priority or environment variable.")

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

    print(f"Done. Updated {updated} record(s).")


if __name__ == "__main__":
    main()
