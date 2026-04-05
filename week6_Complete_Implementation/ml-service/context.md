# NeuroSense ML Service — Context for Continuity

> **Last updated:** 2026-04-05  
> **Status:** Local demo ready — FastAPI scaffold + backend visualization + recommendation + screening proxy + docker + API-key security + tests + Vosk offline speech analysis + trained synthetic RF model + screening audit trail logging + ml-service API endpoint tests + core unit tests complete  
> **Deployment:** ⚠️ Production deployment is currently paused. The system is optimized for **local development and localhost demo** only.

---

## 🏗️ Architecture Overview

NeuroSense uses a **two-service architecture**:

| Service        | Tech                        | Port   | Purpose                                                                                                                                 |
| -------------- | --------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **backend**    | Node.js / Express / MongoDB | `5000` | Auth, user management, sessions, API gateway, screening proxy persistence, dashboard history, PDF reporting, specialist recommendations |
| **ml-service** | Python / FastAPI / SQLite   | `8001` | ML model inference for dementia screening                                                                                               |

The Node.js backend calls the Python ML service over HTTP (`POST http://ml-service:8001/api/screening/predict`) when a screening is requested.  
Inside Docker Compose the services resolve each other via Docker DNS names (`mongodb`, `ml-service`); outside of Docker use `localhost`.

---

## 📂 ML Service Structure

```
ml-service/
├── app/
│   ├── __init__.py
│   ├── main.py              ← FastAPI entry point
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py         ← Pydantic Settings (env vars)
│   │   ├── security.py       ← x-api-key guard for screening endpoints
│   │   ├── database.py       ← SQLAlchemy engine/session/init
│   │   └── audio_processor.py ← Vosk STT + acoustic marker extraction
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── screening.py      ← /health, /predict, /predict-audio
│   │   └── users.py          ← user APIs (role-ready scaffolding)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── ml_model.py       ← Model loading + inference
│   │   ├── base.py           ← SQLAlchemy declarative base
│   │   └── user.py           ← user model + role enum
│   └── schemas/
│       ├── __init__.py
│       ├── screening.py      ← Request / Response Pydantic models
│       └── user.py           ← user schema models
├── trained_models/
│   ├── vosk_model/
│   │   └── README.md         ← instructions to download vosk-model-small-en-us
│   └── (dementia .pkl model files)
├── requirements.txt
├── .env / .env.example
└── context.md                ← YOU ARE HERE
```

---

## 🔧 Environment Variables (`.env`)

### ml-service/.env

| Variable          | Local Demo Value                                            | Description                                |
| ----------------- | ----------------------------------------------------------- | ------------------------------------------ |
| `ML_SERVICE_PORT` | `8001`                                                      | Port the ML service listens on             |
| `DEBUG`           | `true`                                                      | Enable debug logging                       |
| `MODEL_PATH`      | `./trained_models/dementia_model.pkl`                       | Path to the serialised ML model            |
| `VOSK_MODEL_PATH` | `./trained_models/vosk_model`                               | Path to local offline Vosk model           |
| `ALLOWED_ORIGINS` | `http://localhost:5000,http://localhost:3000,http://localhost:5173` | CORS origins (comma-separated)       |
| `SECRET_KEY`      | `local-demo-secret-key-123`                                 | Shared API key for screening routes        |
| `DATABASE_URL`    | `sqlite:///./ml_service_local.db`                           | SQLite for local dev (no Postgres needed)  |

### backend/.env

| Variable              | Local Demo Value                                          | Description                                |
| --------------------- | --------------------------------------------------------- | ------------------------------------------ |
| `NODE_ENV`            | `development`                                             | Node environment mode                      |
| `PORT`                | `5000`                                                    | Express server port                        |
| `MONGO_URI`           | `mongodb://mongodb:27017/neurosense_local`                | MongoDB via Docker Compose service name    |
| `ML_PREDICT_URL`      | `http://ml-service:8001/api/screening/predict`            | ML proxy target (Docker DNS)               |
| `ML_SERVICE_API_KEY`  | `local-demo-secret-key-123`                               | Must match ml-service `SECRET_KEY`         |
| `CLIENT_URL`          | `http://localhost:5173`                                   | Frontend origin for CORS                   |
| `GOOGLE_CLIENT_ID`    | `dummy_client_id`                                         | Placeholder — not used in local demo       |
| `GOOGLE_CLIENT_SECRET`| `dummy_client_secret`                                     | Placeholder — not used in local demo       |

---

## 🚀 Quick Start

```bash
cd ml-service
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --port 8001 --reload
```

- Swagger docs: `http://localhost:8001/docs`
- Health check: `GET http://localhost:8001/`
- Screening health: `GET http://localhost:8001/api/screening/health`
- Predict: `POST http://localhost:8001/api/screening/predict`

---

## 📡 API Endpoints

### `GET /`

Root health check → `{"status": "ok", "service": "neurosense-ml"}`

### `GET /api/screening/health`

Service-specific health check.

### `POST /api/screening/predict`

**Request body:**

```json
{
  "patient_id": "60d5ec49f1b2c72b7c8e4a3b",
  "age": 72,
  "gender": "female",
  "mmse_score": 22,
  "cdr_score": 1.0,
  "moca_score": 18,
  "education_years": 12,
  "family_history": true,
  "physical_activity_level": "low"
}
```

**Response:**

```json
{
  "patient_id": "60d5ec49f1b2c72b7c8e4a3b",
  "risk_score": 0.42,
  "risk_level": "moderate",
  "confidence": 0.0,
  "model_version": "0.1.0-placeholder"
}
```

> `confidence: 0.0` means the placeholder model is active (no trained model file found).

---

## 🧠 ML Model (Placeholder Mode)

The service now includes a training script and a generated model artifact at:

- `trained_models/dementia_model.pkl`

When `MODEL_PATH` points to this file, `ml_model.py` uses the trained RandomForest model (`predict_proba`) with both cognitive and acoustic features. If the model file is missing, the service falls back to a deterministic placeholder score for development continuity.

To deploy a real model:

1. Train a scikit-learn classifier with `predict_proba` support
2. Serialize it via `pickle.dump(model, open("dementia_model.pkl", "wb"))`
3. Place it at the path specified by `MODEL_PATH`
4. Restart the service — it auto-loads the real model

### Training pipeline currently in repo

- Script: `ml-service/scripts/train_model.py`
- Generates synthetic dataset: 2000 rows (>=1500 requirement)
- Features used for training:
  - `age`
  - `mmse_score`
  - `cdr_score`
  - `moca_score`
  - `education_years`
  - `speech_rate`
  - `number_of_pauses`
  - `pitch_variation`
- Target label: `diagnosis` (`0`/`1`)
- Model type: `RandomForestClassifier` (supports `predict_proba`)
- Output artifact: `trained_models/dementia_model.pkl`

---

## 🗂️ Node.js Backend Changes

### 1) User roles

`"doctor"` is included in the user role enum in `backend/models/User.js`.

### 2) Result Visualization Module (new)

#### New backend files

- `backend/models/PredictionResult.js`
- `backend/routes/dashboard.js`
- `backend/routes/reports.js`
- `backend/middleware/ensureAuth.js`

#### Updated backend files

- `backend/server.js` (mounted new routes)
- `backend/routes/auth.js` (reused shared auth middleware)
- `backend/package.json` + `backend/package-lock.json` (added `pdfkit`)

### 3) New API Endpoints

#### `GET /api/dashboard/history`

- Auth required (session via Passport)
- Fetches all `PredictionResult` documents for `req.user._id`
- Sorted by date ascending (`predictionDate`, then `createdAt`) for trend charting
- Response shape includes:
  - `trend[]`: chart-ready points (`timestamp`, `isoDate`, `riskScore`, `riskPercent`, `riskLevel`, test snippets)
  - `chart.labels[]` + `chart.datasets[0].data[]` for direct React chart integration
  - `latest` and `totalResults`

#### `GET /api/reports/download/:id`

- Auth required
- Fetches one `PredictionResult` owned by authenticated user
- Returns downloadable PDF (`application/pdf`) generated with `pdfkit`
- Report includes:
  - patient/account information
  - risk score summary
  - cognitive test summary (MMSE/CDR/MoCA + contextual factors)
  - clinical notes
  - standard medical disclaimers

### 4) New Mongo Model: `PredictionResult`

Collection schema supports report/dashboard use cases:

- `user` (ObjectId ref `User`)
- `patientId`
- `riskScore` (0..1), `riskLevel`, `confidence`, `modelVersion`
- `cognitiveTests`:
  - `mmseScore`, `cdrScore`, `mocaScore`
  - `educationYears`, `familyHistory`, `physicalActivityLevel`
- `predictionDate`, `notes`
- auto timestamps (`createdAt`, `updatedAt`)

### 5) Dependency changes

- Added backend dependency: `pdfkit`

### 6) Recommendation System Module (new)

#### New backend file

- `backend/routes/recommendations.js`

#### Updated backend file

- `backend/server.js` (mounted recommendations route)

#### New API Endpoint

##### `GET /api/recommendations/specialists`

- Accepts query params: `latitude`, `longitude` (also supports `lat`, `lng` aliases)
- Searches nearby care options for:
  - neurologist
  - geriatric psychiatrist
  - dementia care
- Uses Google Places API when API key exists:
  - nearby search for each specialist keyword
  - place details lookup for address/phone/website/maps link
- Auto-fallback to mock recommendations when API key is missing or Google lookup fails
- Returns frontend-friendly list with:
  - `name`
  - `address`
  - `distanceKm`
  - `contact` (phone, website, maps URL)
  - optional metadata (`rating`, `isOpenNow`, `category`)

#### Configuration

- Optional env vars for recommendations:
  - `GOOGLE_MAPS_API_KEY` (or `GOOGLE_PLACES_API_KEY`)
  - `RECOMMENDATION_RADIUS_METERS` (defaults to `12000`)

### 7) Screening Proxy + Persistence Module (new)

#### New backend file

- `backend/routes/screening.js`

#### Updated backend file

- `backend/server.js` (mounted screening route)

#### New API Endpoint

##### `POST /api/screening/run`

- Protected by `ensureAuth` middleware
- Forwards request body to FastAPI endpoint:
  - `http://localhost:8001/api/screening/predict` (or `ML_PREDICT_URL` env override)
- Supports incoming camelCase and snake_case payload keys from frontend
- Maps ML response (`risk_score`, `risk_level`, `confidence`, `model_version`) and request cognitive fields into `PredictionResult`
- Persists and returns the saved `PredictionResult` document

#### Configuration

- Optional env vars for screening proxy:
  - `ML_PREDICT_URL` (default: `http://localhost:8001/api/screening/predict`)
  - `ML_REQUEST_TIMEOUT_MS` (default: `15000`)

### 8) Docker Compose Local Dev (updated)

#### Files

- `docker-compose.yml` (project root) — **local demo only**
- `docker-compose.prod.yml` — **deleted** (production deployment paused)
- `backend/Dockerfile`
- `ml-service/Dockerfile`

#### Compose services

| Service        | Image / Build         | Port          | Data Store                     |
| -------------- | --------------------- | ------------- | ------------------------------ |
| `mongodb`      | `mongo:7`             | `27017:27017` | Docker volume `mongodb_data`   |
| `backend`      | builds `./backend`    | `5000:5000`   | MongoDB (via `mongodb` service)|
| `ml-service`   | builds `./ml-service` | `8001:8001`   | SQLite (file inside container) |

#### Configuration approach

- Both `backend` and `ml-service` use `env_file:` directives pointing to their respective `.env` files — **no inline `environment:` blocks**.
- This means the `.env` files are the single source of truth for all configuration.

#### Critical container-network configuration

- Backend `.env` sets `ML_PREDICT_URL=http://ml-service:8001/api/screening/predict` and `MONGO_URI=mongodb://mongodb:27017/neurosense_local`.
- Docker DNS resolves `ml-service` and `mongodb` to the correct containers on the internal network.

### 9) Security + Testing Updates (new)

#### ML API key enforcement

#### New file

- `ml-service/app/core/security.py`

#### Updated file

- `ml-service/app/routes/screening.py`

#### Behavior

- `POST /api/screening/predict` and `POST /api/screening/predict-audio` now require header `x-api-key`.
- Expected key is read from `SECRET_KEY` in ml-service config.

#### Backend proxy header forwarding

#### Updated file

- `backend/routes/screening.js`

#### Behavior

- Node screening proxy now forwards API key to ml-service via `x-api-key` header.
- Key source in backend env: `ML_SERVICE_API_KEY` (fallback `SECRET_KEY`).

#### Testing framework setup

#### New files

- `backend/jest.config.js`
- `backend/tests/recommendations.test.js`
- `backend/tests/screening.test.js`

#### Updated backend file

- `backend/package.json` (`jest` + `supertest`, test script)

#### Test coverage added

- Verifies `/api/recommendations/specialists` returns mock results when API key is missing.
- Mocks Google Places call and verifies fallback to mock results when key is invalid (`REQUEST_DENIED`).
- Verifies `/api/screening/run` success path maps ML response and persists normalized data to `PredictionResult`.
- Verifies `/api/screening/run` timeout path returns gateway timeout/service unavailable handling without crashing.
- Verifies `/api/screening/run` upstream ML 500 path is handled cleanly and returned as proxy-safe failure.

### 10) Speech Analysis Module (Vosk Offline) (new)

#### New/updated ml-service files

- `ml-service/app/core/audio_processor.py`
- `ml-service/trained_models/vosk_model/README.md`
- `ml-service/requirements.txt`
- `ml-service/.env`
- `ml-service/app/core/config.py`

#### Dependency updates

- Added `vosk==0.3.45` for offline speech-to-text.
- Added `pydub==0.25.1` for audio format conversion before transcription.
- Confirmed `librosa` and `soundfile` are included for acoustic analysis.

#### Core speech analysis functions

- `transcribe_audio(file_path)`:
  - loads Vosk model from `VOSK_MODEL_PATH`
  - converts non-standard input into mono 16kHz WAV when needed
  - performs offline transcript generation
- `extract_acoustic_features(file_path)`:
  - computes `speech_rate` (estimated syllables/minute)
  - computes `number_of_pauses` (silences longer than 0.5s)
  - computes `pitch_variation` (variance of fundamental frequency)
- `analyze_speech(file_path)`:
  - runs both transcription and acoustic extraction
  - returns combined output in a dictionary:
    - `transcript`
    - `acoustic_features`

#### Model folder setup

- Created `trained_models/vosk_model/` and added download/setup instructions.
- Model expected: `vosk-model-small-en-us` extracted in that directory.

### 11) Model Training + Deployment (new)

#### New file

- `ml-service/scripts/train_model.py`

#### Updated files

- `ml-service/app/models/ml_model.py`
- `ml-service/requirements.txt`

#### Produced artifact

- `ml-service/trained_models/dementia_model.pkl`

#### Inference alignment

- `ml_model.py` now builds prediction input with cognitive + acoustic features:
  - age, mmse_score, cdr_score, moca_score, education_years
  - speech_rate, number_of_pauses, pitch_variation
- Supports acoustic fields from either top-level JSON or nested `audio` payload.
- Uses `predict_proba` when the trained model is available.

### 12) Screening Audit Trail Logging (new)

#### New backend file

- `backend/models/ScreeningAuditLog.js`

#### Updated backend file

- `backend/routes/screening.js`

#### Behavior

- Every `POST /api/screening/run` request now writes an audit log record, regardless of success or failure.
- Audit log captures:
  - `userId`
  - `patientId`
  - `requestPayload` (raw payload sent to ML service)
  - `responsePayload` (raw payload returned by ML service, if any)
  - `statusCode` (final backend response status)
  - `latencyMs` (measured around the ML proxy call)
  - `errorMessage` (timeout/upstream error details when applicable)
- Logging is performed in a `try/catch/finally` flow so the write is attempted before returning a response for all code paths.

### 13) ml-service API Endpoint Tests (new)

#### New test files

- `ml-service/tests/__init__.py`
- `ml-service/tests/test_screening_api.py`

#### Updated file

- `ml-service/requirements.txt` (added `pytest`; `httpx` already present)

#### Coverage added

- `GET /api/screening/health` returns `200`.
- `POST /api/screening/predict` returns auth failure (`401`/`403`) when `x-api-key` is missing.
- `POST /api/screening/predict` returns `200` with valid `x-api-key` and screening payload.
- `POST /api/screening/predict-audio` accepts multipart upload (`audio` + `metadata`) and returns `200` with valid `x-api-key`.

#### Notes

- Tests use `fastapi.testclient.TestClient` against the FastAPI app.
- Startup DB initialization is overridden in tests to avoid external DB dependency during endpoint checks.
- Audio processing is monkeypatched in tests for deterministic endpoint validation.

### 14) ml-service Core Unit Tests (new)

#### New test files

- `ml-service/tests/test_audio_processor.py`
- `ml-service/tests/test_ml_model.py`

#### Coverage added

- `extract_acoustic_features` unit test:
  - generates a 1-second sine wave via `numpy`
  - writes WAV to a temporary file via `soundfile`
  - validates returned marker keys: `speech_rate`, `number_of_pauses`, `pitch_variation`
  - stubs Vosk dependencies to avoid model-file requirement in unit tests
- `predict` unit test in `ml_model.py`:
  - builds `ScreeningRequest` schema payload with cognitive fields
  - adds mock acoustic fields in `audio` payload
  - validates inference output always includes numeric `risk_score` and string `risk_level`
  - works whether model path resolves to trained `.pkl` or placeholder logic

#### Current ml-service test run status

- `pytest tests -q -p no:cacheprovider` passes (`6 passed`).

---

## 📋 Completed

- [x] Train and deploy a dementia prediction model
- [x] Add a Node.js screening proxy route to FastAPI and persist responses in `PredictionResult`
- [x] Add tests for recommendation endpoint (Google + mock fallback paths)
- [x] Add tests for screening proxy success/error/timeouts and persistence mapping
- [x] Add offline speech analysis core module (Vosk + acoustic markers)
- [x] Add authentication middleware to the ML service (API key header)
- [x] Add database logging for screening results
- [x] Docker-compose for multi-service local dev
- [x] Unit + integration tests
- [x] Clean up environment for local-only demo (SQLite, Docker MongoDB, dummy OAuth)
- [x] Remove production compose file (deployment paused)

---

## 🚧 Paused / Future

- [ ] Production deployment (cloud hosting, managed Postgres, real OAuth credentials)
- [ ] Frontend integration with screening API
- [ ] End-to-end demo recording
