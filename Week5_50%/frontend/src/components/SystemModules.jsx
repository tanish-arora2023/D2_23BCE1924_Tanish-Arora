import {
  BrainCircuit,
  Mic2,
  BarChart3,
  Layers,
  LayoutDashboard,
  MapPin,
} from "lucide-react";

const modules = [
  {
    icon: BrainCircuit,
    title: "Cognitive Assessment",
    desc: "Memory, attention, and problem-solving tests designed to evaluate multiple cognitive domains.",
  },
  {
    icon: Mic2,
    title: "Speech Processing",
    desc: "Records voice samples via microphone to analyze pauses, pitch, and speech patterns.",
  },
  {
    icon: BarChart3,
    title: "ML Risk Prediction",
    desc: "Classifies dementia risk using ensemble ML models and generates a 0–100% confidence score.",
  },
  {
    icon: Layers,
    title: "Stage Classification",
    desc: "Optional prediction of dementia progression stage to guide clinical follow-ups.",
  },
  {
    icon: LayoutDashboard,
    title: "Result Dashboards",
    desc: "Graphical display of scores and historical trends so patients and caregivers can track progress.",
  },
  {
    icon: MapPin,
    title: "Specialist Recommendations",
    desc: "Suggests nearby neurologists and specialists using your location data.",
  },
];

export default function SystemModules() {
  return (
    <section id="features" className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Our system{" "}
            <span className="font-serif italic text-green-primary">
              modules
            </span>
          </h2>
          <p className="mt-4 text-gray-600 leading-relaxed">
            A comprehensive set of tools built to screen, classify, and guide —
            all in one seamless experience.
          </p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m) => (
            <div
              key={m.title}
              className="bg-green-dark rounded-2xl p-7 flex flex-col gap-4 hover:scale-[1.02] transition-transform"
            >
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <m.icon className="w-6 h-6 text-green-accent" />
              </div>
              <h3 className="text-white font-semibold text-lg">{m.title}</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
