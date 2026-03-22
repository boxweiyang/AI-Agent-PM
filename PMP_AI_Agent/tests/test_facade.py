from pmp_ai_agent.facade import invoke


def test_echo_capability():
    out = invoke("echo", {"message": "hello"})
    assert out["echo"] == "hello"
    assert out["capability"] == "echo"
