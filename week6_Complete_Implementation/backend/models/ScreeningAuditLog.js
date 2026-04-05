const mongoose = require("mongoose");

const screeningAuditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },
    patientId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    requestPayload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: () => ({}),
    },
    responsePayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    statusCode: {
      type: Number,
      required: true,
      min: 100,
      max: 599,
    },
    latencyMs: {
      type: Number,
      min: 0,
      default: 0,
    },
    errorMessage: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

screeningAuditLogSchema.index({ userId: 1, createdAt: -1 });
screeningAuditLogSchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model("ScreeningAuditLog", screeningAuditLogSchema);
