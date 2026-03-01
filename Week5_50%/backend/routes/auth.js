const router = require("express").Router();
const passport = require("passport");
const User = require("../models/User");

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ──────────────────────────────────────────────
// Helper: ensure the user is authenticated
// ──────────────────────────────────────────────
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ message: "Not authenticated." });
};

// ══════════════════════════════════════════════
//  LOCAL AUTH — Register & Login
// ══════════════════════════════════════════════

/**
 * POST /api/auth/register
 * Body: { name, email, password, role? }
 */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required." });
    }

    // Check for existing user
    const existing = await User.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || "patient",
      provider: "local",
    });

    // Automatically log in after registration
    req.login(user, (err) => {
      if (err)
        return res
          .status(500)
          .json({ message: "Login after register failed." });
      return res.status(201).json({
        message: "Account created successfully.",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user)
      return res
        .status(401)
        .json({ message: info?.message || "Invalid credentials." });

    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      return res.json({
        message: "Logged in successfully.",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    });
  })(req, res, next);
});

// ══════════════════════════════════════════════
//  GOOGLE OAUTH
// ══════════════════════════════════════════════

/**
 * GET /api/auth/google
 * Redirects the user to Google consent screen
 */
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

/**
 * GET /api/auth/google/callback
 * Google redirects here after consent
 */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${CLIENT_URL}/signin?error=google`,
  }),
  (_req, res) => {
    res.redirect(`${CLIENT_URL}/auth/callback`);
  },
);

// ══════════════════════════════════════════════
//  GITHUB OAUTH
// ══════════════════════════════════════════════

/**
 * GET /api/auth/github
 * Redirects the user to GitHub authorization
 */
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"] }),
);

/**
 * GET /api/auth/github/callback
 * GitHub redirects here after authorization
 */
router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: `${CLIENT_URL}/signin?error=github`,
  }),
  (_req, res) => {
    res.redirect(`${CLIENT_URL}/auth/callback`);
  },
);

// ══════════════════════════════════════════════
//  SESSION MANAGEMENT
// ══════════════════════════════════════════════

/**
 * POST /api/auth/logout
 * Destroys the session and logs the user out
 */
router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr);
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out successfully." });
    });
  });
});

/**
 * GET /api/auth/current-user
 * Returns the currently authenticated user (or 401)
 */
router.get("/current-user", ensureAuth, (req, res) => {
  return res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      avatar: req.user.avatar,
      provider: req.user.provider,
    },
  });
});

module.exports = router;
