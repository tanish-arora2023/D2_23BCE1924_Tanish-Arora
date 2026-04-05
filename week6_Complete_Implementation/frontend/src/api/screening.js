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

export async function submitScreening(cognitiveData = {}, audioBlob) {
  const formData = new FormData();

  // Keep both a structured object payload and flat fields for backend flexibility.
  formData.append("cognitiveData", JSON.stringify(cognitiveData));

  Object.entries(cognitiveData).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (typeof value === "object") {
      formData.append(key, JSON.stringify(value));
      return;
    }

    formData.append(key, String(value));
  });

  if (audioBlob) {
    const fileName = audioBlob.name || "speech.webm";
    formData.append("audio", audioBlob, fileName);
  }

  const response = await fetch(`${API_BASE}/api/screening/run`, {
    method: "POST",
    credentials: "include",
    headers: buildAuthHeaders(),
    body: formData,
  });

  return parseResponse(response);
}
