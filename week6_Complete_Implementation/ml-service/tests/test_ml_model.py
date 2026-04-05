from app.models.ml_model import predict
from app.schemas.screening import ScreeningRequest


def test_predict_returns_risk_score_and_level_with_schema_payload():
    request = ScreeningRequest(
        patient_id="60d5ec49f1b2c72b7c8e4a3b",
        age=72,
        gender="female",
        mmse_score=22,
        cdr_score=1.0,
        moca_score=18,
        education_years=12,
        family_history=True,
        physical_activity_level="low",
    )

    features = request.model_dump()
    features["audio"] = {
        "speech_rate": 110.0,
        "number_of_pauses": 7,
        "pitch_variation": 35.0,
    }

    result = predict(features)

    assert isinstance(result, dict)
    assert "risk_score" in result
    assert "risk_level" in result
    assert isinstance(result["risk_score"], float)
    assert isinstance(result["risk_level"], str)
    assert result["risk_level"] in {"low", "moderate", "high"}
