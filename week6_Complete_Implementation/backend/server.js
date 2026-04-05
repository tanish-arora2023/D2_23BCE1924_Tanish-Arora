// ──────────────────────────────────────────────
// NeuroScreen Backend — Entry Point
// ──────────────────────────────────────────────
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const cors = require("cors");
const { MongoStore } = require("connect-mongo");
const connectDB = require("./config/db");

// Load passport strategies
require("./config/passport");

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const CLIENT_URL =
  process.env.CLIENT_URL || (isProduction ? null : "http://localhost:5173");
const SESSION_SECRET =
  process.env.SESSION_SECRET || (isProduction ? null : "dev-secret-change-me");

if (isProduction && !CLIENT_URL) {
  throw new Error("CLIENT_URL must be set in production.");
}

if (isProduction && !SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set in production.");
}

// ─── Connect to MongoDB ─────────────────────
connectDB();

// ─── Global Middleware ───────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true, // allow cookies / session id
  }),
);

// ─── Session ─────────────────────────────────
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      ttl: 24 * 60 * 60, // 1 day (seconds)
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day (ms)
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    },
  }),
);

// ─── Passport ────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ─── Routes ──────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/screening", require("./routes/screening"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/recommendations", require("./routes/recommendations"));

// Health-check
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() }),
);

// ─── 404 catch-all ───────────────────────────
app.use((_req, res) => res.status(404).json({ message: "Route not found." }));

// ─── Global error handler ────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    message: isProduction ? "Internal server error." : err.message,
  });
});

// ─── Start ───────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
