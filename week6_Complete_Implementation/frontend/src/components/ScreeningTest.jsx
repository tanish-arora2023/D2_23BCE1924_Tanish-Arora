import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  TriangleAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SCREENING_API_URL = "http://localhost:5000/api/screening/run";
const SCREENING_REQUEST_TIMEOUT_MS = 20000;

const INITIAL_FORM = {
  patientId: "",
  age: "",
  gender: "female",
  educationYears: "",
  mmseScore: "",
  mocaScore: "",
  cdrScore: "",
  familyHistory: false,
  physicalActivityLevel: "moderate",
};

const READING_PROMPT =
  "The quick brown fox jumped over the lazy dog near the river bank on a sunny afternoon.";

const buildScreeningFormData = (cognitiveData = {}, audioBlob) => {
  const formData = new FormData();

  // Backend expects cognitive data as a JSON string under the "metadata" key
  // when the request is multipart/form-data (see buildRequestBody in screening.js).
  formData.append("metadata", JSON.stringify(cognitiveData));

  if (audioBlob) {
    const fileName = audioBlob.name || "speech.webm";
    formData.append("audio", audioBlob, fileName);
  }

  return formData;
};

const submitScreeningRequest = async (cognitivePayload, audioBlob) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    SCREENING_REQUEST_TIMEOUT_MS,
  );

  try {
    const hasAudio = Boolean(audioBlob);

    const response = await fetch(SCREENING_API_URL, {
      method: "POST",
      credentials: "include",
      signal: controller.signal,
      headers: hasAudio ? undefined : { "Content-Type": "application/json" },
      body: hasAudio
        ? buildScreeningFormData(cognitivePayload, audioBlob)
        : JSON.stringify(cognitivePayload),
    });

    return await parseScreeningResponse(response);
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error(
        "The request timed out. Please check your connection and try again.",
      );
      timeoutError.status = 408;
      throw timeoutError;
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const parseScreeningResponse = async (response) => {
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
};

function AudioRecorder({ audioBlob, setAudioBlob, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const isSupported =
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    !!window.navigator?.mediaDevices?.getUserMedia;

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopAudioTracks = () => {
    if (!mediaStreamRef.current) return;
    mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  // Reconstruct audioUrl from audioBlob if restoring from a previous step
  useEffect(() => {
    if (audioBlob && !audioUrl) {
      setAudioUrl(URL.createObjectURL(audioBlob));
    }
  }, [audioBlob, audioUrl]);

  // General Unmount cleanups (timers / microphone tracks)
  useEffect(() => {
    return () => {
      stopTimer();
      stopAudioTracks();
    };
  }, []);

  // Isolate URL cleanup to prevent memory leaks when URLs are dropped
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const formatDuration = (seconds) => {
    const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
    const remaining = String(seconds % 60).padStart(2, "0");
    return `${minutes}:${remaining}`;
  };

  const startRecording = async () => {
    if (disabled) return;

    if (!isSupported) {
      setError("Audio recording is not supported by this browser.");
      return;
    }

    try {
      setError("");
      setElapsedSeconds(0);
      setAudioBlob(null);

      const stream = await window.navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      mediaStreamRef.current = stream;
      chunksRef.current = [];

      const canUseWebm =
        typeof window.MediaRecorder.isTypeSupported === "function" &&
        window.MediaRecorder.isTypeSupported("audio/webm;codecs=opus");

      const recorder = canUseWebm
        ? new window.MediaRecorder(stream, {
            mimeType: "audio/webm;codecs=opus",
          })
        : new window.MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stopTimer();
        setIsRecording(false);

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (!blob.size) {
          setError("No audio was captured. Please try recording again.");
          stopAudioTracks();
          return;
        }

        setAudioBlob(blob);
        setAudioUrl((currentUrl) => {
          if (currentUrl) URL.revokeObjectURL(currentUrl);
          return URL.createObjectURL(blob);
        });

        stopAudioTracks();
      };

      recorder.onerror = () => {
        setError(
          "Recording failed. Please allow microphone access and try again.",
        );
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((current) => current + 1);
      }, 1000);
    } catch {
      stopTimer();
      stopAudioTracks();
      setIsRecording(false);
      setError("Microphone access was denied or unavailable.");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    recorder.stop();
  };

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-gray-100 bg-gray-50/30 p-8 shadow-sm sm:p-12">
      <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-green-100/50 blur-3xl pointer-events-none"></div>
      <div className="absolute -left-20 -bottom-20 h-48 w-48 rounded-full bg-indigo-100/50 blur-3xl pointer-events-none"></div>

      <div className="relative text-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-green-primary">
          Voice Analysis Prompt
        </p>
        <p className="mx-auto mt-5 max-w-2xl font-serif text-2xl leading-relaxed text-gray-900 border-l-4 border-full border-green-primary/30 pl-5 text-left md:text-center md:border-0 md:pl-0">
          "{READING_PROMPT}"
        </p>
      </div>

      <div className="relative mt-12 flex flex-col items-center gap-6">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="group relative inline-flex items-center gap-3 rounded-full bg-gray-900 px-8 py-4 text-sm font-bold text-white transition-all hover:bg-green-primary hover:shadow-[0_8px_30px_rgb(16,185,129,0.3)] disabled:opacity-50 active:scale-95"
          >
            <Mic className="h-5 w-5 transition-transform group-hover:scale-110" />
            {audioBlob ? "Record Again" : "Start Voice Recording"}
          </button>
        ) : (
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="relative flex items-center justify-center">
              <span className="absolute inline-flex h-20 w-20 animate-ping rounded-full bg-rose-400 opacity-20"></span>
              <span className="absolute inline-flex h-16 w-16 animate-ping rounded-full bg-rose-400 opacity-40" style={{ animationDuration: '1.5s' }}></span>
              <button
                type="button"
                onClick={stopRecording}
                className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white shadow-[0_0_30px_rgba(244,63,94,0.4)] transition-transform hover:scale-105 active:scale-95"
              >
                <div className="h-5 w-5 rounded-sm bg-white" />
              </button>
            </div>
            <div className="text-sm font-bold text-rose-500 animate-pulse">
              Recording in progress... {formatDuration(elapsedSeconds)}
            </div>
          </div>
        )}

        {!isRecording && audioUrl && (
          <div className="w-full max-w-md mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <audio controls src={audioUrl} className="w-full shadow-sm rounded-full" />
          </div>
        )}

        {!isRecording && !audioUrl && (
          <p className="text-xs font-medium text-gray-400">
            Read the text aloud clearly. You can review playback before submitting.
          </p>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-sm font-medium text-rose-700 w-full max-w-md animate-in fade-in slide-in-from-bottom-2">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScreeningTest() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const onFieldChange = (field) => (event) => {
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;

    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toOptionalNumber = (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return Number(value);
  };

  const buildPayload = () => ({
    patientId: form.patientId || user?._id || user?.id || "",
    age: toOptionalNumber(form.age),
    gender: form.gender,
    mmseScore: toOptionalNumber(form.mmseScore),
    mocaScore: toOptionalNumber(form.mocaScore),
    cdrScore: toOptionalNumber(form.cdrScore),
    educationYears: toOptionalNumber(form.educationYears),
    familyHistory: form.familyHistory,
    physicalActivityLevel: form.physicalActivityLevel,
  });

  const goToAudioStep = (event) => {
    event.preventDefault();
    setSubmitError("");
    setStep(2);
  };

  const handleSubmitAssessment = async () => {
    if (!isLoggedIn) {
      navigate("/signin", {
        replace: true,
        state: { from: { pathname: "/", hash: "#assessment" } },
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const cognitivePayload = buildPayload();
      await submitScreeningRequest(cognitivePayload, audioBlob);

      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (error.status === 408 || error.status === 504) {
        setSubmitError(
          "The screening request timed out. Please try again in a moment.",
        );
      } else if (error.status >= 500) {
        setSubmitError(
          "Our server is temporarily unavailable while processing your assessment. Please try again shortly.",
        );
      } else if (error instanceof TypeError) {
        setSubmitError(
          "Unable to reach the screening service. Please check your internet connection and try again.",
        );
      } else {
        setSubmitError(
          error.message || "Failed to submit assessment. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="assessment" className="bg-cream py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2.5rem] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-10 md:p-12 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-green-50/60 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-indigo-50/40 blur-3xl pointer-events-none"></div>
          
          <div className="relative mb-10">
            <h2 className="font-serif text-3xl font-bold text-gray-900 sm:text-4xl text-center">
              Cognitive Screening Assessment
            </h2>
            <div className="mt-8 flex justify-center items-center gap-2 sm:gap-4 max-w-sm mx-auto">
              <div className={`flex flex-col items-center gap-2 transition-colors duration-300 ${step >= 1 ? 'text-green-primary' : 'text-gray-400'}`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-500 shadow-sm ${step >= 1 ? 'border-green-primary bg-green-light scale-105' : 'border-gray-200 bg-white hover:border-gray-300'} font-bold`}>1</div>
                <span className="text-[11px] uppercase tracking-wider font-bold">Patient Data</span>
              </div>
              <div className={`h-[2px] w-12 sm:w-20 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-green-primary' : 'bg-gray-100'}`}></div>
              <div className={`flex flex-col items-center gap-2 transition-colors duration-300 ${step >= 2 ? 'text-green-primary' : 'text-gray-400'}`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-500 shadow-sm ${step >= 2 ? 'border-green-primary bg-green-light scale-105' : 'border-gray-200 bg-white hover:border-gray-300'} font-bold`}>2</div>
                <span className="text-[11px] uppercase tracking-wider font-bold">Voice Sample</span>
              </div>
            </div>
          </div>

          {step === 1 && (
            <form onSubmit={goToAudioStep} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both relative">
              <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-4 items-start">
                <label className="block space-y-1.5 lg:col-span-1">
                  <span className="block text-sm font-semibold text-gray-700 ml-1">
                    Patient ID
                  </span>
                  <input
                    type="text"
                    value={form.patientId}
                    onChange={onFieldChange("patientId")}
                    placeholder="Optional pseudo-identifier"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 hover:border-gray-300 focus:border-green-primary focus:bg-white focus:ring-4 focus:ring-green-primary/10"
                  />
                </label>

                <label className="block space-y-1.5 lg:col-span-1">
                  <span className="block text-sm font-semibold text-gray-700 ml-1">
                    Patient Age
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    placeholder="Years (e.g. 68)"
                    required
                    value={form.age}
                    onChange={onFieldChange("age")}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 hover:border-gray-300 focus:border-green-primary focus:bg-white focus:ring-4 focus:ring-green-primary/10"
                  />
                </label>

                <div className="sm:col-span-2 lg:col-span-2 space-y-1.5">
                  <span className="block text-sm font-semibold text-gray-700 ml-1">Biological Gender</span>
                  <div className="flex gap-2">
                    {['female', 'male', 'other'].map((g) => (
                      <button
                        type="button"
                        key={g}
                        onClick={() => setForm(prev => ({ ...prev, gender: g }))}
                        className={`flex-1 rounded-2xl border py-3 text-sm font-bold capitalize transition-all duration-200 ${form.gender === g ? 'border-green-primary bg-green-light text-green-primary shadow-sm scale-[1.02]' : 'border-gray-200 bg-gray-50/50 text-gray-500 hover:border-gray-300 hover:bg-gray-100 hover:text-gray-700'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block space-y-1.5 lg:col-span-1">
                  <span className="block text-sm font-semibold text-gray-700 ml-1">
                    Education
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="40"
                    placeholder="Total Years (e.g. 16)"
                    value={form.educationYears}
                    onChange={onFieldChange("educationYears")}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 hover:border-gray-300 focus:border-green-primary focus:bg-white focus:ring-4 focus:ring-green-primary/10"
                  />
                </label>

                <label className="block space-y-1.5 lg:col-span-1">
                  <span className="block text-sm font-semibold text-gray-700 ml-1">
                    MMSE <span className="text-gray-400 font-normal ml-1">/30</span>
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="0.1"
                    placeholder="0-30"
                    required
                    value={form.mmseScore}
                    onChange={onFieldChange("mmseScore")}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 hover:border-gray-300 focus:border-green-primary focus:bg-white focus:ring-4 focus:ring-green-primary/10"
                  />
                </label>

                <label className="block space-y-1.5 lg:col-span-1">
                  <span className="block text-sm font-semibold text-gray-700 ml-1">
                    MoCA <span className="text-gray-400 font-normal ml-1">/30</span>
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="0.1"
                    placeholder="0-30"
                    required
                    value={form.mocaScore}
                    onChange={onFieldChange("mocaScore")}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 hover:border-gray-300 focus:border-green-primary focus:bg-white focus:ring-4 focus:ring-green-primary/10"
                  />
                </label>

                <label className="block space-y-1.5 lg:col-span-1">
                  <span className="block text-sm font-semibold text-gray-700 ml-1">
                    CDR <span className="text-gray-400 font-normal ml-1">/3</span>
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="3"
                    step="0.1"
                    placeholder="0-3"
                    required
                    value={form.cdrScore}
                    onChange={onFieldChange("cdrScore")}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 hover:border-gray-300 focus:border-green-primary focus:bg-white focus:ring-4 focus:ring-green-primary/10"
                  />
                </label>

                <div className="sm:col-span-2 lg:col-span-2 space-y-1.5">
                  <span className="block text-sm font-semibold text-gray-700 ml-1">Physical Activity Level</span>
                  <div className="flex gap-2">
                    {['low', 'moderate', 'high'].map((l) => (
                      <button
                        type="button"
                        key={l}
                        onClick={() => setForm(prev => ({ ...prev, physicalActivityLevel: l }))}
                        className={`flex-1 rounded-2xl border py-3 text-sm font-bold capitalize transition-all duration-200 ${form.physicalActivityLevel === l ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm scale-[1.02]' : 'border-gray-200 bg-gray-50/50 text-gray-500 hover:border-gray-300 hover:bg-gray-100 hover:text-gray-700'}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div 
                  onClick={() => setForm(prev => ({...prev, familyHistory: !prev.familyHistory}))}
                  className={`sm:col-span-2 lg:col-span-2 h-full flex cursor-pointer items-center gap-3 rounded-2xl border px-5 py-2.5 transition-all duration-300 ${form.familyHistory ? 'border-sky-300 bg-sky-50 shadow-sm scale-[1.01]' : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-white'}`}
                >
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${form.familyHistory ? 'border-sky-500 bg-sky-500 text-white' : 'border-gray-300 bg-white'}`}>
                    {form.familyHistory && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <div className={`text-sm font-bold ${form.familyHistory ? 'text-sky-900' : 'text-gray-700'}`}>Family history of dementia</div>
                    <div className={`text-xs mt-0.5 leading-snug ${form.familyHistory ? 'text-sky-700/80' : 'text-gray-500'}`}>Check if a direct relative has a diagnosis.</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="group inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-3.5 text-sm font-bold text-white transition-all hover:bg-green-primary hover:shadow-lg hover:shadow-green-primary/30 active:scale-95"
                >
                  Proceed to Voice Test
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700 fill-mode-both relative">
              <AudioRecorder
                audioBlob={audioBlob}
                setAudioBlob={setAudioBlob}
                disabled={isSubmitting}
              />

              {audioBlob && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Audio sample ready.
                </div>
              )}

              {submitError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                  <TriangleAlert className="h-4 w-4" />
                  {submitError}
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-green-primary hover:text-green-primary disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleSubmitAssessment}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-full bg-green-primary px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-green-dark disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Assessment
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
