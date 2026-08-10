import dynamic from "next/dynamic";
import EmergencyApp from "@/components/features/emergency";
import { HeroDesktopNav, MobileStickyNav } from "@/components/layout/SectionNav";
import SiteFooter from "@/components/layout/SiteFooter";
import HeroSection from "@/components/layout/HeroSection";
import HelpSection from "@/components/layout/HelpSection";
import TutorialSteps from "@/components/layout/TutorialSteps";
import { LazySection } from "@/components/ui/LazySection";
import { SectionLoading } from "@/components/ui/SectionLoading";

const MissingPersonsCarousel = dynamic(
  () => import("@/components/features/missing-carousel"),
  {
    loading: () => (
      <SectionLoading label="Cargando directorio de personas…" rows={3} />
    ),
  },
);

const EarthquakesPanel = dynamic(
  () => import("@/components/features/earthquakes"),
  {
    loading: () => (
      <SectionLoading label="Cargando sismos recientes…" rows={4} />
    ),
  },
);

export default function HomePage() {
  return (
    <>
      <HeroDesktopNav />
      <main id="main" className="e-shell-main">
        <HeroSection />

        <EmergencyApp />

        <MissingPersonsCarousel />

        <TutorialSteps />

        <HelpSection />

        <LazySection rootMargin="400px" minHeight={240}>
          <EarthquakesPanel />
        </LazySection>
      </main>

      <SiteFooter />
      <MobileStickyNav />
    </>
  );
}
