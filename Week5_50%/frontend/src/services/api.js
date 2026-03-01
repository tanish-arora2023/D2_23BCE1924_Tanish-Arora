// ──────────────────────────────────────────────
// Centralised API helper — all backend calls go through here
// ──────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    credentials: "include", // send session cookie
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  // Attempt to parse JSON — some responses may be empty
  const data = res.headers.get("content-type")?.includes("application/json")
    ? await res.json()
    : null;

  if (!res.ok) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return data;
}

// ─── Auth endpoints ──────────────────────────

export const authAPI = {
  /** POST /api/auth/register */
  register: (body) =>
    request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** POST /api/auth/login */
  login: (body) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** POST /api/auth/logout */
  logout: () => request("/api/auth/logout", { method: "POST" }),

  /** GET /api/auth/current-user — returns user or 401 */
  currentUser: () => request("/api/auth/current-user"),

  /** Redirect URLs for OAuth (open in same tab) */
  googleLoginUrl: `${API_BASE}/api/auth/google`,
  githubLoginUrl: `${API_BASE}/api/auth/github`,
};

export default request;
