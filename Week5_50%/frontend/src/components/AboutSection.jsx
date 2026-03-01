import {
  HeartPulse,
  Brain,
  ShieldCheck,
  Users,
  Target,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export default function AboutSection() {
  return (
    <section id="about" className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Top: label + heading row ── */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left – label, icon cluster */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-green-primary mb-1">
              — Our Mission
            </p>
            <p className="text-sm text-gray-500 mb-8">About NeuroScreen</p>

            {/* Icon mosaic */}
            <div className="grid grid-cols-3 gap-4 max-w-xs">
              <div className="col-span-2 row-span-2 flex items-center justify-center rounded-3xl bg-green-primary p-8 shadow-lg">
                <Brain className="w-16 h-16 text-white" />
              </div>
              <div className="flex items-center justify-center rounded-2xl bg-green-light p-4">
                <HeartPulse className="w-7 h-7 text-green-primary" />
              </div>
              <div className="flex items-center justify-center rounded-2xl bg-cream p-4">
                <ShieldCheck className="w-7 h-7 text-green-primary" />
              </div>
            </div>
          </div>

          {/* Right – headline + description */}
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-snug text-gray-900">
              At NeuroScreen, we make cognitive health screening{" "}
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
