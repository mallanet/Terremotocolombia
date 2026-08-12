"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  HeartHandshake,
  LifeBuoy,
  Megaphone,
  Moon,
  Sun,
  UserSearch,
  type LucideIcon,
} from "lucide-react";
import {
  SITE_NAV_LOGO,
  SITE_NAV_LOGO_ON_DARK,
  SITE_BRAND_NAME,
  SITE_PRODUCT_NAME,
} from "@/lib/site";
import { toggleTheme } from "./ThemeProvider";

const OPEN_EMERGENCY_REPORT_EVENT = "open-emergency-report";

function scrollToSection(id: string) {
  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  } else {
    window.location.hash = id;
  }
}

interface HeroAccessCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}

function HeroAccessCard({ icon: Icon, title, description, onClick }: HeroAccessCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="e-hero__access-card"
    >
      <span className="e-hero__card-icon" aria-hidden>
        <Icon strokeWidth={1.5} />
      </span>
      <div className="e-hero__card-title">{title}</div>
      <div className="e-hero__card-desc">{description}</div>
    </button>
  );
}

export default function HeroSection() {
  const goMissing = useCallback(() => scrollToSection("e-directory"), []);
  const goHelp = useCallback(() => scrollToSection("tutorial"), []);
  const goVolunteer = useCallback(() => scrollToSection("equipo"), []);
  const openEmergencyReport = useCallback(() => {
    scrollToSection("mapa");
    window.dispatchEvent(new CustomEvent(OPEN_EMERGENCY_REPORT_EVENT));
  }, []);

  return (
    <header className="e-hero">
      <div className="e-hero__gradient">
        <div className="e-hero__bg-image" aria-hidden />
        <div className="e-hero__bg-overlay" aria-hidden />

        <div className="e-hero__inner">
          <p className="e-hero__eyebrow">
            {SITE_PRODUCT_NAME} · una iniciativa de {SITE_BRAND_NAME}
          </p>
          <h1 className="e-hero__title">
            Estamos contigo. ¿Qué necesitas hacer?
          </h1>
          <p className="e-hero__subtitle">
            Mapa y directorios ciudadanos para coordinar ayuda. No somos un
            canal oficial. En peligro llama al{" "}
            <a href="tel:123" className="underline">123</a>.
          </p>

          <div className="e-hero__card-grid">
            <HeroAccessCard
              icon={UserSearch}
              title="Buscar personas"
              description="No encuentro a alguien que conozco."
              onClick={goMissing}
            />
            <HeroAccessCard
              icon={Megaphone}
              title="Reportar Información"
              description="Emergencias, refugios, suministros y más."
              onClick={openEmergencyReport}
            />
            <HeroAccessCard
              icon={LifeBuoy}
              title="Necesito Ayuda"
              description="Estoy en peligro o necesito insumos."
              onClick={goHelp}
            />
            <HeroAccessCard
              icon={HeartHandshake}
              title="Puedo Ayudar"
              description="Siendo voluntario, donando o apoyando."
              onClick={goVolunteer}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

/** Logo + marca para la barra de navegación sticky. */
export function SiteBrand({ onClick }: { onClick?: () => void }) {
  const inner = (
    <>
      {/* Dual imgs: CSS [data-dark] show/hide — no JS theme subscription. */}
      <Image
        src={SITE_NAV_LOGO}
        alt=""
        width={44}
        height={44}
        unoptimized
        className="e-hero__brand-logo e-hero__brand-logo--on-light"
        aria-hidden
      />
      <Image
        src={SITE_NAV_LOGO_ON_DARK}
        alt=""
        width={44}
        height={44}
        unoptimized
        className="e-hero__brand-logo e-hero__brand-logo--on-dark"
        aria-hidden
      />
      <span className="e-hero__brand-lockup">
        <span className="e-hero__brand-name">{SITE_BRAND_NAME}</span>
        <span className="e-hero__product-name">{SITE_PRODUCT_NAME}</span>
      </span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="e-hero__brand-link">
        {inner}
      </button>
    );
  }

  return (
    <Link href="/" prefetch={false} className="e-hero__brand-link">
      {inner}
    </Link>
  );
}

/** Botón para alternar tema claro/oscuro en la nav. */
export function ThemeToggleButton() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.dataset.dark === "true");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-dark"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        toggleTheme();
        setIsDark((value) => !value);
      }}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="e-hero__theme-btn"
    >
      {isDark ? (
        <Sun aria-hidden className="size-4" strokeWidth={2.2} />
      ) : (
        <Moon aria-hidden className="size-4" strokeWidth={2.2} />
      )}
    </button>
  );
}
