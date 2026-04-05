import importlib
import os
import sys
import types

import numpy as np
import soundfile as sf

os.environ["DATABASE_URL"] = "sqlite:///./test_neurosense.db"


class _DummyModel:
    def __init__(self, *_args, **_kwargs):
        pass


class _DummyRecognizer:
    def __init__(self, *_args, **_kwargs):
        pass


def _load_audio_processor(monkeypatch):
    """Import audio_processor with light stubs so tests don't need a Vosk model."""
    fake_vosk = types.ModuleType("vosk")
    fake_vosk.Model = _DummyModel
    fake_vosk.KaldiRecognizer = _DummyRecognizer

    class _DummyAudioSegment:
        @staticmethod
        def from_file(*_args, **_kwargs):
            raise RuntimeError("Audio conversion is not expected in this test")

    fake_pydub = types.ModuleType("pydub")
    fake_pydub.AudioSegment = _DummyAudioSegment

    monkeypatch.setitem(sys.modules, "vosk", fake_vosk)
    monkeypatch.setitem(sys.modules, "pydub", fake_pydub)
    monkeypatch.delitem(sys.modules, "app.core.audio_processor", raising=False)

    return importlib.import_module("app.core.audio_processor")


def test_extract_acoustic_features_from_dummy_sine_wave(tmp_path, monkeypatch):
    audio_processor = _load_audio_processor(monkeypatch)

    # Mock Vosk-related transcription behavior to keep this test model-free.
    monkeypatch.setattr(audio_processor, "transcribe_audio", lambda _path: "stub transcript")

    sample_rate = 16000
    duration_seconds = 1.0
    timeline = np.linspace(0, duration_seconds, int(sample_rate * duration_seconds), endpoint=False)
    sine_wave = 0.2 * np.sin(2 * np.pi * 220 * timeline)

    wav_path = tmp_path / "dummy.wav"
    sf.write(wav_path, sine_wave, sample_rate)

    features = audio_processor.extract_acoustic_features(wav_path)

    assert isinstance(features, dict)
    assert {"speech_rate", "number_of_pauses", "pitch_variation"}.issubset(features.keys())
    assert isinstance(features["speech_rate"], float)
    assert isinstance(features["number_of_pauses"], int)
    assert isinstance(features["pitch_variation"], float)
