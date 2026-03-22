from __future__ import annotations

from typing import Any, Callable, Dict

Handler = Callable[[Dict[str, Any]], Dict[str, Any]]


def _echo(payload: Dict[str, Any]) -> Dict[str, Any]:
    """脚手架占位：验证 Service → Agent 链路。"""
    message = payload.get("message", "")
    return {"echo": message, "capability": "echo"}


HANDLERS: Dict[str, Handler] = {
    "echo": _echo,
}


def register(name: str, fn: Handler) -> None:
    """新能力在启动时注册（或由各 feature 模块 import 副作用注册）。"""
    HANDLERS[name] = fn
