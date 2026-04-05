const mongoose = require("mongoose");

const cognitiveTestSchema = new mongoose.Schema(
  {
    mmseScore: { type: Number, min: 0, max: 30, default: null },
    cdrScore: { type: Number, min: 0, max: 3, default: null },
    mocaScore: { type: Number, min: 0, max: 30, default: null },
    educationYears: { type: Number, min: 0, default: null },
    familyHistory: { type: Boolean, default: null },
    physicalActivityLevel: {
      type: String,
      enum: ["low", "moderate", "high"],
      default: null,
    },
  },
  { _id: false },
);

const predictionResultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    patientId: { type: String, trim: true, default: "" },
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    riskLevel: {
      type: String,
      enum: ["low", "moderate", "high"],
      required: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    modelVersion: {
      type: String,
      trim: true,
      default: "unknown",
    },
    cognitiveTests: {
      type: cognitiveTestSchema,
      default: () => ({}),
    },
    predictionDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

predictionResultSchema.index({ user: 1, predictionDate: 1 });

module.exports = mongoose.model("PredictionResult", predictionResultSchema);
