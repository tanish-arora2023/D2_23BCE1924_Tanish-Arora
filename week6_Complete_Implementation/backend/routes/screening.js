const router = require("express").Router();
const multer = require("multer");

const ensureAuth = require("../middleware/ensureAuth");
const PredictionResult = require("../models/PredictionResult");
const ScreeningAuditLog = require("../models/ScreeningAuditLog");

const ML_PREDICT_URL =
  process.env.ML_PREDICT_URL || "http://localhost:8001/api/screening/predict";
const ML_REQUEST_TIMEOUT_MS =
  Number(process.env.ML_REQUEST_TIMEOUT_MS) || 15000;
const ML_SERVICE_API_KEY =
  process.env.ML_SERVICE_API_KEY || process.env.SECRET_KEY || "";
const ML_MAX_AUDIO_FILE_BYTES =
  Number(process.env.ML_MAX_AUDIO_FILE_BYTES) || 20 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: ML_MAX_AUDIO_FILE_BYTES,
  },
});

const parseAudioUpload = (req, res, next) => {
  upload.single("audio")(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: `Audio file is too large. Max size is ${ML_MAX_AUDIO_FILE_BYTES} bytes.`,
      });
    }

    return res.status(400).json({
      message: "Invalid audio upload payload.",
    });
  });
};

const getFirstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null);

const toNumberOrUndefined = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toNumberOrNull = (value) => {
  const parsed = toNumberOrUndefined(value);
  return parsed === undefined ? null : parsed;
};

const toBooleanOrNull = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
};

const toActivityLevelOrNull = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return ["low", "moderate", "high"].includes(normalized) ? normalized : null;
};

const omitUndefined = (object) =>
  Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined),
  );

const buildMlPayload = (body) =>
  omitUndefined({
    patient_id: getFirstDefined(body.patient_id, body.patientId),
    age: toNumberOrUndefined(body.age),
    gender: getFirstDefined(body.gender),
    mmse_score: toNumberOrUndefined(
      getFirstDefined(body.mmse_score, body.mmseScore),
    ),
    cdr_score: toNumberOrUndefined(
      getFirstDefined(body.cdr_score, body.cdrScore),
    ),
    moca_score: toNumberOrUndefined(
      getFirstDefined(body.moca_score, body.mocaScore),
    ),
    education_years: toNumberOrUndefined(
      getFirstDefined(body.education_years, body.educationYears),
    ),
    family_history:
      toBooleanOrNull(
        getFirstDefined(body.family_history, body.familyHistory),
      ) ?? undefined,
    physical_activity_level: toActivityLevelOrNull(
      getFirstDefined(body.physical_activity_level, body.physicalActivityLevel),
    ),
  });

const parsePredictionDate = (body) => {
  const rawDate = getFirstDefined(body.predictionDate, body.prediction_date);
  if (!rawDate) return undefined;

  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) return undefined;
  return parsedDate;
};

const parseStructuredField = (rawValue, fieldName) => {
  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_error) {
    const error = new Error(`Invalid ${fieldName} JSON payload.`);
    error.status = 400;
    throw error;
  }
};

const buildRequestBody = (req) => {
  const body = req.body || {};
  const contentType = (req.headers["content-type"] || "").toLowerCase();
  const isMultipart = contentType.includes("multipart/form-data");

  if (!isMultipart) {
    return body;
  }

  const cognitivePayload = parseStructuredField(
    body.cognitiveData,
    "cognitiveData",
  );
  const metadataPayload = parseStructuredField(body.metadata, "metadata");
  const mergedBody = {
    ...body,
    ...cognitivePayload,
    ...metadataPayload,
  };

  delete mergedBody.cognitiveData;
  delete mergedBody.metadata;

  return mergedBody;
};

const buildMlRequest = (req, mlPayload) => {
  const headers = {};
  if (ML_SERVICE_API_KEY) {
    headers["x-api-key"] = ML_SERVICE_API_KEY;
  }

  const hasAudio =
    req.file && Buffer.isBuffer(req.file.buffer) && req.file.buffer.length > 0;

  if (!hasAudio) {
    headers["Content-Type"] = "application/json";
    return {
      headers,
      body: JSON.stringify(mlPayload),
      hasAudio: false,
    };
  }

  const formData = new FormData();
  formData.append("metadata", JSON.stringify(mlPayload));

  const fileName = req.file.originalname || "speech.webm";
  const mimeType = req.file.mimetype || "application/octet-stream";
  const audioBlob = new Blob([req.file.buffer], { type: mimeType });
  formData.append("audio", audioBlob, fileName);

  return {
    headers,
    body: formData,
    hasAudio: true,
  };
};

router.post("/run", ensureAuth, parseAudioUpload, async (req, res) => {
  const requestBody = buildRequestBody(req);
  const mlPayload = buildMlPayload(requestBody);
  const mlRequest = buildMlRequest(req, mlPayload);
  const auditEntry = {
    userId: req.user?._id || null,
    patientId:
      getFirstDefined(
        mlPayload.patient_id,
        requestBody.patient_id,
        requestBody.patientId,
      ) || "",
    requestPayload: {
      ...mlPayload,
      hasAudio: mlRequest.hasAudio,
    },
    responsePayload: null,
    statusCode: 500,
    latencyMs: null,
    errorMessage: null,
  };

  let responseStatus = 500;
  let responseBody = { message: "Failed to run screening." };

  try {
    const controller = new AbortController();
    const proxyCallStartedAt = Date.now();
    const timeoutId = setTimeout(
      () => controller.abort(),
      ML_REQUEST_TIMEOUT_MS,
    );

    let mlResponse;
    try {
      mlResponse = await fetch(ML_PREDICT_URL, {
        method: "POST",
        headers: mlRequest.headers,
        body: mlRequest.body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
      auditEntry.latencyMs = Date.now() - proxyCallStartedAt;
    }

    if (!mlResponse.ok) {
      let details;
      try {
        details = await mlResponse.json();
      } catch (_error) {
        details = { message: "Unable to parse ML error response." };
      }

      auditEntry.responsePayload = details;
      auditEntry.errorMessage = `ML service returned status ${mlResponse.status}`;

      responseStatus = mlResponse.status >= 500 ? 502 : mlResponse.status;
      responseBody = {
        message: "ML service rejected screening request.",
        details,
      };
    } else {
      const prediction = await mlResponse.json();
      auditEntry.responsePayload = prediction;

      const riskScore = toNumberOrUndefined(
        getFirstDefined(prediction.risk_score, prediction.riskScore),
      );
      const riskLevel = getFirstDefined(
        prediction.risk_level,
        prediction.riskLevel,
      );

      if (riskScore === undefined || typeof riskLevel !== "string") {
        auditEntry.errorMessage =
          "ML service response is missing required risk fields.";

        responseStatus = 502;
        responseBody = {
          message: "ML service response is missing required risk fields.",
          details: prediction,
        };
      } else {
        const savedResult = await PredictionResult.create({
          user: req.user._id,
          patientId:
            getFirstDefined(
              prediction.patient_id,
              prediction.patientId,
              requestBody.patient_id,
              requestBody.patientId,
            ) || "",
          riskScore,
          riskLevel: String(riskLevel).toLowerCase(),
          confidence: toNumberOrNull(
            getFirstDefined(prediction.confidence, prediction.model_confidence),
          ),
          modelVersion:
            getFirstDefined(
              prediction.model_version,
              prediction.modelVersion,
            ) || "unknown",
          cognitiveTests: {
            mmseScore: toNumberOrNull(
              getFirstDefined(requestBody.mmseScore, requestBody.mmse_score),
            ),
            cdrScore: toNumberOrNull(
              getFirstDefined(requestBody.cdrScore, requestBody.cdr_score),
            ),
            mocaScore: toNumberOrNull(
              getFirstDefined(requestBody.mocaScore, requestBody.moca_score),
            ),
            educationYears: toNumberOrNull(
              getFirstDefined(
                requestBody.educationYears,
                requestBody.education_years,
              ),
            ),
            familyHistory: toBooleanOrNull(
              getFirstDefined(
                requestBody.familyHistory,
                requestBody.family_history,
              ),
            ),
            physicalActivityLevel: toActivityLevelOrNull(
              getFirstDefined(
                requestBody.physicalActivityLevel,
                requestBody.physical_activity_level,
              ),
            ),
          },
          predictionDate: parsePredictionDate(requestBody),
          notes:
            typeof requestBody.notes === "string"
              ? requestBody.notes.trim()
              : "",
        });

        responseStatus = 201;
        responseBody = savedResult;
      }
    }
  } catch (error) {
    if (error.status === 400) {
      auditEntry.errorMessage = error.message;
      responseStatus = 400;
      responseBody = { message: error.message };
    } else if (error.name === "AbortError") {
      auditEntry.errorMessage =
        "ML service timed out while processing screening request.";
      responseStatus = 504;
      responseBody = {
        message: "ML service timed out while processing screening request.",
      };
    } else {
      auditEntry.errorMessage = error.message;
      console.error("Screening proxy error:", error);
      responseStatus = 500;
      responseBody = { message: "Failed to run screening." };
    }
  } finally {
    auditEntry.statusCode = responseStatus;

    if (auditEntry.latencyMs === null) {
      auditEntry.latencyMs = 0;
    }

    try {
      await ScreeningAuditLog.create(auditEntry);
    } catch (auditError) {
      console.error("Screening audit log write failed:", auditError);
    }
  }

  return res.status(responseStatus).json(responseBody);
});

module.exports = router;
