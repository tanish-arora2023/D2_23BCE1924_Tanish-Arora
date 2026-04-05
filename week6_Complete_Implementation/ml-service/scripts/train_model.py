"""Train a dementia risk model on synthetic cognitive + acoustic data."""

from __future__ import annotations

import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split

FEATURE_COLUMNS = [
    "age",
    "mmse_score",
    "cdr_score",
    "moca_score",
    "education_years",
    "speech_rate",
    "number_of_pauses",
    "pitch_variation",
]
TARGET_COLUMN = "diagnosis"


def generate_synthetic_dataset(n_records: int = 2000, random_state: int = 42) -> pd.DataFrame:
    """Generate synthetic records for training and local development."""
    if n_records < 1500:
        raise ValueError("n_records must be at least 1500")

    rng = np.random.default_rng(random_state)

    severity = rng.beta(2.3, 2.0, n_records)

    age = np.clip(rng.normal(66 + 18 * severity, 6.5), 50, 95)
    mmse_score = np.clip(rng.normal(28 - 13 * severity, 2.8), 0, 30)
    cdr_score = np.clip(np.round(rng.normal(0.2 + 2.2 * severity, 0.35), 1), 0, 3)
    moca_score = np.clip(rng.normal(26 - 11 * severity, 3.0), 0, 30)
    education_years = np.clip(rng.normal(15 - 6 * severity, 2.2), 0, 24)

    speech_rate = np.clip(rng.normal(170 - 70 * severity, 18), 60, 240)
    number_of_pauses = np.clip(rng.poisson(2 + 11 * severity), 0, 60)
    pitch_variation = np.clip(rng.normal(90 - 40 * severity, 11), 8, 180)

    # Build a probabilistic diagnosis label with clinical + acoustic signal contribution.
    logit = (
        -2.8
        + 0.04 * (age - 65)
        + 0.25 * (24 - mmse_score)
        + 1.05 * cdr_score
        + 0.15 * (22 - moca_score)
        + 0.06 * (12 - education_years)
        + 0.013 * (140 - speech_rate)
        + 0.10 * (number_of_pauses - 4)
        + 0.012 * (70 - pitch_variation)
        + rng.normal(0, 0.65, n_records)
    )
    probability = 1.0 / (1.0 + np.exp(-logit))
    diagnosis = rng.binomial(1, np.clip(probability, 0.01, 0.99))

    data = pd.DataFrame(
        {
            "age": age,
            "mmse_score": mmse_score,
            "cdr_score": cdr_score,
            "moca_score": moca_score,
            "education_years": education_years,
            "speech_rate": speech_rate,
            "number_of_pauses": number_of_pauses,
            "pitch_variation": pitch_variation,
            TARGET_COLUMN: diagnosis.astype(int),
        }
    )

    return data


def train_model(data: pd.DataFrame, random_state: int = 42) -> RandomForestClassifier:
    """Train a RandomForest model with predict_proba support."""
    X = data[FEATURE_COLUMNS]
    y = data[TARGET_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=random_state,
        stratify=y,
    )

    model = RandomForestClassifier(
        n_estimators=350,
        max_depth=14,
        min_samples_leaf=2,
        random_state=random_state,
        n_jobs=-1,
        class_weight="balanced_subsample",
    )
    model.fit(X_train, y_train)

    if not hasattr(model, "predict_proba"):
        raise RuntimeError("Trained model does not support predict_proba")

    y_score = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_score)
    print(f"Validation ROC-AUC: {auc:.4f}")

    return model


def save_model(model: RandomForestClassifier, output_path: Path) -> None:
    """Serialize trained model to the configured output path."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("wb") as model_file:
        pickle.dump(model, model_file)


def main() -> None:
    project_root = Path(__file__).resolve().parents[1]
    model_path = project_root / "trained_models" / "dementia_model.pkl"

    data = generate_synthetic_dataset(n_records=2000, random_state=42)
    model = train_model(data, random_state=42)
    save_model(model, model_path)

    print(f"Saved model to: {model_path}")
    print(f"Training rows: {len(data)}")
    print(f"Feature columns: {', '.join(FEATURE_COLUMNS)}")


if __name__ == "__main__":
    main()
