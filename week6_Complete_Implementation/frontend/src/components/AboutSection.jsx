import {
  Users,
  Target,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export default function AboutSection() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Top: label + heading row ── */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left – Image Section */}
          <div className="flex justify-center lg:justify-start">
            <div className="relative w-full max-w-md">
              {/* Decorative offset background */}
              <div className="absolute -inset-2 md:-inset-4 bg-green-50 rounded-[2.5rem] -rotate-2 transform-gpu shadow-sm"></div>
              {/* Image */}
              <img 
                src="/doc1.png" 
                alt="NeuroSense medical professional" 
                className="relative z-10 w-full h-auto object-cover rounded-[2rem] shadow-xl border-4 border-white"
              />
            </div>
          </div>

          {/* Right – headline + description */}
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-snug text-gray-900">
              At NeuroSense, we make cognitive health screening{" "}
              <span className="font-serif italic text-green-primary">
                simple, accessible,
              </span>{" "}
              and personal.
            </h2>
            <p className="mt-6 text-gray-600 leading-relaxed text-base md:text-lg">
              Our mission is to provide an affordable, accessible, and highly
              accurate AI system that screens users for early signs of dementia
              using cognitive tests and advanced speech analysis. By combining
              machine learning with evidence‑based assessments, we help detect
              risk factors before clinical symptoms fully emerge — connecting
              you with the care you need, anytime, anywhere.
            </p>
          </div>
        </div>

        {/* ── Bottom: value cards ── */}
        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Target,
              title: "Early Detection",
              desc: "Identify cognitive changes before they become clinical symptoms.",
            },
            {
              icon: Sparkles,
              title: "AI‑Powered",
              desc: "Advanced ML models analyse test responses and voice biomarkers.",
            },
            {
              icon: Users,
              title: "Patient‑Centred",
              desc: "Designed with elderly users in mind — simple, calm, and clear.",
            },
            {
              icon: TrendingUp,
              title: "Evidence‑Based",
              desc: "Built on validated cognitive screening protocols and research.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="group rounded-2xl border border-gray-100 bg-white p-6 transition-shadow hover:shadow-lg"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-light transition-colors group-hover:bg-green-primary">
                <item.icon className="h-6 w-6 text-green-primary transition-colors group-hover:text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">
                {item.title}
              </h3>
              <p className="text-gray-500 text-xs leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
