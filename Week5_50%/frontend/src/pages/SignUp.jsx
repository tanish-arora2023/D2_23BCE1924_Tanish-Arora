import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Brain,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../services/api";

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "patient",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { setSession } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await authAPI.register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      });
      setSession(data.user);
      navigate("/");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* password strength helper */
  const strength = (() => {
    const p = form.password;
    if (p.length === 0) return { label: "", pct: 0, color: "" };
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    if (s <= 1) return { label: "Weak", pct: 25, color: "bg-rose-400" };
    if (s === 2) return { label: "Fair", pct: 50, color: "bg-amber-400" };
    if (s === 3) return { label: "Good", pct: 75, color: "bg-green-accent" };
    return { label: "Strong", pct: 100, color: "bg-green-primary" };
  })();

  return (
    <div className="flex min-h-screen font-sans antialiased">
      {/* ── Left panel: branding ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-green-primary p-12 text-white">
        <div>
          <Link to="/" className="flex items-center gap-2.5">
            <Brain className="h-8 w-8 text-white" />
            <span className="text-2xl font-bold tracking-tight">
              NeuroScreen
            </span>
          </Link>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Start your cognitive health{" "}
            <span className="font-serif italic">journey today.</span>
          </h1>
          <p className="mt-4 text-white/80 leading-relaxed">
            Create a free account to take AI-powered assessments, track your
            cognitive health over time, and get matched with specialists.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              "Free cognitive screening",
              "Secure & encrypted data",
              "Personalised specialist recommendations",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 shrink-0 text-green-accent" />
                <span className="text-white/90">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* decorative circles */}
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-white" />
          <span className="h-3 w-3 rounded-full bg-white/50" />
          <span className="h-3 w-3 rounded-full bg-white/30" />
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex w-full items-center justify-center bg-cream px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* mobile logo */}
          <Link
            to="/"
            className="mb-10 flex items-center gap-2 lg:hidden text-green-primary"
          >
            <Brain className="h-7 w-7" />
            <span className="text-xl font-bold">NeuroScreen</span>
          </Link>

          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              to="/signin"
              className="font-semibold text-green-primary hover:underline"
            >
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-600">
                {error}
              </div>
            )}

            {/* Role selector */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                I am a
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "patient", label: "Patient / User" },
                  { value: "caregiver", label: "Caregiver" },
                ].map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, role: r.value }))
                    }
                    className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                      form.role === r.value
                        ? "border-green-primary bg-green-light text-green-primary"
                        : "border-gray-200 bg-white text-gray-600 hover:border-green-primary/40"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={update("name")}
                  placeholder="John Doe"
                  className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-11 pr-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-green-primary"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={update("email")}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-11 pr-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-green-primary"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={update("password")}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-11 pr-11 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-green-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* strength bar */}
              {form.password.length > 0 && (
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${strength.pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Terms */}
            <p className="text-xs text-gray-500 leading-relaxed">
              By creating an account you agree to our{" "}
              <a href="#" className="text-green-primary hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-green-primary hover:underline">
                Privacy Policy
              </a>
              .
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-green-primary py-3.5 text-sm font-semibold text-white transition-colors hover:bg-green-dark disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <hr className="flex-1 border-gray-200" />
            <span className="text-xs text-gray-400">or sign up with</span>
            <hr className="flex-1 border-gray-200" />
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-400 cursor-not-allowed opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
            <a
              href={authAPI.githubLoginUrl}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 transition-colors hover:border-green-primary hover:text-green-primary"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
