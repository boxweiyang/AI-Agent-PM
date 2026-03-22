from __future__ import annotations

from typing import Any, Dict

from pmp_ai_agent.facade import invoke


async def invoke_agent(capability: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    薄封装：后续可在此统一超时、日志、异常映射。
    禁止在其它 features 中 import pmp_ai_agent。
    """
    # 当前 echo 为同步实现；真 LLM 时可改为 asyncio.to_thread 或原生 async
    return invoke(capability, payload)
