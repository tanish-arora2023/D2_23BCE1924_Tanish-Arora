import { BrainCircuit, AudioWaveform, ShieldCheck, Globe } from "lucide-react";

const features = [
  {
    icon: BrainCircuit,
    title: "Interactive Tests",
    desc: "Memory and attention assessment",
  },
  {
    icon: AudioWaveform,
    title: "Voice Analysis",
    desc: "Extracts speech features for ML processing",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Private",
    desc: "Anonymized patient data and encrypted storage",
  },
  {
    icon: Globe,
    title: "Accessible Anywhere",
    desc: "Affordable web‑based screening",
  },
];

export default function FeaturesStrip() {
  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex flex-col items-center text-center p-6 rounded-2xl hover:shadow-lg transition-shadow bg-cream"
            >
              <div className="w-14 h-14 rounded-full bg-green-light flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-green-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm md:text-base">
                {f.title}
              </h3>
              <p className="text-gray-500 text-xs md:text-sm mt-1 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
