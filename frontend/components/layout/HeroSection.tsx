"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Moon, Phone, Sun } from "lucide-react";
import {
  SITE_NAV_LOGO,
  SITE_NAV_LOGO_ON_DARK,
  SITE_BRAND_NAME,
  SITE_PRODUCT_NAME,
} from "@/lib/site";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
  emphasis?: "urgent" | "default";
}

function HeroAccessCard({
  icon,
  title,
  description,
  onClick,
  emphasis = "default",
}: HeroAccessCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl bg-white/10 p-3 text-left ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-white/20 hover:ring-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 active:scale-[0.98] sm:p-4",
        emphasis === "urgent" &&
          "bg-destructive/25 ring-destructive/60 hover:bg-destructive/35 hover:ring-destructive/80",
      )}
    >
      <span aria-hidden className="size-9 shrink-0 sm:size-10">
        <Image
          src={icon}
          alt=""
          width={40}
          height={40}
          unoptimized
          className="size-full object-contain"
        />
      </span>
      <span className="min-w-0">
        <span className="block font-heading text-sm leading-tight font-bold sm:text-base">
          {title}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-white/70 sm:text-xs">
          {description}
        </span>
      </span>
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
    <header className="relative overflow-hidden bg-[#0f2154] text-white">
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(135deg,#0f2154_0%,#163a6e_45%,#4080f2_140%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(56%_90%_at_18%_0%,rgba(64,128,242,0.35),transparent_62%)]"
      />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 py-12 text-center sm:px-6 sm:py-16">
        <Badge
          variant="outline"
          className="h-auto border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] whitespace-normal text-white/85 uppercase"
        >
          {SITE_PRODUCT_NAME} · una iniciativa de {SITE_BRAND_NAME}
        </Badge>
        <h1 className="mt-4 max-w-3xl font-heading text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">
          Estamos contigo. ¿Qué necesitas hacer?
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-pretty text-white/80 sm:text-base">
          Mapa y directorios ciudadanos para coordinar ayuda. No somos un
          canal oficial.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-6 rounded-full bg-destructive font-bold text-white shadow-lg hover:bg-destructive/85"
        >
          <a href="tel:123">
            <Phone data-icon="inline-start" aria-hidden />
            En peligro llama al 123
          </a>
        </Button>

        <div className="mt-10 grid w-full max-w-4xl grid-cols-2 gap-2.5 lg:grid-cols-4">
          <HeroAccessCard
            icon="/brand/icons/icon-rescate-red.png"
            title="Necesito Ayuda"
            description="Estoy en peligro o necesito insumos."
            onClick={goHelp}
            emphasis="urgent"
          />
          <HeroAccessCard
            icon="/brand/icons/icon-buscar.png"
            title="Buscar personas"
            description="No encuentro a alguien que conozco."
            onClick={goMissing}
          />
          <HeroAccessCard
            icon="/brand/icons/icon-reporte.png"
            title="Reportar Información"
            description="Emergencias, refugios, suministros y más."
            onClick={openEmergencyReport}
          />
          <HeroAccessCard
            icon="/brand/icons/icon-ayuda.png"
            title="Puedo Ayudar"
            description="Siendo voluntario, donando o apoyando."
            onClick={goVolunteer}
          />
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
