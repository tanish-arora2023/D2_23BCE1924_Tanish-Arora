const express = require("express");
const request = require("supertest");

jest.mock("../middleware/ensureAuth", () => (req, res, next) => {
  req.user = { _id: "507f1f77bcf86cd799439011" };
  next();
});

jest.mock("../models/PredictionResult", () => ({
  create: jest.fn(),
}));

jest.mock("../models/ScreeningAuditLog", () => ({
  create: jest.fn(),
}));

const PredictionResult = require("../models/PredictionResult");
const ScreeningAuditLog = require("../models/ScreeningAuditLog");
const screeningRouter = require("../routes/screening");

const ENDPOINT = "/api/screening/run";

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/screening", screeningRouter);
  return app;
};

describe("POST /api/screening/run", () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    PredictionResult.create.mockReset();
    ScreeningAuditLog.create.mockReset();
    ScreeningAuditLog.create.mockResolvedValue({ _id: "audit-001" });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.fetch;
  });

  it("proxies successfully and persists mapped prediction result", async () => {
    const mlPayload = {
      patient_id: "patient-123",
      risk_score: 0.81,
      risk_level: "HIGH",
      confidence: 0.93,
      model_version: "1.0.0-rf-synth",
    };

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mlPayload),
    });

    PredictionResult.create.mockResolvedValue({
      _id: "pred-001",
      patientId: "patient-123",
      riskScore: 0.81,
      riskLevel: "high",
      confidence: 0.93,
      modelVersion: "1.0.0-rf-synth",
    });

    const requestBody = {
      patientId: "patient-123",
      age: 72,
      gender: "female",
      mmseScore: 22,
      cdrScore: 1,
      mocaScore: 18,
      educationYears: 12,
      familyHistory: true,
      physicalActivityLevel: "moderate",
      predictionDate: "2026-04-05T10:00:00.000Z",
      notes: "  Needs follow-up  ",
    };

    const response = await request(app).post(ENDPOINT).send(requestBody);

    expect(response.status).toBe(201);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, fetchOptions] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/screening\/predict$/);
    expect(fetchOptions).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        signal: expect.any(Object),
      }),
    );

    expect(JSON.parse(fetchOptions.body)).toEqual({
      patient_id: "patient-123",
      age: 72,
      gender: "female",
      mmse_score: 22,
      cdr_score: 1,
      moca_score: 18,
      education_years: 12,
      family_history: true,
      physical_activity_level: "moderate",
    });

    expect(PredictionResult.create).toHaveBeenCalledTimes(1);

    const savedDoc = PredictionResult.create.mock.calls[0][0];
    expect(savedDoc).toEqual(
      expect.objectContaining({
        user: "507f1f77bcf86cd799439011",
        patientId: "patient-123",
        riskScore: 0.81,
        riskLevel: "high",
        confidence: 0.93,
        modelVersion: "1.0.0-rf-synth",
        notes: "Needs follow-up",
      }),
    );

    expect(savedDoc.predictionDate).toBeInstanceOf(Date);
    expect(savedDoc.cognitiveTests).toEqual({
      mmseScore: 22,
      cdrScore: 1,
      mocaScore: 18,
      educationYears: 12,
      familyHistory: true,
      physicalActivityLevel: "moderate",
    });

    expect(response.body).toMatchObject({
      _id: "pred-001",
      patientId: "patient-123",
      riskScore: 0.81,
      riskLevel: "high",
    });

    expect(ScreeningAuditLog.create).toHaveBeenCalledTimes(1);
    const auditDoc = ScreeningAuditLog.create.mock.calls[0][0];
    expect(auditDoc).toEqual(
      expect.objectContaining({
        userId: "507f1f77bcf86cd799439011",
        patientId: "patient-123",
        statusCode: 201,
        requestPayload: expect.objectContaining({
          patient_id: "patient-123",
          age: 72,
          gender: "female",
          mmse_score: 22,
          cdr_score: 1,
          moca_score: 18,
          education_years: 12,
          family_history: true,
          physical_activity_level: "moderate",
          hasAudio: false,
        }),
        responsePayload: mlPayload,
        errorMessage: null,
      }),
    );
    expect(auditDoc.latencyMs).toEqual(expect.any(Number));
  });

  it("accepts multipart payload and forwards metadata + audio to ML service", async () => {
    const mlPayload = {
      patient_id: "patient-audio-001",
      risk_score: 0.44,
      risk_level: "moderate",
      confidence: 0.71,
      model_version: "1.0.0-rf-synth",
    };

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mlPayload),
    });

    PredictionResult.create.mockResolvedValue({
      _id: "pred-audio-001",
      patientId: "patient-audio-001",
      riskScore: 0.44,
      riskLevel: "moderate",
      confidence: 0.71,
      modelVersion: "1.0.0-rf-synth",
    });

    const metadata = {
      patient_id: "patient-audio-001",
      age: 70,
      gender: "female",
      mmse_score: 23,
      cdr_score: 0.5,
      moca_score: 20,
      education_years: 14,
      family_history: false,
      physical_activity_level: "moderate",
    };

    const response = await request(app)
      .post(ENDPOINT)
      .field("metadata", JSON.stringify(metadata))
      .attach("audio", Buffer.from("dummy-audio"), {
        filename: "sample.webm",
        contentType: "audio/webm",
      });

    expect(response.status).toBe(201);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, fetchOptions] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/screening\/predict$/);
    expect(fetchOptions.method).toBe("POST");
    expect(fetchOptions.signal).toEqual(expect.any(Object));
    expect(fetchOptions.headers["Content-Type"]).toBeUndefined();
    expect(fetchOptions.body).toEqual(expect.any(FormData));
    expect(fetchOptions.body.get("metadata")).toBe(JSON.stringify(metadata));
    expect(fetchOptions.body.get("audio")).toBeTruthy();

    expect(ScreeningAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: "patient-audio-001",
        statusCode: 201,
        requestPayload: expect.objectContaining({
          patient_id: "patient-audio-001",
          hasAudio: true,
        }),
      }),
    );
  });

  it("returns timeout status when ML service request aborts", async () => {
    const timeoutError = new Error("request timed out");
    timeoutError.name = "AbortError";
    global.fetch.mockRejectedValue(timeoutError);

    const response = await request(app).post(ENDPOINT).send({
      patientId: "patient-timeout",
      age: 68,
      gender: "male",
    });

    expect([503, 504]).toContain(response.status);
    expect(response.body.message).toMatch(/timed out/i);
    expect(PredictionResult.create).not.toHaveBeenCalled();

    expect(ScreeningAuditLog.create).toHaveBeenCalledTimes(1);
    expect(ScreeningAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "507f1f77bcf86cd799439011",
        patientId: "patient-timeout",
        statusCode: 504,
        responsePayload: null,
        errorMessage: expect.stringMatching(/timed out/i),
      }),
    );
  });

  it("handles ML service 500 errors without crashing", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({ detail: "Internal Server Error" }),
    });

    const response = await request(app).post(ENDPOINT).send({
      patientId: "patient-ml-error",
      age: 70,
      gender: "female",
    });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      message: "ML service rejected screening request.",
      details: { detail: "Internal Server Error" },
    });
    expect(PredictionResult.create).not.toHaveBeenCalled();

    expect(ScreeningAuditLog.create).toHaveBeenCalledTimes(1);
    expect(ScreeningAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "507f1f77bcf86cd799439011",
        patientId: "patient-ml-error",
        statusCode: 502,
        responsePayload: { detail: "Internal Server Error" },
        errorMessage: expect.stringMatching(/status 500/i),
      }),
    );
  });
});
