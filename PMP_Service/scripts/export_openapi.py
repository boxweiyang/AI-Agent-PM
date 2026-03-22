"""导出 OpenAPI JSON，供 PMP_Web codegen（openapi-typescript 等）。"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_ROOT / "src"))

from pmp_service.main import app  # noqa: E402

if __name__ == "__main__":
    out = _ROOT / "openapi.json"
    out.write_text(json.dumps(app.openapi(), indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"written: {out}")
