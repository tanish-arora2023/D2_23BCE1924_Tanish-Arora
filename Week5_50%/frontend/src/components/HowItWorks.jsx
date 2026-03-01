import { UserPlus, ClipboardList, Mic, LineChart } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: UserPlus,
    title: "Create a Secure Profile",
    desc: "Log in as a patient or caregiver. Your data is encrypted from the start.",
  },
  {
    num: "02",
    icon: ClipboardList,
    title: "Take the Assessment",
    desc: "Complete interactive cognitive tasks that test memory, attention, and reasoning.",
  },
  {
    num: "03",
    icon: Mic,
    title: "Record Speech Samples",
    desc: "Provide audio responses so our AI can analyze pauses, pitch, and speech features.",
  },
  {
    num: "04",
    icon: LineChart,
    title: "Get Insights & Recommendations",
    desc: "Receive your AI risk score and personalised nearby doctor suggestions instantly.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            How NeuroScreen{" "}
            <span className="font-serif italic text-green-primary">works</span>
          </h2>
          <p className="mt-4 text-gray-600 leading-relaxed">
            From sign‑up to results in just four simple steps.
          </p>
        </div>

        {/* Stepper grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <div key={s.num} className="relative group">
              {/* Connector line (hidden on last) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-0.5 bg-green-light" />
              )}
              <div className="flex flex-col items-center text-center">
                <span className="text-xs font-bold text-green-primary bg-green-light px-3 py-1 rounded-full mb-4">
                  Step {s.num}
                </span>
                <div className="w-16 h-16 rounded-2xl bg-green-light flex items-center justify-center mb-5 group-hover:bg-green-primary transition-colors">
                  <s.icon className="w-7 h-7 text-green-primary group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-semibold text-gray-900 text-base mb-2">
                  {s.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
