# ──────────────────────────────────────────────
# NeuroSense ML Service — Screening Routes
# ──────────────────────────────────────────────

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import ValidationError

from app.core.audio_processor import process_uploaded_audio
from app.core.security import require_screening_api_key
from app.models.ml_model import predict
from app.schemas.screening import (
    AudioAnalysisSchema,
    ScreeningRequest,
    ScreeningResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/screening", tags=["Screening"])


# ─── Health ─────────────────────────────────────
@router.get("/health")
async def health_check():
    """Quick liveness probe for the ML service."""
    return {"status": "ok", "service": "ml-service"}


# ─── Predict (JSON only — original) ────────────
@router.post(
    "/predict",
    response_model=ScreeningResponse,
    dependencies=[Depends(require_screening_api_key)],
)
async def run_prediction(request: Request):
    """
    Accept either:
      1) application/json screening payload
      2) multipart/form-data with:
         - audio: uploaded file
         - metadata: JSON string matching ScreeningRequest

    This lets the Node.js backend send audio-enhanced predictions
    through the same /predict endpoint.
    """
    content_type = (request.headers.get("content-type") or "").lower()

    if "multipart/form-data" in content_type:
        form = await request.form()
        audio = form.get("audio")
        metadata = form.get("metadata")

        if audio is None or not hasattr(audio, "read"):
            raise HTTPException(
                status_code=422,
                detail="Multipart requests must include an 'audio' file.",
            )

        if not isinstance(metadata, str):
            raise HTTPException(
                status_code=422,
                detail="Multipart requests must include a 'metadata' JSON string.",
            )

        patient_data = _parse_metadata(metadata)
        analysis = await process_uploaded_audio(audio)

        logger.info(
            "Audio processed for patient %s — %d words transcribed, %d pauses detected",
            patient_data.patient_id,
            analysis.transcription.word_count,
            analysis.acoustic_features.num_pauses,
        )

        return _predict_from_patient_data(patient_data, analysis)

    payload = _parse_json_payload(await request.body())
    return _predict_from_patient_data(payload)


def _predict_from_patient_data(
    patient_data: ScreeningRequest,
    analysis: Any | None = None,
) -> ScreeningResponse:
    """Build model features and map prediction to API response."""
    features = patient_data.model_dump()

    if analysis is not None:
        features["audio"] = analysis.acoustic_features.to_dict()
        features["transcription"] = analysis.transcription.to_dict()

    result = predict(features)

    audio_analysis = None
    if analysis is not None:
        audio_analysis = AudioAnalysisSchema(
            acoustic_features=analysis.acoustic_features.to_dict(),
            transcription=analysis.transcription.to_dict(),
        )

    return ScreeningResponse(
        patient_id=patient_data.patient_id,
        audio_analysis=audio_analysis,
        **result,
    )


def _parse_json_payload(raw_body: bytes) -> ScreeningRequest:
    """Parse and validate application/json body."""
    try:
        body = json.loads(raw_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.") from exc

    try:
        return ScreeningRequest(**body)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=json.loads(exc.json())) from exc


def _parse_metadata(metadata: str) -> ScreeningRequest:
    """Parse and validate multipart metadata JSON."""
    try:
        meta_dict = json.loads(metadata)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail="'metadata' must be valid JSON.",
        ) from exc

    try:
        return ScreeningRequest(**meta_dict)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=json.loads(exc.json())) from exc


# ─── Predict with Audio (compatibility alias) ──
@router.post(
    "/predict-audio",
    response_model=ScreeningResponse,
    dependencies=[Depends(require_screening_api_key)],
)
async def run_prediction_with_audio(
    audio: UploadFile = File(..., description="Audio file (.wav, .mp3, .webm, .ogg)"),
    metadata: str = Form(
        ...,
        description=(
            "JSON string with patient info: "
            '{"patient_id":"...","age":72,"gender":"female",...}'
        ),
    ),
):
    """
    Accept an audio file **plus** patient metadata (as a JSON form field).

    Pipeline:
      1. Parse metadata JSON → ScreeningRequest
      2. Run audio through the audio processor (feature extraction + STT)
      3. Merge acoustic features into the feature dict
      4. Run the ML model
      5. Return prediction + audio analysis
    """
    patient_data = _parse_metadata(metadata)
    analysis = await process_uploaded_audio(audio)

    logger.info(
        "Audio processed for patient %s — %d words transcribed, %d pauses detected",
        patient_data.patient_id,
        analysis.transcription.word_count,
        analysis.acoustic_features.num_pauses,
    )

    return _predict_from_patient_data(patient_data, analysis)
