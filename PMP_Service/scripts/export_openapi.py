"""导出 OpenAPI JSON，供 PMP_Web codegen（openapi-typescript 等）。

默认写入 `PMP_Service/openapi.json`；加 `--copy-contracts` 时额外写入仓库根
`contracts/openapi/openapi-from-service.json`，便于与手写草案 `openapi.yaml` diff。
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
_REPO_ROOT = _ROOT.parent
sys.path.insert(0, str(_ROOT / "src"))

from pmp_service.main import app  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--copy-contracts",
        action="store_true",
        help="同时写入 ../contracts/openapi/openapi-from-service.json",
    )
    args = parser.parse_args()

    doc = app.openapi()
    text = json.dumps(doc, indent=2, ensure_ascii=False)

    out = _ROOT / "openapi.json"
    out.write_text(text, encoding="utf-8")
    print(f"written: {out}")

    if args.copy_contracts:
        contracts_out = _REPO_ROOT / "contracts" / "openapi" / "openapi-from-service.json"
        contracts_out.parent.mkdir(parents=True, exist_ok=True)
        contracts_out.write_text(text, encoding="utf-8")
        print(f"written: {contracts_out}")


if __name__ == "__main__":
    main()
