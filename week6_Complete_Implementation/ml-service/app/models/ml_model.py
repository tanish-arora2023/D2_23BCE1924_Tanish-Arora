# ──────────────────────────────────────────────
# NeuroSense ML Service — ML Model Loader
# Handles loading, caching, and running inference
# ──────────────────────────────────────────────

from __future__ import annotations

import logging
import os
import pickle
from typing import Any

import numpy as np
import pandas as pd

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── In-memory model cache ───────────────────────
_model_cache: dict[str, Any] = {}

MODEL_VERSION = "1.0.0-rf-synth"

MODEL_FEATURE_ORDER = [
    "age",
    "mmse_score",
    "cdr_score",
    "moca_score",
    "education_years",
    "speech_rate",
    "number_of_pauses",
    "pitch_variation",
]


def _safe_float(value: Any, default: float = 0.0) -> float:
    """Best-effort numeric conversion with a deterministic fallback."""
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _build_feature_array(features: dict[str, Any]) -> np.ndarray:
    """Build ordered model input from cognitive + acoustic payload fields."""
    audio = features.get("audio") or {}

    age = _safe_float(features.get("age"))
    mmse_score = _safe_float(features.get("mmse_score"), default=0.0)
    cdr_score = _safe_float(features.get("cdr_score"), default=0.0)
    moca_score = _safe_float(features.get("moca_score"), default=0.0)
    education_years = _safe_float(features.get("education_years"), default=0.0)

    speech_rate = _safe_float(
        features.get("speech_rate", audio.get("speech_rate")),
        default=0.0,
    )
    number_of_pauses = _safe_float(
        features.get(
            "number_of_pauses",
            audio.get("number_of_pauses", audio.get("num_pauses")),
        ),
        default=0.0,
    )
    pitch_variation = _safe_float(
        features.get("pitch_variation", audio.get("pitch_variation")),
        default=0.0,
    )

    return np.array(
        [[
            age,
            mmse_score,
            cdr_score,
            moca_score,
            education_years,
            speech_rate,
            number_of_pauses,
            pitch_variation,
        ]],
        dtype=float,
    )


def load_model() -> Any | None:
    """
    Load the serialised model from disk.
    Returns None if the file does not exist yet (placeholder mode).
    """
    path = settings.model_path
    if not os.path.isfile(path):
        logger.warning("Model file not found at %s — running in placeholder mode", path)
        return None

    if path not in _model_cache:
        with open(path, "rb") as f:
            _model_cache[path] = pickle.load(f)
        logger.info("Model loaded from %s", path)

    return _model_cache[path]


def predict(features: dict) -> dict:
    """
    Run inference.

    Accepts both plain demographic features AND the optional
    ``audio`` / ``transcription`` dicts added by the speech module.

    If a real model is loaded, it is used.  Otherwise a deterministic
    placeholder score is returned so end-to-end wiring can be tested
    before the model is trained.
    """
    model = load_model()

    feature_array = _build_feature_array(features)
    audio = features.get("audio") or {}

    if model is not None:
        # ── Real model path ─────────────────────
        if not hasattr(model, "predict_proba"):
            raise RuntimeError("Loaded model does not support predict_proba")

        # Convert to DataFrame with training column names to avoid
        # "feature names" warning from sklearn.
        feature_df = pd.DataFrame(feature_array, columns=MODEL_FEATURE_ORDER)
        probabilities = model.predict_proba(feature_df)[0]
        risk_score = float(probabilities[1])
        confidence = float(np.max(probabilities))
        model_version = MODEL_VERSION
    else:
        # ── Placeholder: deterministic dummy score
        age = feature_array[0][0]
        mmse = feature_array[0][1] if feature_array[0][1] > 0 else 25.0
        cdr = feature_array[0][2]
        moca = feature_array[0][3]
        speech_rate = feature_array[0][5]
        number_of_pauses = feature_array[0][6]
        pitch_variation = feature_array[0][7]

        base_score = (age / 100) * (1 - mmse / 30)
        base_score += min(cdr / 10, 0.25)
        base_score += max(0.0, (24 - moca) * 0.01)

        # Incorporate audio signals when available
        if audio:
            pause_penalty = min(number_of_pauses * 0.015, 0.2)
            rate_penalty = max(0.0, (120.0 - speech_rate) / 1000.0)
            pitch_penalty = max(0.0, (40.0 - pitch_variation) / 600.0)
            base_score += pause_penalty + rate_penalty + pitch_penalty

        risk_score = round(min(max(base_score, 0.0), 1.0), 4)
        confidence = 0.0
        model_version = f"{MODEL_VERSION}-placeholder"

    risk_level = (
        "low" if risk_score < 0.3 else "moderate" if risk_score < 0.7 else "high"
    )

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "confidence": confidence,
        "model_version": model_version,
    }
