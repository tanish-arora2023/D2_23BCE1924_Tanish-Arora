"""Audio processing utilities for offline speech analysis."""

from __future__ import annotations

import json
import logging
import tempfile
import wave
from dataclasses import dataclass, field
from pathlib import Path

import librosa
import numpy as np
from fastapi import UploadFile
from pydub import AudioSegment
from vosk import KaldiRecognizer, Model

from app.core.config import settings

logger = logging.getLogger(__name__)

_MIN_PAUSE_SECONDS = 0.5
_VOSK_MODEL_CACHE: Model | None = None
_VOSK_MODEL_CACHE_PATH: str | None = None


@dataclass
class AcousticFeatures:
    """Acoustic markers used by the screening flow."""

    speech_rate: float = 0.0
    number_of_pauses: int = 0
    pitch_variation: float = 0.0

    @property
    def num_pauses(self) -> int:
        """Compatibility alias used by existing route logging."""
        return self.number_of_pauses

    def to_dict(self) -> dict[str, float | int]:
        return {
            "speech_rate": round(float(self.speech_rate), 4),
            "number_of_pauses": int(self.number_of_pauses),
            "pitch_variation": round(float(self.pitch_variation), 4),
        }


@dataclass
class TranscriptionResult:
    """Speech-to-text output container."""

    text: str = ""
    language: str = "en"
    word_count: int = 0

    def to_dict(self) -> dict[str, str | int]:
        return {
            "text": self.text,
            "language": self.language,
            "word_count": self.word_count,
        }


@dataclass
class AudioAnalysis:
    """Combined output used by screening routes."""

    acoustic_features: AcousticFeatures = field(default_factory=AcousticFeatures)
    transcription: TranscriptionResult = field(default_factory=TranscriptionResult)

    def to_dict(self) -> dict[str, dict[str, float | int | str]]:
        return {
            "acoustic_features": self.acoustic_features.to_dict(),
            "transcription": self.transcription.to_dict(),
        }


def _load_vosk_model() -> Model:
    """Load and cache the Vosk model configured by VOSK_MODEL_PATH."""
    global _VOSK_MODEL_CACHE
    global _VOSK_MODEL_CACHE_PATH

    model_path = Path(settings.vosk_model_path).expanduser().resolve()
    cache_key = str(model_path)

    if _VOSK_MODEL_CACHE is not None and _VOSK_MODEL_CACHE_PATH == cache_key:
        return _VOSK_MODEL_CACHE

    if not model_path.exists() or not model_path.is_dir():
        raise FileNotFoundError(
            f"Vosk model folder not found: {model_path}. "
            "Download vosk-model-small-en-us and extract it under trained_models/vosk_model."
        )

    _VOSK_MODEL_CACHE = Model(cache_key)
    _VOSK_MODEL_CACHE_PATH = cache_key
    return _VOSK_MODEL_CACHE


def _is_standard_wav(path: Path) -> bool:
    """Return True for PCM WAV files compatible with the recognizer."""
    if path.suffix.lower() != ".wav":
        return False

    try:
        with wave.open(str(path), "rb") as wav_file:
            return wav_file.getnchannels() == 1 and wav_file.getsampwidth() == 2
    except (wave.Error, FileNotFoundError):
        return False


def _convert_to_standard_wav(file_path: str | Path) -> str:
    """Convert any audio file to mono, 16-bit PCM WAV at 16kHz."""
    audio = AudioSegment.from_file(str(file_path))
    audio = audio.set_channels(1).set_frame_rate(16000).set_sample_width(2)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_wav:
        output_path = temp_wav.name

    audio.export(output_path, format="wav")
    return output_path


def _prepare_wav_file(file_path: str | Path) -> tuple[str, list[str]]:
    """Ensure a standard WAV path and return cleanup targets."""
    source = Path(file_path)
    if not source.exists():
        raise FileNotFoundError(f"Audio file not found: {source}")

    if _is_standard_wav(source):
        return str(source), []

    converted = _convert_to_standard_wav(source)
    return converted, [converted]


def _transcribe_prepared_wav(wav_path: str) -> str:
    """Transcribe a prepared WAV file with Vosk."""
    model = _load_vosk_model()

    transcript_segments: list[str] = []
    with wave.open(wav_path, "rb") as wav_file:
        recognizer = KaldiRecognizer(model, wav_file.getframerate())

        while True:
            chunk = wav_file.readframes(4000)
            if not chunk:
                break

            if recognizer.AcceptWaveform(chunk):
                block_result = json.loads(recognizer.Result())
                block_text = (block_result.get("text") or "").strip()
                if block_text:
                    transcript_segments.append(block_text)

        final_result = json.loads(recognizer.FinalResult())
        final_text = (final_result.get("text") or "").strip()
        if final_text:
            transcript_segments.append(final_text)

    return " ".join(transcript_segments).strip()


def _extract_features_from_prepared_audio(file_path: str) -> dict[str, float | int]:
    """Extract speech rate, pause count, and pitch variance from audio."""
    y, sr_rate = librosa.load(file_path, sr=16000, mono=True)
    duration_seconds = float(librosa.get_duration(y=y, sr=sr_rate))

    if duration_seconds <= 0.0:
        return {
            "speech_rate": 0.0,
            "number_of_pauses": 0,
            "pitch_variation": 0.0,
        }

    # Approximate syllables from onset peaks and convert to syllables/minute.
    onset_frames = librosa.onset.onset_detect(y=y, sr=sr_rate)
    estimated_syllables = len(onset_frames)
    speech_rate = estimated_syllables / (duration_seconds / 60.0)

    voiced_intervals = librosa.effects.split(y, top_db=30)
    number_of_pauses = 0

    if len(voiced_intervals) == 0:
        number_of_pauses = 1 if duration_seconds > _MIN_PAUSE_SECONDS else 0
    else:
        previous_end = 0
        for start, end in voiced_intervals:
            pause_seconds = (start - previous_end) / sr_rate
            if pause_seconds > _MIN_PAUSE_SECONDS:
                number_of_pauses += 1
            previous_end = end

        trailing_pause_seconds = (len(y) - previous_end) / sr_rate
        if trailing_pause_seconds > _MIN_PAUSE_SECONDS:
            number_of_pauses += 1

    f0, voiced_flag, _ = librosa.pyin(
        y,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
        sr=sr_rate,
    )

    if voiced_flag is not None:
        voiced_pitch = f0[voiced_flag]
    else:
        voiced_pitch = f0[np.isfinite(f0)]

    if voiced_pitch.size == 0:
        pitch_variation = 0.0
    else:
        pitch_variation = float(np.nanvar(voiced_pitch))

    return {
        "speech_rate": float(speech_rate),
        "number_of_pauses": int(number_of_pauses),
        "pitch_variation": pitch_variation,
    }


def transcribe_audio(file_path: str | Path) -> str:
    """Load the Vosk model from VOSK_MODEL_PATH and return transcript text."""
    wav_path, temp_files = _prepare_wav_file(file_path)
    try:
        return _transcribe_prepared_wav(wav_path)
    finally:
        for temp_file in temp_files:
            Path(temp_file).unlink(missing_ok=True)


def extract_acoustic_features(file_path: str | Path) -> dict[str, float | int]:
    """Calculate speech rate, pause count, and pitch variation using librosa."""
    wav_path, temp_files = _prepare_wav_file(file_path)
    try:
        return _extract_features_from_prepared_audio(wav_path)
    finally:
        for temp_file in temp_files:
            Path(temp_file).unlink(missing_ok=True)


def analyze_speech(file_path: str | Path) -> dict[str, str | dict[str, float | int]]:
    """Run transcription and acoustic feature extraction in one call."""
    wav_path, temp_files = _prepare_wav_file(file_path)
    try:
        transcript = _transcribe_prepared_wav(wav_path)
        features = _extract_features_from_prepared_audio(wav_path)
        return {
            "transcript": transcript,
            "acoustic_features": features,
        }
    finally:
        for temp_file in temp_files:
            Path(temp_file).unlink(missing_ok=True)


async def process_audio(file_bytes: bytes, suffix: str = ".wav") -> AudioAnalysis:
    """Compatibility wrapper used by screening routes for uploaded audio bytes."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix or ".wav") as temp_file:
        temp_file.write(file_bytes)
        temp_path = temp_file.name

    try:
        result = analyze_speech(temp_path)
        transcript_text = str(result.get("transcript") or "")
        features = result.get("acoustic_features") or {}

        acoustic_features = AcousticFeatures(
            speech_rate=float(features.get("speech_rate", 0.0)),
            number_of_pauses=int(features.get("number_of_pauses", 0)),
            pitch_variation=float(features.get("pitch_variation", 0.0)),
        )
        transcription = TranscriptionResult(
            text=transcript_text,
            language="en",
            word_count=len(transcript_text.split()) if transcript_text else 0,
        )

        return AudioAnalysis(
            acoustic_features=acoustic_features,
            transcription=transcription,
        )
    finally:
        Path(temp_path).unlink(missing_ok=True)


async def process_uploaded_audio(uploaded_file: UploadFile) -> AudioAnalysis:
    """Compatibility wrapper for FastAPI UploadFile objects."""
    file_bytes = await uploaded_file.read()
    suffix = _suffix_from_filename(uploaded_file.filename)
    return await process_audio(file_bytes, suffix=suffix)


def _suffix_from_filename(filename: str | None) -> str:
    """Get file extension from upload filename."""
    if filename and "." in filename:
        return "." + filename.rsplit(".", 1)[-1].lower()
    return ".wav"
