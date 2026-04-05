import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Bell,
  Brain,
  BrainCog,
  CalendarDays,
  ChartLine,
  ChevronDown,
  Download,
  Home,
  Loader2,
  LocateFixed,
  LogOut,
  RefreshCcw,
  Search,
  Stethoscope,
  TriangleAlert,
  User,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboardHistory } from "../api/dashboard";
import { getSpecialists } from "../api/recommendations";
import { useAuth } from "../context/AuthContext";

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

function parseContentDispositionFileName(headerValue, fallbackName) {
  if (!headerValue) return fallbackName;

  const match = headerValue.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  if (!match || !match[1]) return fallbackName;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function toPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "N/A";
  return `${(parsed * 100).toFixed(1)}%`;
}

function toRiskPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "N/A";
  return `${parsed.toFixed(1)}%`;
}

function formatDate(value) {
  if (!value) return "N/A";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";

  return parsed.toLocaleString();
}

export default function Dashboard() {
  const { isLoggedIn, user, signOut } = useAuth();

  const tableRef = useRef(null);
  const [historyData, setHistoryData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [trendData, setTrendData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [downloadingId, setDownloadingId] = useState("");
  const [downloadError, setDownloadError] = useState("");

  const [specialists, setSpecialists] = useState([]);
  const [specialistsLoading, setSpecialistsLoading] = useState(false);
  const [specialistsError, setSpecialistsError] = useState("");
  const [locationLabel, setLocationLabel] = useState("");

  const recentAssessments = useMemo(() => {
    let list = [...trendData].reverse();
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => {
        const pId = String(a.patientId || "").toLowerCase();
        const rId = String(a.id || "").toLowerCase();
        return pId.includes(q) || rId.includes(q);
      });
    }
    return list;
  }, [trendData, searchQuery]);

  const loadHistory = useCallback(async () => {
    if (!isLoggedIn) return;

    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await getDashboardHistory();
      setHistoryData(response);
      setTrendData(Array.isArray(response?.trend) ? response.trend : []);
    } catch (error) {
      setTrendData([]);
      setHistoryError(error.message || "Failed to load dashboard history.");
    } finally {
      setHistoryLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDownloadReport = async (assessmentId) => {
    setDownloadError("");
    setDownloadingId(assessmentId);

    try {
      const response = await fetch(
        `${API_BASE}/api/reports/download/${assessmentId}`,
        {
          method: "GET",
          credentials: "include",
          headers: buildAuthHeaders(),
        },
      );

      if (!response.ok) {
        let message = `Failed to download report (${response.status}).`;

        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const payload = await response.json();
          if (payload?.message) message = payload.message;
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const fileName = parseContentDispositionFileName(
        response.headers.get("content-disposition"),
        `neurosense-report-${assessmentId}.pdf`,
      );

      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      setDownloadError(error.message || "Could not download PDF report.");
    } finally {
      setDownloadingId("");
    }
  };

  const findNearbyCare = () => {
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
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full max-w-xl rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <h1 className="font-serif text-3xl font-bold text-gray-900">
            Dashboard Access Required
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            Sign in to view risk trends, recent assessments, downloadable PDF
            reports, and nearby care recommendations.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to="/signin"
              className="rounded-full bg-green-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-dark"
            >
              Sign In
            </Link>
            <Link
              to="/"
              className="rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-green-primary hover:text-green-primary"
            >
              Back Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate Metrics from trendData
  const mmseScores = trendData
    .map((t) => t.cognitiveTests?.mmseScore)
    .filter((score) => typeof score === "number");
  const avgMmse =
    mmseScores.length > 0
      ? (mmseScores.reduce((a, b) => a + b, 0) / mmseScores.length).toFixed(1)
      : "N/A";

  const highRiskCount = trendData.filter((t) => t.riskScore >= 0.7).length;
  const modRiskCount = trendData.filter((t) => t.riskScore >= 0.3 && t.riskScore < 0.7).length;
  const lowRiskCount = trendData.filter((t) => t.riskScore < 0.3).length;

  const pieData = [
    { name: "Low Risk", value: lowRiskCount, color: "#10b981" }, // emerald-500
    { name: "Moderate", value: modRiskCount, color: "#f59e0b" }, // amber-500
    { name: "High Risk", value: highRiskCount, color: "#f43f5e" }, // rose-500
  ].filter(d => d.value > 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthCount = trendData.filter((t) => {
    const d = new Date(t.isoDate);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* ─── Top Navigation Bar ─── */}
      <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <Link to="/" className="flex items-center gap-2.5">
            <Brain className="h-8 w-8 text-green-primary" />
            <span className="hidden sm:block font-serif text-xl font-bold tracking-tight text-gray-900">
              NeuroSense
            </span>
          </Link>

          <div className="relative max-w-md w-full ml-4 md:ml-12 hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              placeholder="Search reports or patients..."
              className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-green-primary focus:outline-none focus:ring-1 focus:ring-green-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pl-4 group">
            <div className="h-8 w-8 rounded-full bg-green-light flex items-center justify-center text-green-primary">
              <User className="h-4 w-4" />
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700 mr-2">
              {user?.name || "User"}
            </span>
            <button 
              onClick={signOut}
              className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-50 text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        
        {/* Actions & Alerts */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 font-serif">
            Overview
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={loadHistory}
              disabled={historyLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 shadow-sm"
            >
              {historyLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Sync
            </button>
            <Link
              to="/#assessment"
              className="inline-flex items-center gap-2 rounded-lg bg-green-primary px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark shadow-sm"
            >
              + New Test
            </Link>
          </div>
        </div>

        {historyError && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
            <TriangleAlert className="h-4 w-4" />
            {historyError}
          </div>
        )}

        {/* ─── Summary Cards ─── */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex p-3 rounded-xl bg-green-light text-green-primary">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-gray-500">
                Total Screenings
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {historyData?.totalResults ?? 0}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex p-3 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-gray-500">
                High Risk Patients
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {highRiskCount}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex p-3 rounded-xl bg-indigo-50 text-indigo-600">
              <BrainCog className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-gray-500">
                Average MMSE
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {avgMmse}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex p-3 rounded-xl bg-sky-50 text-sky-600">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-gray-500">
                Tests This Month
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {thisMonthCount}
              </p>
            </div>
          </div>
        </div>


        <div className="grid gap-6 lg:grid-cols-3">
          {/* ─── Chart Section ─── */}
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                <ChartLine className="h-5 w-5 text-green-primary" />
                Risk Score Trend
              </h2>
            </div>
            
            {historyLoading ? (
              <div className="flex h-72 items-center justify-center text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="ml-2 text-sm">Loading chart data...</span>
              </div>
            ) : trendData.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendData}
                    margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="timestamp" 
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(val) => formatDate(val).split(',')[0]} 
                      tick={{ fontSize: 12 }} 
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "Risk")
                          return [`${Number(value).toFixed(1)}%`, name];
                        return [value, name];
                      }}
                      labelFormatter={(label, payload) => {
                        const raw = payload?.[0]?.payload?.isoDate;
                        return raw ? formatDate(raw) : label;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="riskPercent"
                      name="Risk"
                      stroke="#1f7a52"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
                No historical assessments available yet.
              </div>
            )}
          </section>

          {/* ─── Risk Distribution Section ─── */}
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                <BrainCog className="h-5 w-5 text-green-primary" />
                Risk Distribution
              </h2>
            </div>
            
            {historyLoading ? (
              <div className="flex h-72 flex-1 items-center justify-center text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : pieData.length > 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[250px] relative">
                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value, name) => [value, name]}
                          itemStyle={{ fontWeight: 'bold' }}
                          contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Custom Legend */}
                  <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 max-h-16 overflow-y-auto px-2">
                    {pieData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 whitespace-nowrap">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
                        {entry.name}: {entry.value}
                      </div>
                    ))}
                  </div>
              </div>
            ) : (
              <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
                No data.
              </div>
            )}
          </section>
        </div>

        {/* ─── Recent Assessments Table ─── */}
        <section ref={tableRef} className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden mt-8 scroll-mt-24">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              Recent Assessments
            </h2>
          </div>

          {downloadError && (
            <div className="m-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              {downloadError}
            </div>
          )}

          {recentAssessments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#f0f9f4]/60">
                  <tr className="border-b border-gray-100 text-xs font-semibold tracking-wider text-green-800 uppercase">
                    <th className="px-6 py-5">Report ID</th>
                    <th className="px-6 py-5">Patient Info</th>
                    <th className="px-6 py-5">Date</th>
                    <th className="px-6 py-5">MMSE / MoCA</th>
                    <th className="px-6 py-5">Risk Level</th>
                    <th className="px-6 py-5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {recentAssessments.map((assessment, index) => {
                    const reportId = assessment.id || assessment._id;
                    const isHighRisk = assessment.riskScore > 0.7;
                    const isModRisk = assessment.riskScore >= 0.3 && !isHighRisk;

                    const mmse = assessment.cognitiveTests?.mmseScore !== null ? assessment.cognitiveTests.mmseScore : "N/A";
                    const moca = assessment.cognitiveTests?.mocaScore !== null ? assessment.cognitiveTests.mocaScore : "N/A";

                    return (
                      <tr
                        key={
                          reportId ||
                          `${assessment.patientId}-${assessment.isoDate}`
                        }
                        className="hover:bg-gray-50 transition-colors group"
                      >
                        <td className="px-6 py-4 text-indigo-600 font-semibold tracking-wide">
                          {reportId ? reportId.substring(0, 8).toUpperCase() : `N/A-${index}`}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-light text-green-primary text-xs font-bold uppercase ring-2 ring-transparent group-hover:ring-green-primary transition-all">
                              {(assessment.patientId || "P").substring(0,2)}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {assessment.patientId || "Unknown Patient"}
                              </div>
                              <div className="text-[11px] font-medium text-gray-500">
                                Age/Gender N/A
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700 font-medium">
                          {new Date(assessment.isoDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-6 py-4">
                           <div className="font-semibold text-gray-900">{mmse} <span className="text-gray-400 font-normal">/</span> {moca}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            isHighRisk ? "bg-rose-100 text-rose-700" : 
                            isModRisk ? "bg-amber-100 text-amber-700" : 
                            "bg-emerald-100 text-emerald-700"
                          }`}>
                            {assessment.riskLevel || (isHighRisk ? "High" : isModRisk ? "Moderate" : "Low")}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                             <button
                              type="button"
                              onClick={() => reportId && handleDownloadReport(reportId)}
                              disabled={!reportId || downloadingId === reportId}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:border-green-primary hover:bg-green-50 hover:text-green-primary disabled:opacity-50"
                            >
                              {downloadingId === reportId ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                              Download
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <Activity className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900">No assessments yet</p>
              <p className="mt-1 text-sm text-gray-500">Run a screening to see history here.</p>
            </div>
          )}
        </section>

        {/* ─── Care Recommendations ─── */}
        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Stethoscope className="h-5 w-5 text-green-primary" />
              Nearby Care Options
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
              Find Nearby Doctors
            </button>
          </div>

          {locationLabel && (
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
              Using location: {locationLabel}
            </p>
          )}

          {specialistsError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              {specialistsError}
            </div>
          )}

          {specialists.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {specialists.map((specialist, index) => {
                const isBadgeAccent =
                  specialist.category === "neurologist" ||
                  specialist.category === "doctor";

                return (
                  <article
                    key={specialist.id || `${specialist.name}-${index}`}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-4 transition-colors hover:bg-white hover:border-green-200"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold text-gray-900">
                        {specialist.name}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isBadgeAccent
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-green-light text-green-primary"
                        }`}
                      >
                        {specialist.category || "medical"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {specialist.address || "Address unavailable"}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-900">
                        {specialist.distanceKm ?? "N/A"} km away
                      </span>
                      {specialist.contact?.mapsUrl && (
                        <a
                          href={specialist.contact.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-green-primary hover:underline hover:text-green-dark"
                        >
                          Directions
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Locate nearby clinical and diagnostic centers when needed.
            </p>
          )}
        </section>

      </main>
    </div>
  );
}
