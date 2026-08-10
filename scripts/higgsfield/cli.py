#!/usr/bin/env python3
"""Higgsfield smoke + generate helper for Terremoto Colombia campaign.

Auth: Authorization: Key {HF_API_KEY}:{HF_API_SECRET}
Docs: https://docs.higgsfield.ai/docs/how-to/introduction

Loads credentials from repo-root `.env` (gitignored).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = "https://platform.higgsfield.ai"
DEFAULT_MODEL = "higgsfield-ai/soul/standard"


def load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        os.environ.setdefault(key, val)


def auth_header() -> str:
    key = os.environ.get("HF_API_KEY", "").strip()
    secret = os.environ.get("HF_API_SECRET", "").strip()
    combo = os.environ.get("HF_KEY", "").strip()
    if key and secret:
        return f"Key {key}:{secret}"
    if combo and ":" in combo:
        return f"Key {combo}"
    print("Missing HF_API_KEY/HF_API_SECRET (or HF_KEY) in .env", file=sys.stderr)
    sys.exit(2)


def request(method: str, url: str, body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": auth_header(),
            "Accept": "application/json",
            "Content-Type": "application/json",
            # Cloudflare on platform.higgsfield.ai bans the default Python-urllib UA.
            "User-Agent": "TerremotoColombiaCampaign/1.0 (+https://terremotocolombia.com)",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = {"detail": raw}
        payload["_http_status"] = exc.code
        return payload


def submit(model: str, arguments: dict) -> dict:
    return request("POST", f"{BASE}/{model}", arguments)


def status(request_id: str) -> dict:
    return request("GET", f"{BASE}/requests/{request_id}/status")


def wait(request_id: str, timeout_s: int = 180, interval_s: float = 3.0) -> dict:
    deadline = time.time() + timeout_s
    last: dict = {}
    while time.time() < deadline:
        last = status(request_id)
        st = last.get("status")
        print(f"  status={st}", flush=True)
        if st in {"completed", "failed", "nsfw", "cancelled"}:
            return last
        time.sleep(interval_s)
    last["_timeout"] = True
    return last


def cmd_smoke(_: argparse.Namespace) -> int:
    print("Submitting smoke job…")
    res = submit(
        DEFAULT_MODEL,
        {
            "prompt": "flat solid abstract navy blue geometric square, minimal, no text, no people, no logos",
            "aspect_ratio": "1:1",
            "resolution": "720p",
        },
    )
    if res.get("detail") == "not_enough_credits":
        print("AUTH OK — account has no credits (top up at cloud.higgsfield.ai)")
        return 0
    if res.get("_http_status") in {401, 403}:
        print("AUTH FAILED:", res)
        return 1
    rid = res.get("request_id")
    print("queued:", rid or res)
    if not rid:
        return 1
    done = wait(rid)
    print(json.dumps({k: done.get(k) for k in ("status", "request_id", "images")}, indent=2))
    return 0 if done.get("status") == "completed" else 1


def cmd_generate(args: argparse.Namespace) -> int:
    aspect = args.aspect_ratio
    prompt = args.prompt
    if args.prompt_file:
        prompt = Path(args.prompt_file).read_text(encoding="utf-8").strip()
    res = submit(
        args.model,
        {
            "prompt": prompt,
            "aspect_ratio": aspect,
            "resolution": args.resolution,
        },
    )
    if res.get("detail"):
        print(res)
        return 1
    rid = res["request_id"]
    print("request_id=", rid)
    done = wait(rid, timeout_s=args.timeout)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    meta_path = out_dir / f"{args.name}.json"
    meta_path.write_text(json.dumps(done, indent=2), encoding="utf-8")
    images = done.get("images") or []
    if done.get("status") != "completed" or not images:
        print("generation not completed:", done.get("status"), done.get("detail"))
        return 1
    url = images[0]["url"]
    dest = out_dir / f"{args.name}.jpg"
    urllib.request.urlretrieve(url, dest)
    print("saved", dest)
    return 0


def main() -> int:
    load_dotenv(ROOT / ".env")
    parser = argparse.ArgumentParser(description="Higgsfield campaign helper")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_smoke = sub.add_parser("smoke", help="Verify API auth")
    p_smoke.set_defaults(func=cmd_smoke)

    p_gen = sub.add_parser("generate", help="Generate one image and download it")
    p_gen.add_argument("--name", required=True, help="Output basename, e.g. x-launch-1200x675")
    p_gen.add_argument("--prompt", default="")
    p_gen.add_argument("--prompt-file", default="")
    p_gen.add_argument("--aspect-ratio", default="16:9")
    p_gen.add_argument("--resolution", default="720p")
    p_gen.add_argument("--model", default=DEFAULT_MODEL)
    p_gen.add_argument(
        "--out-dir",
        default=str(ROOT / "campaigns/difusion-2026-08/higgsfield/out"),
    )
    p_gen.add_argument("--timeout", type=int, default=180)
    p_gen.set_defaults(func=cmd_generate)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
