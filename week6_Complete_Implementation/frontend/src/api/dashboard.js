const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const TOKEN_STORAGE_KEYS = [
  "token",
  "authToken",
  "accessToken",
  "jwt",
  "jwtToken",
];

function getAuthToken() {
  if (typeof window === "undefined") return null;

  for (const key of TOKEN_STORAGE_KEYS) {
    const localValue = window.localStorage?.getItem(key);
    if (localValue) return localValue;

    const sessionValue = window.sessionStorage?.getItem(key);
    if (sessionValue) return sessionValue;
  }

  return null;
}

function buildAuthHeaders(baseHeaders = {}) {
  const token = getAuthToken();
  if (!token) return baseHeaders;

  return {
    ...baseHeaders,
    Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
  };
}

async function parseResponse(response) {
  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (typeof payload === "object" && payload?.message) ||
      (typeof payload === "string" && payload) ||
      `Request failed (${response.status})`;

    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function getDashboardHistory() {
  const response = await fetch(`${API_BASE}/api/dashboard/history`, {
    method: "GET",
    credentials: "include",
    headers: buildAuthHeaders({
      Accept: "application/json",
    }),
  });

  return parseResponse(response);
}
