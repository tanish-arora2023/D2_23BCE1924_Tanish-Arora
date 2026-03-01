import Navbar from "../components/Navbar";
import HeroSection from "../components/HeroSection";
import FeaturesStrip from "../components/FeaturesStrip";
import AboutSection from "../components/AboutSection";
import SystemModules from "../components/SystemModules";
import HowItWorks from "../components/HowItWorks";
import AssessmentPage from "../components/AssessmentPage";
import TeamSection from "../components/TeamSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-green-primary font-sans antialiased">
      <div
        className="mx-auto max-w-[1440px] bg-white"
        style={{
          marginTop: "calc((100vw - min(100vw, 1440px)) / 2)",
          marginBottom: "calc((100vw - min(100vw, 1440px)) / 2)",
        }}
      >
        <Navbar />
        <main>
          <HeroSection />
          <FeaturesStrip />
          <AboutSection />
          <SystemModules />
          <HowItWorks />
          <AssessmentPage />
          <TeamSection />
        </main>
      </div>
    </div>
  );
}
