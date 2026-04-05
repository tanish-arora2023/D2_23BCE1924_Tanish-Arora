# ──────────────────────────────────────────────
# NeuroSense ML Service — Pydantic Schemas
# Request / Response models for the screening API
# ──────────────────────────────────────────────

from pydantic import BaseModel, Field


# ─── JSON Request (original) ───────────────────
class ScreeningRequest(BaseModel):
    """
    Input payload sent from the Node.js backend (JSON body).
    Fields will evolve as the actual ML model is finalised.
    """

    patient_id: str = Field(..., description="MongoDB ObjectId of the patient")
    age: int = Field(..., ge=0, le=150, description="Patient age")
    gender: str = Field(..., description="Patient gender (male / female / other)")

    # ── Cognitive test scores (placeholders) ────
    mmse_score: float | None = Field(
        None, ge=0, le=30, description="Mini-Mental State Examination score"
    )
    cdr_score: float | None = Field(
        None, ge=0, le=3, description="Clinical Dementia Rating"
    )
    moca_score: float | None = Field(
        None, ge=0, le=30, description="Montreal Cognitive Assessment score"
    )

    # ── Additional features ─────────────────────
    education_years: int | None = Field(None, ge=0, description="Years of education")
    family_history: bool = Field(False, description="Family history of dementia")
    physical_activity_level: str | None = Field(
        None, description="low / moderate / high"
    )


# ─── Acoustic features (returned in response) ──
class AcousticFeaturesSchema(BaseModel):
    pitch_mean: float = 0.0
    pitch_std: float = 0.0
    pitch_range: float = 0.0
    speech_rate: float = 0.0
    articulation_rate: float = 0.0
    num_pauses: int = 0
    total_pause_duration: float = 0.0
    mean_pause_duration: float = 0.0
    energy_mean: float = 0.0
    energy_std: float = 0.0
    duration_seconds: float = 0.0


# ─── Transcription (returned in response) ──────
class TranscriptionSchema(BaseModel):
    text: str = ""
    language: str = ""
    word_count: int = 0


# ─── Audio analysis bundle ─────────────────────
class AudioAnalysisSchema(BaseModel):
    acoustic_features: AcousticFeaturesSchema
    transcription: TranscriptionSchema


# ─── Response ───────────────────────────────────
class ScreeningResponse(BaseModel):
    """
    Prediction returned to the Node.js backend.
    """

    patient_id: str
    risk_score: float = Field(
        ..., ge=0.0, le=1.0, description="Dementia risk probability (0-1)"
    )
    risk_level: str = Field(
        ..., description="Risk category: low / moderate / high"
    )
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Model confidence in the prediction"
    )
    model_version: str = Field(..., description="Version of the ML model used")

    # ── Optional: present when audio was uploaded ─
    audio_analysis: AudioAnalysisSchema | None = Field(
        None, description="Acoustic features & transcription (when audio is provided)"
    )
