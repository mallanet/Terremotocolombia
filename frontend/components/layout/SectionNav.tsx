"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, HandCoins, HeartHandshake, MapPinned } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { SiteBrand } from "./HeroSection";
import { usePsychHelpClickCount, trackPsychosocialClick } from "@/hooks/psychology-help";
import { trackPsychHelpClicked } from "@/lib/analytics";
import { PSYCH_HELP_FORM_URL } from "@/lib/psych-help-form";
import { PRIMARY_MAP_LINK } from "@/lib/section-nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export { MobileStickyNav } from "./MobileStickyNav";

// Lista PROPIA del header de escritorio, deliberadamente mas corta que
// SECTION_LINKS (que alimenta la hoja del menu movil): aqui solo caben los
// destinos de primer nivel. Si añades uno, añadelo tambien a SECTION_LINKS o
// quedara fuera del menu movil.
const DESKTOP_HEADER_LINKS = [
  { href: "/mapa-de-rescate", label: "Mapa de rescate" },
  { href: "#mapa", label: "Mapa de suministro" },
  { href: "#e-directory", label: "Personas" },
  { href: "/mascotas", label: "Mascotas" },
  { href: "/acopio", label: "Acopio" },
  { href: "/guia", label: "Guía" },
] as const;

function isAnchor(href: string): boolean {
  return href.startsWith("#");
}

function scrollToSection(href: string) {
  const id = href.replace(/^#/, "");
  if (!id) return;

  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
    return;
  }

  window.location.hash = id;
}

function NavHeaderActions() {
  return (
    <div className="e-nav__actions">
      <HelpNavLink />
      <DonateNavLink />
    </div>
  );
}

// Botón "Ayuda" del header: menú con las dos rutas de apoyo — ayuda
// psicosocial (grupo de WhatsApp; Doppler NEXT_PUBLIC_WHATSAPP_GROUP_URL,
// nunca commiteado: el content audit veta el dominio de invitaciones) y ayuda
// psicológica (formulario Google PSYCH_HELP_FORM_URL). Sin la variable solo
// se ofrece el formulario. El portal /psicologia (login) y /apoyo-disponible
// siguen existiendo como rutas propias.
const PSYCHOSOCIAL_WHATSAPP_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL ?? "";

function HelpNavLink() {
  // El contador cuenta CLICS únicos por IP (dedup server-side): el destino es
  // WhatsApp y no hay "envío" observable — el clic es la señal real.
  const { data: count } = usePsychHelpClickCount();
  const countLabel = count !== undefined ? count.toLocaleString("es") : null;

  const buttonAriaLabel =
    countLabel !== null
      ? `Ayuda: ${countLabel} personas se han sumado; abre el menú de opciones de ayuda`
      : "Ayuda: abre el menú de opciones de ayuda";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="e-nav__psych"
          aria-label={buttonAriaLabel}
        >
          <HeartHandshake aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.2} />
          Ayuda
          {count !== undefined ? (
            <Badge
              variant="secondary"
              className="e-nav__psych-count ml-0.5 h-5 min-w-5 rounded-full px-1.5 text-[10px] font-bold tabular-nums"
            >
              {countLabel}
            </Badge>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Opciones de ayuda
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PSYCHOSOCIAL_WHATSAPP_URL ? (
          <DropdownMenuItem asChild>
            <a
              href={PSYCHOSOCIAL_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ayuda psicosocial: únete al grupo de WhatsApp (se abre en pestaña nueva)"
              onClick={() => {
                trackPsychosocialClick();
                trackPsychHelpClicked("header");
              }}
              className="cursor-pointer gap-2"
            >
              <WhatsAppIcon className="h-4 w-4 shrink-0" aria-hidden />
              Ayuda psicosocial
            </a>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <a
            href={PSYCH_HELP_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ayuda psicológica: abrir formulario de apoyo (se abre en pestaña nueva)"
            className="cursor-pointer gap-2"
          >
            <Brain aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.2} />
            Ayuda psicológica
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DonateNavLink() {
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

export function HeroDesktopNav() {
  const pathname = usePathname();
  const onHome = pathname === "/";

  return (
    <header className="e-nav">
      <div className="e-nav__inner">
        <SiteBrand
          onClick={onHome ? () => scrollToSection("main") : undefined}
        />
        <nav aria-label="Secciones principales" className="e-nav__menu">
          <div className="e-nav__links">
            {DESKTOP_HEADER_LINKS.filter(
              (link) =>
                !(
                  pathname === "/mapa-de-rescate" &&
                  link.href === pathname
                ),
            ).map((link) => {
              const anchor = isAnchor(link.href);
              const href = anchor && !onHome ? `/${link.href}` : link.href;
              return (
                <a
                  key={link.href}
                  href={href}
                  aria-current={!anchor && pathname === link.href ? "page" : undefined}
                  onClick={(event) => {
                    if (!anchor || !onHome) return;
                    event.preventDefault();
                    scrollToSection(link.href);
                  }}
                >
                  {link.label}
                </a>
              );
            })}
          </div>
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
