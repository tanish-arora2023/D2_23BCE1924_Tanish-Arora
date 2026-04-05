# 🧠 NeuroSense

[![Status](https://img.shields.io/badge/Status-Local_Demo_Ready-brightgreen)](https://github.com/your-username/NeuroSense)

**NeuroSense** is a comprehensive, AI-powered dementia screening platform that merges classical cognitive test metadata with advanced acoustic speech feature extraction. By decoupling rigorous machine learning inference from web gateway persistence, it achieves high-performance risk scoring to aid clinical professionals.

---

## ✨ Key Features

- **🤖 AI-Powered Screening**: Computes probabilistic risk scores seamlessly using a pre-trained scikit-learn Random Forest model.
- **🎙️ Offline Speech Analysis**: Utilizes `Vosk` for completely offline, privacy-centric voice-to-text transcription, extracting critical diagnostic acoustic markers (speech rate, pause counts, pitch variation) without transmitting sensitive audio to the cloud.
- **📄 Downloadable Clinical Reports**: Automatically generates PDF diagnostic reports combining ML risk analysis, cognitive metrics, and clinical caveats via `pdfkit`.
- **🏥 Specialist Recommendations**: Leverages the Google Places API to dynamically suggest local neurologists, geriatric psychiatrists, and dementia care specialists based on patient geodata.
- **🛡️ Secure Gateway Protocol**: The Node.js proxy tunnel abstracts the ML REST API from the client, strictly utilizing `x-api-key` header verification behind the scenes.

---

## 🏗️ Architecture & Tech Stack

NeuroSense is built on a highly modular **3-Tier Architecture**:

1. **📱 Frontend (UI/Client)**: Collects user data and provides dynamic graphical reporting.
2. **🌉 Backend (API Gateway & DB)**: Manages authentication, persists session histories, generates PDFs, and orchestrates proxy tunnels to the ML module.
3. **🧠 ML-Service (Inference Engine)**: A stateless, math-heavy node handling model serving and audio feature transformations.

### Core Technologies
- **Frontend**: React 19, Vite, Tailwind CSS v4, Recharts, React Router v7.
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), Passport.js, PDFKit.
- **Machine Learning**: Python, FastAPI, Vosk (Offline STT), Scikit-Learn, Librosa.
- **Infrastructure**: Docker Compose (for the backend and ML-service logic).

---

## 📋 Prerequisites

Before running the project, assure you have the following installed on your machine:
- **Docker & Docker Compose**: Required to spin up the Mongoose DB, Backend, and FastAPI service containers seamlessly.
- **Node.js (v18+)**: Required if you plan to launch the frontend natively or need independent package management.
- **Python (v3.10+)**: Required for manual ML script manipulations or training custom datasets outside of Docker.

---

## 🚀 Quick Start (Local Deployment)

NeuroSense is optimized to spin up through a multi-container Docker cluster for the backend, alongside a natively run Vite dev server.

### 1. Start the Backend & ML Services

Open your terminal at the root of the project to orchestrate the backend operations:

```bash
# Clone the repository
git clone https://github.com/your-username/NeuroSense.git
cd NeuroSense

# Spin up the MongoDB, API gateway, and ML-service instances
docker-compose up --build
```
> **Note**: Verify everything running smoothly by visiting the ML Swagger documentation at `http://localhost:8001/docs`.

### 2. Launch the Frontend Dev Server

In a new terminal window, initialize your React interface:

```bash
# Navigate to the frontend directory
cd frontend

# Install the necessary dependencies
npm install

# Start the Vite development server
npm run dev
```
> The frontend application will be active at `http://localhost:5173`. 

---

## 📂 Project Structure

```text
NeuroSense/
├── frontend/             # Single-Page Application (React/Vite)
│   ├── src/              # Pages, contexts, components, routing
│   └── package.json      # Frontend dependencies
├── backend/              # Node.js API Gateway structure
│   ├── models/           # Mongoose schemas (User, PredictionResult, AuditLogs)
│   ├── routes/           # Auth, Screening Proxy, PDF Reporting, Dashboards
│   ├── tests/            # Jest + Supertest suites
│   └── Dockerfile.node   # Backend image build instructions
├── ml-service/           # FastAPI Machine Learning Microservice
│   ├── app/              # Routes, SQLlite integration, Vosk handlers
│   ├── trained_models/   # Dementia model .pkl + Vosk small model folders
│   ├── tests/            # Pytest test cases
│   └── Dockerfile.python # ML-Service image build instructions
├── docker-compose.yml    # Root-level multi-container orchestrator
└── context.md            # Extensive full-stack architecture deep-dive
```

---

*For an extensive deep-dive regarding API routing, database schema reasoning, and internal architectural logic, please refer to the project's internal [`context.md`](./context.md).*
