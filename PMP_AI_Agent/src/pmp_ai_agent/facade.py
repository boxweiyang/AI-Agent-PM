from __future__ import annotations

from typing import Any, Dict

from pmp_ai_agent.registry import HANDLERS


def invoke(capability: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    供 PMP_Service.features.ai_gateway 调用的唯一推荐入口。
    capability 与 registry.HANDLERS 键一致。
    """
    if capability not in HANDLERS:
        raise ValueError(f"unknown capability: {capability}")
    return HANDLERS[capability](payload)
