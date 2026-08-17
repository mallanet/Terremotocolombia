"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HandCoins, HeartHandshake, MapPinned } from "lucide-react";
import { SiteBrand } from "./HeroSection";
import { usePsychHelpClickCount } from "@/hooks/psychology-help";
import {
  PRIMARY_MAP_LINK,
  SUPPORT_DIRECTORY_PATH,
} from "@/lib/section-nav";
import { DesktopHeaderLinks, scrollToSection } from "./DesktopHeaderLinks";
import { DONATE_LINK, DONATION_URL } from "@/lib/site";
import { Badge } from "@/components/ui/badge";

export { MobileStickyNav } from "./MobileStickyNav";

function scrollToMain() {
  scrollToSection("main");
}

function NavHeaderActions() {
  return (
    <div className="e-nav__actions">
      <HelpNavLink />
      <DonateNavLink />
    </div>
  );
}

function HelpNavLink() {
  const { data: count } = usePsychHelpClickCount();
  const countLabel = count !== undefined ? count.toLocaleString("es") : null;

  const buttonAriaLabel =
    countLabel !== null
      ? `Ayuda: ${countLabel} personas se han sumado; ver apoyo disponible`
      : "Ver apoyo disponible";

  return (
    <Link
      href={SUPPORT_DIRECTORY_PATH}
      className="e-nav__psych"
      aria-label={buttonAriaLabel}
    >
      <HeartHandshake
        aria-hidden
        className="h-4 w-4 shrink-0"
        strokeWidth={2.2}
      />
      Ayuda
      {count !== undefined ? (
        <Badge
          variant="secondary"
          className="e-nav__psych-count ml-0.5 h-5 min-w-5 rounded-full px-1.5 text-[10px] font-bold tabular-nums"
        >
          {countLabel}
        </Badge>
      ) : null}
    </Link>
  );
}

function DonatePaymentLink() {
  return (
    <a
      href={DONATE_LINK.href}
      target={DONATE_LINK.target}
      rel={DONATE_LINK.rel}
      className="e-nav__donate"
      aria-label={DONATE_LINK.aria}
    >
      <HandCoins aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.2} />
      {DONATE_LINK.label}
    </a>
  );
}

function DonateSiteLink() {
  return (
    <Link
      href="/donaciones"
      className="e-nav__donate"
      aria-label="Ver formas de donar"
    >
      <HandCoins aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.2} />
      Donar
    </Link>
  );
}

function DonateNavLink() {
  return DONATION_URL ? <DonatePaymentLink /> : <DonateSiteLink />;
}

export function HeroDesktopNav() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const brandClick = onHome ? scrollToMain : undefined;

  return (
    <header className="e-nav">
      <div className="e-nav__inner">
        <SiteBrand onClick={brandClick} />
        <nav aria-label="Secciones principales" className="e-nav__menu">
          <DesktopHeaderLinks pathname={pathname} onHome={onHome} />
          <NavHeaderActions />
        </nav>
      </div>
    </header>
  );
}

export function HeroMobileCta() {
  return (
    <a
      href={PRIMARY_MAP_LINK.href}
      onClick={(e) => {
        if (window.matchMedia("(max-width: 767px)").matches) {
          e.preventDefault();
          scrollToSection(PRIMARY_MAP_LINK.href);
        }
      }}
      className="e-hero__mobile-cta"
    >
      <span aria-hidden>{PRIMARY_MAP_LINK.icon}</span>
      {PRIMARY_MAP_LINK.label}
    </a>
  );
}

export function MobileBackToMapCta() {
  return (
    <Link href="/#mapa" prefetch={false} className="e-hero__back-to-map">
      <MapPinned aria-hidden className="h-4 w-4" strokeWidth={2.2} />
      Volver al mapa
    </Link>
  );
}
