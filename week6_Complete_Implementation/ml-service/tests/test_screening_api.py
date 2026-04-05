import json
import os
import sys
import types
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

# Ensure app config/database bootstrap is test-safe at import time.
os.environ["DATABASE_URL"] = "sqlite:///./test_neurosense.db"

# Prevent optional heavy audio dependencies from blocking test import.
_audio_processor_stub = types.ModuleType("app.core.audio_processor")


async def _stub_process_uploaded_audio(_audio):
    raise RuntimeError("process_uploaded_audio should be monkeypatched in tests")


_audio_processor_stub.process_uploaded_audio = _stub_process_uploaded_audio
sys.modules.setdefault("app.core.audio_processor", _audio_processor_stub)

# Reset cached modules so settings re-read the test DATABASE_URL even when
# another test imported app.core.config earlier in this pytest run.
for module_name in ("app.main", "app.routes.screening", "app.core.database", "app.core.config"):
    sys.modules.pop(module_name, None)

import app.main as main_app
import app.routes.screening as screening_routes
from app.core.config import settings

# Avoid external DB requirements during API endpoint tests.
main_app.init_db = lambda: None

API_KEY = settings.secret_key.get_secret_value()

MOCK_SCREENING_REQUEST = {
    "patient_id": "60d5ec49f1b2c72b7c8e4a3b",
    "age": 72,
    "gender": "female",
    "mmse_score": 22,
    "cdr_score": 1.0,
    "moca_score": 18,
    "education_years": 12,
    "family_history": True,
    "physical_activity_level": "low",
}

MOCK_MODEL_RESPONSE = {
    "risk_score": 0.52,
    "risk_level": "moderate",
    "confidence": 0.91,
    "model_version": "test-model-v1",
}


@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    with TestClient(main_app.app) as test_client:
        yield test_client


def test_screening_health_returns_200(client: TestClient):
    response = client.get("/api/screening/health")

    assert response.status_code == 200


def test_predict_requires_api_key(client: TestClient):
    response = client.post("/api/screening/predict", json=MOCK_SCREENING_REQUEST)

    assert response.status_code in {401, 403}


def test_predict_returns_200_with_valid_api_key(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(screening_routes, "predict", lambda _features: MOCK_MODEL_RESPONSE)

    response = client.post(
        "/api/screening/predict",
        json=MOCK_SCREENING_REQUEST,
        headers={"x-api-key": API_KEY},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["patient_id"] == MOCK_SCREENING_REQUEST["patient_id"]
    assert body["risk_score"] == MOCK_MODEL_RESPONSE["risk_score"]
    assert body["risk_level"] == MOCK_MODEL_RESPONSE["risk_level"]
    assert body["confidence"] == MOCK_MODEL_RESPONSE["confidence"]
    assert body["model_version"] == MOCK_MODEL_RESPONSE["model_version"]


class _FakeAcousticFeatures:
    num_pauses = 3

    def to_dict(self):
        return {
            "speech_rate": 112.5,
            "num_pauses": 3,
            "pitch_variation": 40.7,
        }


class _FakeTranscription:
    word_count = 5

    def to_dict(self):
        return {
            "text": "patient speech sample",
            "language": "en",
            "word_count": 5,
        }


class _FakeAudioAnalysis:
    acoustic_features = _FakeAcousticFeatures()
    transcription = _FakeTranscription()


def test_predict_audio_accepts_upload_with_valid_api_key(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
):
    async def _fake_process_uploaded_audio(_audio):
        return _FakeAudioAnalysis()

    monkeypatch.setattr(
        screening_routes,
        "process_uploaded_audio",
        _fake_process_uploaded_audio,
    )
    monkeypatch.setattr(screening_routes, "predict", lambda _features: MOCK_MODEL_RESPONSE)

    response = client.post(
        "/api/screening/predict-audio",
        data={"metadata": json.dumps(MOCK_SCREENING_REQUEST)},
        files={
            "audio": (
                "sample.wav",
                b"RIFF\x24\x00\x00\x00WAVEfmt ",
                "audio/wav",
            )
        },
        headers={"x-api-key": API_KEY},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["patient_id"] == MOCK_SCREENING_REQUEST["patient_id"]
    assert body["risk_score"] == MOCK_MODEL_RESPONSE["risk_score"]
    assert "audio_analysis" in body
    assert body["audio_analysis"]["transcription"]["text"] == "patient speech sample"
