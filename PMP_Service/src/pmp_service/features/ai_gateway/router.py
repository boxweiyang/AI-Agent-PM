from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from pmp_service.features.ai_gateway.service import invoke_agent

router = APIRouter(prefix="/ai", tags=["ai"])


class InvokeBody(BaseModel):
    capability: str = Field(..., description="与 Agent registry 键一致，如 echo")
    payload: dict = Field(default_factory=dict)


@router.post("/invoke")
async def post_invoke(body: InvokeBody):
    try:
        data = await invoke_agent(body.capability, body.payload)
        return {"code": 0, "message": "ok", "data": data}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
