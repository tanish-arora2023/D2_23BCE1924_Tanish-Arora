const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const User = require("../models/User");

// ──────────────────────────────────────────────
// Serialize / Deserialize — store user id in session
// ──────────────────────────────────────────────
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ──────────────────────────────────────────────
// 1. LOCAL STRATEGY  (email + password)
// ──────────────────────────────────────────────
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        // Need to explicitly select the password field
        const user = await User.findOne({ email }).select("+password");

        if (!user) {
          return done(null, false, { message: "No account with that email." });
        }

        // If the user registered via OAuth only, they won't have a password
        if (!user.password) {
          return done(null, false, {
            message: `This email is linked to a ${user.provider} account. Please sign in with ${user.provider}.`,
          });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

// ──────────────────────────────────────────────
// 2. GOOGLE STRATEGY
// ──────────────────────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        // Check if a user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });
        if (user) return done(null, user);

        // Check if the email is already registered (e.g. via local or GitHub)
        const email =
          profile.emails && profile.emails[0]
            ? profile.emails[0].value
            : undefined;

        if (email) {
          user = await User.findOne({ email });
          if (user) {
            // Link Google ID to existing account
            user.googleId = profile.id;
            if (!user.avatar && profile.photos?.[0]?.value) {
              user.avatar = profile.photos[0].value;
            }
            await user.save();
            return done(null, user);
          }
        }

        // Create a brand-new user
        user = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email,
          avatar: profile.photos?.[0]?.value || "",
          provider: "google",
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    },
  ),
);

// ──────────────────────────────────────────────
// 3. GITHUB STRATEGY
// ──────────────────────────────────────────────
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "/api/auth/github/callback",
      scope: ["user:email"],
    },
    (_accessToken, _refreshToken, profile, done) => {
      User.findOne({ githubId: profile.id })
        .then((existingUser) => {
          if (existingUser) return done(null, existingUser);

          const email =
            profile.emails && profile.emails[0]
              ? profile.emails[0].value
              : undefined;

          if (!email) {
            return User.create({
              githubId: profile.id,
              name: profile.displayName || profile.username,
              provider: "github",
            }).then((newUser) => done(null, newUser));
          }

          return User.findOne({ email }).then((userWithEmail) => {
            if (userWithEmail) {
              userWithEmail.githubId = profile.id;
              return userWithEmail.save().then((saved) => done(null, saved));
            }

            return User.create({
              githubId: profile.id,
              name: profile.displayName || profile.username,
              email,
              avatar: profile.photos?.[0]?.value || "",
              provider: "github",
            }).then((newUser) => done(null, newUser));
          });
        })
        .catch((err) => done(err, null));
    },
  ),
);

module.exports = passport;
