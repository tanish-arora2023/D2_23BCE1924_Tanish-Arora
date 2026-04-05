import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  CheckCircle2,
  ChartLine,
  Home,
  Loader2,
  LocateFixed,
  RefreshCcw,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import { getSpecialists } from "../api/recommendations";

const toPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "N/A";
  return `${(numeric * 100).toFixed(1)}%`;
};

export default function ResultsPage() {
  const location = useLocation();
  const result = location.state?.result || null;

  const riskScore = result?.riskScore ?? result?.risk_score;
  const riskLevel = result?.riskLevel ?? result?.risk_level;
  const confidence = result?.confidence;

  // ─── Nearby Care State ───
  const [specialists, setSpecialists] = useState([]);
  const [specialistsLoading, setSpecialistsLoading] = useState(false);
  const [specialistsError, setSpecialistsError] = useState("");
  const [locationLabel, setLocationLabel] = useState("");

  const findNearbyCare = useCallback(() => {
    setSpecialistsError("");

    if (!window.navigator?.geolocation) {
      setSpecialistsError("Geolocation is not supported by this browser.");
      return;
    }

    setSpecialistsLoading(true);

    window.navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setLocationLabel(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);

        try {
          const response = await getSpecialists(latitude, longitude);
          const list = Array.isArray(response?.specialists)
            ? response.specialists
            : [];

          setSpecialists(list);
        } catch (error) {
          setSpecialistsError(
            error.message ||
              "Failed to fetch nearby specialist recommendations.",
          );
        } finally {
          setSpecialistsLoading(false);
        }
      },
      (error) => {
        setSpecialistsLoading(false);

        if (error.code === 1) {
          setSpecialistsError(
            "Location permission denied. Please allow location access and try again.",
          );
          return;
        }

        if (error.code === 2) {
          setSpecialistsError("Unable to determine your current location.");
          return;
        }

        setSpecialistsError("Location request timed out. Please try again.");
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
      },
    );
  }, []);

  // Auto-fetch on mount if there's a result
  useEffect(() => {
    if (result) {
      findNearbyCare();
    }
  }, [result, findNearbyCare]);

  return (
    <div className="min-h-screen bg-cream px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* ─── Assessment Result Card ─── */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-full bg-green-light p-2.5">
              <ChartLine className="h-5 w-5 text-green-primary" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-gray-900 sm:text-3xl">
              Assessment Result
            </h1>
          </div>

          {result ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Screening submitted successfully.
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Risk Level
                  </p>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {riskLevel || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Risk Score
                  </p>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {toPercent(riskScore)}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Confidence
                  </p>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {toPercent(confidence)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full bg-green-dark px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-primary"
                >
                  <ChartLine className="h-4 w-4" />
                  Open Dashboard
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-full bg-green-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-dark"
                >
                  <Home className="h-4 w-4" />
                  Back to Home
                </Link>
                <Link
                  to="/#assessment"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-green-primary hover:text-green-primary"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Start New Test
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                No assessment result was found in this session.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full bg-green-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-dark"
              >
                <Home className="h-4 w-4" />
                Go to Home
              </Link>
            </div>
          )}
        </div>

        {/* ─── Nearby Care Section ─── */}
        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Stethoscope className="h-5 w-5 text-green-primary" />
              Nearby Hospitals & Neurologists
            </h2>
            <button
              type="button"
              onClick={findNearbyCare}
              disabled={specialistsLoading}
              className="inline-flex items-center gap-2 rounded-full bg-green-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-dark disabled:opacity-60"
            >
              {specialistsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
              Find Nearby
            </button>
          </div>

          {locationLabel && (
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
              Using location: {locationLabel}
            </p>
          )}

          {specialistsError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <TriangleAlert className="h-4 w-4" />
              {specialistsError}
            </div>
          )}

          {specialistsLoading && specialists.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="ml-2 text-sm">
                Searching nearby facilities...
              </span>
            </div>
          ) : specialists.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {specialists.map((specialist, index) => {
                const isBadgeAccent =
                  specialist.category === "neurologist" ||
                  specialist.category === "doctor";

                return (
                  <article
                    key={specialist.id || `${specialist.name}-${index}`}
                    className="rounded-2xl border border-gray-200 p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold text-gray-900">
                        {specialist.name}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isBadgeAccent
                            ? "bg-indigo-50 text-indigo-600"
                            : "bg-green-light text-green-primary"
                        }`}
                      >
                        {specialist.category || "medical"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-600">
                      {specialist.address || "Address unavailable"}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>{specialist.distanceKm ?? "N/A"} km away</span>
                      <span>
                        📞 {specialist.contact?.phone || "Not available"}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {specialist.contact?.website && (
                        <a
                          href={specialist.contact.website}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-green-primary hover:text-green-primary"
                        >
                          Website
                        </a>
                      )}
                      {specialist.contact?.mapsUrl && (
                        <a
                          href={specialist.contact.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-green-primary hover:text-green-primary"
                        >
                          Open Map
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {result
                ? "Searching for nearby hospitals, clinics, and neurologists..."
                : "Complete a screening to automatically see nearby care options, or tap Find Nearby."}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
