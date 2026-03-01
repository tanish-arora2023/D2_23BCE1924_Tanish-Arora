import {
  ArrowRight,
  Play,
  Mic,
  BarChart3,
  Brain,
  Activity,
  ShieldCheck,
  HeartPulse,
  Cpu,
  AudioWaveform,
} from "lucide-react";

export default function HeroSection() {
  return (
    <section
      id="home"
      className="pt-24 md:pt-32 pb-12 md:pb-20 bg-cream overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left content */}
          <div className="order-2 lg:order-1">
            <p className="text-green-primary font-semibold text-sm uppercase tracking-wider mb-3">
              AI‑Powered Cognitive Health
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-tight text-gray-900">
              Early detection for a{" "}
              <span className="font-serif italic text-green-primary">
                better tomorrow.
              </span>
            </h1>
            <p className="mt-5 text-gray-600 text-base md:text-lg max-w-lg leading-relaxed">
              We bring AI‑powered dementia screening to your home. Complete
              interactive tests and voice analysis from any device — no clinic
              visit required.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#assessment"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-green-primary text-white font-semibold text-sm hover:bg-green-dark transition-colors"
              >
                Start Cognitive Test
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border-2 border-green-primary text-green-primary font-semibold text-sm hover:bg-green-primary hover:text-white transition-colors"
              >
                <Play className="w-4 h-4" />
                Learn How It Works
              </a>
            </div>
          </div>

          {/* Right – custom icon illustration */}
          <div className="order-1 lg:order-2 relative flex justify-center">
            <div className="relative w-full max-w-md lg:max-w-lg aspect-square">
              {/* Background decorative circle */}
              <div className="absolute inset-4 rounded-full bg-green-light/60" />
              <div className="absolute inset-10 rounded-full bg-green-light" />

              {/* Centre brain icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-green-primary flex items-center justify-center shadow-2xl">
                  <Brain className="w-16 h-16 sm:w-20 sm:h-20 text-white" />
                </div>
              </div>

              {/* Orbiting satellite icons */}
              {/* Top */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center">
                <Activity className="w-7 h-7 text-green-primary" />
              </div>
              {/* Right */}
              <div className="absolute top-1/2 right-2 -translate-y-1/2 w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center">
                <Cpu className="w-7 h-7 text-green-accent" />
              </div>
              {/* Bottom */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center">
                <HeartPulse className="w-7 h-7 text-rose-500" />
              </div>
              {/* Left */}
              <div className="absolute top-1/2 left-2 -translate-y-1/2 w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center">
                <AudioWaveform className="w-7 h-7 text-green-primary" />
              </div>

              {/* Diagonal satellites */}
              {/* Top-right */}
              <div className="absolute top-[12%] right-[12%] w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-green-primary" />
              </div>
              {/* Bottom-left */}
              <div className="absolute bottom-[12%] left-[12%] w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center">
                <Mic className="w-6 h-6 text-green-accent" />
              </div>

              {/* Floating badge – AI Speech Analysis */}
              <div className="absolute top-[18%] -left-4 sm:-left-10 bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-light flex items-center justify-center">
                  <Mic className="w-5 h-5 text-green-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">
                    AI Speech Analysis
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Voice biomarkers detected
                  </p>
                </div>
              </div>

              {/* Floating badge – Instant Risk Score */}
              <div className="absolute bottom-[18%] -right-4 sm:-right-10 bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-light flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-green-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">
                    Instant Risk Score
                  </p>
                  <p className="text-[11px] text-gray-500">0–100% confidence</p>
                </div>
              </div>

              {/* Decorative floating dots */}
             
              
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
