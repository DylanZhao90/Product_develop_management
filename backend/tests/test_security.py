import time

from app.core.security import create_access_token, create_refresh_token, verify_token


def test_create_and_verify_access_token():
    token = create_access_token(subject="test-user-123")
    payload = verify_token(token)
    assert payload is not None
    assert payload["sub"] == "test-user-123"
    assert payload["type"] == "access"


def test_create_and_verify_refresh_token():
    token = create_refresh_token(subject="test-user-123")
    payload = verify_token(token)
    assert payload is not None
    assert payload["type"] == "refresh"


def test_verify_invalid_token():
    assert verify_token("invalid.token.string") is None
    assert verify_token("") is None


def test_verify_expired_token():
    token = create_access_token(subject="test", expires_delta=__import__("datetime").timedelta(seconds=-1))
    payload = verify_token(token)
    assert payload is None
