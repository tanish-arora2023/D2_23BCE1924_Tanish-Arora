const router = require("express").Router();

const ensureAuth = require("../middleware/ensureAuth");
const PredictionResult = require("../models/PredictionResult");

const formatTrendPoint = (result) => {
  const dateValue = result.predictionDate || result.createdAt;
  const isoDate = new Date(dateValue).toISOString();

  return {
    id: String(result._id),
    patientId: result.patientId || "",
    timestamp: new Date(dateValue).getTime(),
    isoDate,
    dateLabel: isoDate.slice(0, 10),
    riskScore: result.riskScore,
    riskPercent: Number((result.riskScore * 100).toFixed(2)),
    riskLevel: result.riskLevel,
    confidence: result.confidence,
    modelVersion: result.modelVersion,
    cognitiveTests: {
      mmseScore: result.cognitiveTests?.mmseScore ?? null,
      cdrScore: result.cognitiveTests?.cdrScore ?? null,
      mocaScore: result.cognitiveTests?.mocaScore ?? null,
    },
  };
};

router.get("/history", ensureAuth, async (req, res) => {
  try {
    const results = await PredictionResult.find({ user: req.user._id })
      .sort({ predictionDate: 1, createdAt: 1 })
      .lean();

    const trend = results.map(formatTrendPoint);
    const latest = trend.length > 0 ? trend[trend.length - 1] : null;

    return res.json({
      user: {
        id: String(req.user._id),
        name: req.user.name,
      },
      totalResults: trend.length,
      latest,
      trend,
      chart: {
        labels: trend.map((point) => point.dateLabel),
        datasets: [
          {
            key: "riskScore",
            label: "Dementia Risk Score",
            data: trend.map((point) => point.riskScore),
          },
        ],
      },
    });
  } catch (err) {
    console.error("Dashboard history error:", err);
    return res.status(500).json({ message: "Failed to fetch history." });
  }
});

module.exports = router;
