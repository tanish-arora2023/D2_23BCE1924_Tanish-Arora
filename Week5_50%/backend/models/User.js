const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ──────────────────────────────────────────────
// User Schema — supports Local, Google & GitHub auth
// ──────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    /* ── Common fields ── */
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    avatar: {
      type: String, // URL to profile picture (set by OAuth providers)
      default: "",
    },
    role: {
      type: String,
      enum: ["patient", "caregiver", "admin"],
      default: "patient",
    },

    /* ── Local auth (email + password) ── */
    password: {
      type: String,
      // Not required — OAuth users won't have a password
      select: false, // excluded from queries by default
    },

    /* ── Google OAuth ── */
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },

    /* ── GitHub OAuth ── */
    githubId: {
      type: String,
      sparse: true,
      unique: true,
    },

    /* ── Auth provider tracking ── */
    provider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  },
);

// ─── Hash password before saving (local auth only) ───
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

});

// ─── Compare candidate password against stored hash ───
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
