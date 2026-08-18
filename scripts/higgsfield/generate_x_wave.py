#!/usr/bin/env python3
"""Generate Ola 0 X visuals via Higgsfield API into docs/campaigns/generated/x/."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CLI = ROOT / "scripts/higgsfield/cli.py"
OUT = ROOT / "docs/campaigns/generated/x"
PROMPTS = OUT / "prompts"

WAVE = [
    "x-ancla-utilidad-16x9",
    "x-telefonos-16x9",
    "x-antirumor-16x9",
    "x-hilo-portada-16x9",
    "x-header-16x9",
]


def main() -> int:
    parser = argparse.ArgumentParser(description="Batch-generate X Ola 0 campaign visuals")
    parser.add_argument("--only", nargs="*", help="Subset of asset ids")
    parser.add_argument("--resolution", default="720p")
    parser.add_argument("--timeout", type=int, default=240)
    args = parser.parse_args()

    ids = args.only or WAVE
    OUT.mkdir(parents=True, exist_ok=True)
    failed: list[str] = []

    for name in ids:
        prompt = PROMPTS / f"{name}.txt"
        if not prompt.is_file():
            print(f"missing prompt: {prompt}", file=sys.stderr)
            failed.append(name)
            continue
        print(f"\n=== generating {name} ===", flush=True)
        cmd = [
            sys.executable,
            str(CLI),
            "generate",
            "--name",
            name,
            "--prompt-file",
            str(prompt),
            "--aspect-ratio",
            "16:9",
            "--resolution",
            args.resolution,
            "--out-dir",
            str(OUT),
            "--timeout",
            str(args.timeout),
        ]
        rc = subprocess.call(cmd)
        if rc != 0:
            failed.append(name)

    if failed:
        print("FAILED:", ", ".join(failed), file=sys.stderr)
        return 1
    print("\nAll Ola 0 visuals OK →", OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
