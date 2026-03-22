from fastapi.testclient import TestClient

from pmp_service.main import app

client = TestClient(app)


def test_ai_echo_invoke():
    r = client.post(
        "/api/v1/ai/invoke",
        json={"capability": "echo", "payload": {"message": "ping"}},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert body["data"]["echo"] == "ping"
