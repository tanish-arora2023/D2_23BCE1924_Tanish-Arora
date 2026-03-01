import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Mic,
  MicOff,
  CheckCircle,
  Brain,
  ClipboardList,
  AudioWaveform,
  Clock,
  RotateCcw,
} from "lucide-react";

/* ─────────── mock data ─────────── */
const MEMORY_WORDS = ["Apple", "Table", "Coin"];

const COGNITIVE_QUESTIONS = [
  {
    id: 1,
    type: "memory",
    prompt: "Take a moment to memorise these three words:",
    words: MEMORY_WORDS,
    instruction: "You will be asked to recall them later.",
  },
  {
    id: 2,
    type: "math",
    prompt: "What is 100 minus 7?",
    options: ["91", "93", "95", "97"],
    answer: "93",
  },
  {
    id: 3,
    type: "math",
    prompt: "If today is Wednesday, what day was it 3 days ago?",
    options: ["Sunday", "Monday", "Tuesday", "Saturday"],
    answer: "Sunday",
  },
  {
    id: 4,
    type: "recall",
    prompt: "Can you recall the three words from earlier?",
    instruction: "Type each word separated by a comma.",
  },
];

const SPEECH_SENTENCE =
  "The quick brown fox jumped over the lazy dog near the river bank on a sunny afternoon.";

/* ─────────── component ─────────── */
export default function AssessmentPage() {
  const [step, setStep] = useState(0); // 0 = intro, 1–N = cognitive, N+1 = speech, N+2 = done
  const [answers, setAnswers] = useState({});
  const [recallInput, setRecallInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDone, setRecordingDone] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);

  const totalCognitive = COGNITIVE_QUESTIONS.length;
  const speechStep = totalCognitive + 1;
  const doneStep = totalCognitive + 2;

  /* recording timer */
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const fmtTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  /* handlers */
  const selectOption = (qId, value) =>
    setAnswers((prev) => ({ ...prev, [qId]: value }));

  const startRecording = () => {
    setSeconds(0);
    setIsRecording(true);
    setRecordingDone(false);
  };
  const stopRecording = () => {
    setIsRecording(false);
    setRecordingDone(true);
  };

  /* ─── sub-renders ─── */

  /* intro */
  const renderIntro = () => (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-light">
        <Brain className="h-10 w-10 text-green-primary" />
      </div>
      <h2 className="font-serif text-3xl font-bold text-gray-900 sm:text-4xl">
        Cognitive Health Assessment
      </h2>
      <p className="mt-4 max-w-md text-gray-500 leading-relaxed">
        This short assessment takes about{" "}
        <span className="font-semibold text-green-primary">5 minutes</span>. It
        includes a quick memory &amp; reasoning test followed by a brief voice
        recording.
      </p>

      <div className="mt-8 grid w-full max-w-sm gap-4 sm:grid-cols-3">
        {[
          { icon: ClipboardList, label: "Cognitive test" },
          { icon: AudioWaveform, label: "Voice analysis" },
          { icon: Clock, label: "~5 minutes" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center gap-2 rounded-xl bg-cream p-4"
          >
            <item.icon className="h-6 w-6 text-green-primary" />
            <span className="text-xs font-medium text-gray-600">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => setStep(1)}
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-green-primary px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-green-dark"
      >
        Start Assessment
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );

  /* cognitive questions */
  const renderCognitive = () => {
    const q = COGNITIVE_QUESTIONS[step - 1];
    const progress = Math.round((step / totalCognitive) * 100);

    return (
      <div className="w-full">
        {/* progress */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500">
            <span>
              Question {step} of {totalCognitive}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-green-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* question card */}
        <div className="rounded-2xl bg-cream p-6 sm:p-10">
          <p className="text-lg font-semibold text-gray-900 sm:text-xl">
            {q.prompt}
          </p>

          {/* memory words */}
          {q.type === "memory" && (
            <div className="mt-6">
              <div className="flex flex-wrap justify-center gap-4">
                {q.words.map((w) => (
                  <span
                    key={w}
                    className="rounded-xl bg-green-primary px-6 py-3 text-lg font-bold text-white shadow"
                  >
                    {w}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm text-gray-500">{q.instruction}</p>
            </div>
          )}

          {/* multiple choice */}
          {q.type === "math" && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {q.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => selectOption(q.id, opt)}
                  className={`rounded-xl border-2 px-5 py-4 text-left text-base font-medium transition-all ${
                    answers[q.id] === opt
                      ? "border-green-primary bg-green-light text-green-primary"
                      : "border-gray-200 bg-white text-gray-700 hover:border-green-primary/40"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* recall input */}
          {q.type === "recall" && (
            <div className="mt-6">
              <p className="mb-3 text-sm text-gray-500">{q.instruction}</p>
              <input
                type="text"
                value={recallInput}
                onChange={(e) => {
                  setRecallInput(e.target.value);
                  selectOption(q.id, e.target.value);
                }}
                placeholder="e.g. Apple, Table, Coin"
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-5 py-4 text-base text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-green-primary"
              />
            </div>
          )}
        </div>

        {/* nav buttons */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => s - 1)}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-green-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={q.type === "math" && !answers[q.id]}
            className="inline-flex items-center gap-2 rounded-full bg-green-primary px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-green-dark disabled:opacity-40"
          >
            {step === totalCognitive ? "Continue to Voice Test" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  /* speech analysis */
  const renderSpeech = () => (
    <div className="flex w-full flex-col items-center text-center">
      <h3 className="font-serif text-2xl font-bold text-gray-900 sm:text-3xl">
        Voice Analysis
      </h3>
      <p className="mt-3 max-w-md text-gray-500 leading-relaxed">
        Please read the following sentence aloud clearly and at a comfortable
        pace.
      </p>

      <div className="mt-8 w-full rounded-2xl bg-cream p-6 sm:p-10">
        <p className="text-lg font-medium leading-relaxed text-gray-800 sm:text-xl">
          &ldquo;{SPEECH_SENTENCE}&rdquo;
        </p>
      </div>

      {/* record button */}
      <div className="mt-10 flex flex-col items-center gap-4">
        {!isRecording && !recordingDone && (
          <button
            onClick={startRecording}
            className="group flex h-24 w-24 items-center justify-center rounded-full bg-green-primary shadow-lg transition-transform hover:scale-105"
          >
            <Mic className="h-10 w-10 text-white" />
          </button>
        )}

        {isRecording && (
          <>
            {/* pulsing indicator */}
            <div className="relative flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/30" />
              <span className="absolute inset-2 animate-pulse rounded-full bg-rose-400/20" />
              <button
                onClick={stopRecording}
                className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-rose-500 shadow-lg transition-transform hover:scale-105"
              >
                <MicOff className="h-9 w-9 text-white" />
              </button>
            </div>
            <span className="font-mono text-sm font-semibold text-rose-600">
              {fmtTime(seconds)} recording…
            </span>
          </>
        )}

        {recordingDone && !isRecording && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-light">
              <CheckCircle className="h-10 w-10 text-green-primary" />
            </div>
            <p className="text-sm font-medium text-green-primary">
              Recording captured — {fmtTime(seconds)}
            </p>
            <button
              onClick={startRecording}
              className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-green-primary"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Re‑record
            </button>
          </div>
        )}

        {!isRecording && (
          <p className="text-xs text-gray-400">
            {recordingDone
              ? "You can re‑record or submit."
              : "Tap the microphone to begin recording."}
          </p>
        )}
      </div>

      {/* action buttons */}
      <div className="mt-10 flex w-full items-center justify-between">
        <button
          onClick={() => setStep(totalCognitive)}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-green-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        {recordingDone && (
          <button
            onClick={() => setStep(doneStep)}
            className="inline-flex items-center gap-2 rounded-full bg-green-primary px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-green-dark"
          >
            Submit Assessment
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  /* done */
  const renderDone = () => (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-light">
        <CheckCircle className="h-10 w-10 text-green-primary" />
      </div>
      <h2 className="font-serif text-3xl font-bold text-gray-900 sm:text-4xl">
        Assessment Complete
      </h2>
      <p className="mt-4 max-w-md text-gray-500 leading-relaxed">
        Thank you for completing the NeuroScreen assessment. Your results are
        being analysed and will be available shortly.
      </p>
      <div className="mt-8 w-full max-w-sm rounded-2xl bg-cream-dark p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-green-primary">
          What happens next?
        </p>
        <ul className="mt-3 space-y-2 text-left text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-primary" />
            AI processes your cognitive responses
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-primary" />
            Voice biomarkers are extracted &amp; analysed
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-primary" />
            A personalised risk report is generated
          </li>
        </ul>
      </div>
      <a
        href="#home"
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-green-primary px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-green-dark"
      >
        Back to Home
      </a>
    </div>
  );

  /* ─── main render ─── */
  const renderStep = () => {
    if (step === 0) return renderIntro();
    if (step >= 1 && step <= totalCognitive) return renderCognitive();
    if (step === speechStep) return renderSpeech();
    return renderDone();
  };

  return (
    <section id="assessment" className="bg-cream py-20 md:py-28">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10 md:p-14">
          {renderStep()}
        </div>
      </div>
    </section>
  );
}
