"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Brain, HandCoins, HeartHandshake, MapPinned } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { SiteBrand } from "./HeroSection";
import { toggleTheme } from "./ThemeProvider";
import { useMissingStats } from "@/hooks/missing";
import { usePsychHelpClickCount, trackPsychosocialClick } from "@/hooks/psychology-help";
import { trackPsychHelpClicked } from "@/lib/analytics";
import { PSYCH_HELP_FORM_URL } from "@/lib/psych-help-form";
import { SITE_PRODUCT_NAME } from "@/lib/site";
import {
  MOBILE_BAR_LINKS,
  PRIMARY_MAP_LINK,
  SECTION_LINKS,
  type SectionLink,
} from "@/lib/section-nav";

const SHARE_TEXT = `${SITE_PRODUCT_NAME}. Reporta y consulta el estado de las zonas en tiempo real.`;

const MOBILE_NAV_BOTTOM = "calc(3.25rem + env(safe-area-inset-bottom))";
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

function resolveHref(href: string, onHome: boolean): string {
  if (!isAnchor(href)) return href;
  return onHome ? href : `/${href}`;
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

function useIosScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const scrollY = window.scrollY;
    document.body.classList.add("mobile-sheet-open");
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      document.body.classList.remove("mobile-sheet-open");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}

function usePeopleTotals() {
  const { data: stats } = useMissingStats();
  return { missing: stats?.active ?? null, found: stats?.found ?? null };
}

function compactBadge(value: string): string {
  const digits = value.replace(/\D/g, "");
  const n = Number(digits);
  if (Number.isNaN(n) || n < 1000) return value;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  return `${Math.round(n / 1000)}k`;
}

function badgeValue(
  link: SectionLink,
  missing: number | null,
  found: number | null,
): string | null {
  if (link.badge === "missing" && missing !== null) {
    return missing.toLocaleString("es");
  }
  if (link.badge === "found" && found !== null) {
    return found.toLocaleString("es");
  }
  return null;
}

function NavHeaderActions() {
  return (
    <div className="e-nav__actions">
      <HelpNavLink variant="desktop" />
      <DonateNavLink variant="desktop" />
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

function HelpNavLink({
  variant,
  onNavigate,
}: {
  variant: "desktop" | "sheet";
  onNavigate?: () => void;
}) {
  // El contador cuenta CLICS únicos por IP (dedup server-side): el destino es
  // WhatsApp y no hay "envío" observable — el clic es la señal real.
  const { data: count } = usePsychHelpClickCount();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const countLabel = count !== undefined ? count.toLocaleString("es") : null;

  if (variant === "sheet") {
    const sheetClass =
      "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-950 transition hover:bg-blue-100";
    return (
      <span className="grid gap-2">
        {PSYCHOSOCIAL_WHATSAPP_URL ? (
          <a
            href={PSYCHOSOCIAL_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              trackPsychosocialClick();
              trackPsychHelpClicked("mobile_sheet");
              onNavigate?.();
            }}
            className={sheetClass}
            aria-label="Ayuda psicosocial: únete al grupo de WhatsApp (se abre en pestaña nueva)"
          >
            <HeartHandshake aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.2} />
            Ayuda psicosocial
            {count !== undefined ? (
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                {countLabel}
              </span>
            ) : null}
          </a>
        ) : null}
        <a
          href={PSYCH_HELP_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          className={sheetClass}
          aria-label="Ayuda psicológica: abrir formulario de apoyo (se abre en pestaña nueva)"
        >
          <Brain aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.2} />
          Ayuda psicológica
        </a>
      </span>
    );
  }

  const buttonAriaLabel =
    countLabel !== null
      ? `Ayuda: ${countLabel} personas se han sumado; abre el menú de opciones de ayuda`
      : "Ayuda: abre el menú de opciones de ayuda";

  return (
    <span className="e-nav__psych-wrap e-nav__help" ref={wrapRef}>
      <button
        type="button"
        className="e-nav__psych"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={buttonAriaLabel}
        onClick={() => setOpen((value) => !value)}
      >
        <HeartHandshake aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.2} />
        Ayuda
        {count !== undefined ? (
          <span className="e-nav__psych-count">{countLabel}</span>
        ) : null}
      </button>
      {open ? (
        <span role="menu" aria-label="Opciones de ayuda" className="e-nav__help-menu">
          {PSYCHOSOCIAL_WHATSAPP_URL ? (
            <a
              role="menuitem"
              href={PSYCHOSOCIAL_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ayuda psicosocial: únete al grupo de WhatsApp (se abre en pestaña nueva)"
              onClick={() => {
                trackPsychosocialClick();
                trackPsychHelpClicked("header");
                setOpen(false);
              }}
            >
              <WhatsAppIcon className="h-4 w-4 shrink-0" aria-hidden />
              Ayuda psicosocial
            </a>
          ) : null}
          <a
            role="menuitem"
            href={PSYCH_HELP_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ayuda psicológica: abrir formulario de apoyo (se abre en pestaña nueva)"
            onClick={() => setOpen(false)}
          >
            <Brain aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.2} />
            Ayuda psicológica
          </a>
        </span>
      ) : null}
    </span>
  );
}

function DonateNavLink({
  variant,
  onNavigate,
}: {
  variant: "desktop" | "sheet";
  onNavigate?: () => void;
}) {
  const className =
    variant === "desktop"
      ? "e-nav__donate"
      : "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-100";

  return (
    <Link
      href="/donaciones"
      onClick={onNavigate}
      className={className}
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

function ShareNavButton({ onAfterShare }: { onAfterShare?: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    onAfterShare?.();
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: SITE_PRODUCT_NAME,
          text: SHARE_TEXT,
          url,
        });
        return;
      } catch {
        /* cancelado */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* sin permisos */
    }
  }, [onAfterShare]);

  return (
    <button type="button" onClick={handleShare} className="e-nav__share-btn">
      <span aria-hidden>🔗</span>
      {copied ? "Enlace copiado" : "Compartir mapa"}
    </button>
  );
}

export function MobileStickyNav() {
  const { missing, found } = usePeopleTotals();
  const [sheetOpen, setSheetOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasSheetOpenRef = useRef(false);
  const pathname = usePathname();
  const router = useRouter();
  const onHome = pathname === "/";

  useEffect(() => {
    document.body.classList.add("has-mobile-nav");
    return () => document.body.classList.remove("has-mobile-nav");
  }, []);

  useIosScrollLock(sheetOpen);

  useEffect(() => {
    if (!sheetOpen) {
      if (wasSheetOpenRef.current) {
        wasSheetOpenRef.current = false;
        menuButtonRef.current?.focus();
      }
      return;
    }

    wasSheetOpenRef.current = true;
    const focusFrame = requestAnimationFrame(() => closeButtonRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSheetOpen(false);
        return;
      }
      if (e.key !== "Tab") return;

      const sheet = document.getElementById("mobile-section-sheet");
      const focusable = sheet?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  const sheetLinks = SECTION_LINKS.filter((link) => !link.mobileBar);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, link: SectionLink) => {
      if (isAnchor(link.href) && onHome) {
        e.preventDefault();
        scrollToSection(link.href);
      }
    },
    [onHome],
  );

  const handleSheetClick = useCallback(
    (link: SectionLink) => {
      setSheetOpen(false);
      if (isAnchor(link.href) && onHome) {
        window.setTimeout(() => scrollToSection(link.href), 50);
        return;
      }
      const href = resolveHref(link.href, onHome);
      if (href.startsWith("#")) {
        window.location.href = `/${href}`;
        return;
      }
      router.push(href);
    },
    [onHome, router],
  );

  return (
    <>
      <nav aria-label="Navegación rápida" className="e-nav__mobile-bar">
        <div className="e-nav__mobile-bar-grid">
          {MOBILE_BAR_LINKS.map((link) => {
            const badge = badgeValue(link, missing, found);
            return (
              <a
                key={link.href}
                href={resolveHref(link.href, onHome)}
                aria-label={link.label}
                aria-current={pathname === link.href ? "page" : undefined}
                onClick={(e) => handleBarClick(e, link)}
                className="e-nav__mobile-bar-item"
              >
                <span className="e-nav__mobile-bar-icon" aria-hidden>
                  {link.icon}
                  {badge && (
                    <span className="e-nav__mobile-badge">
                      {compactBadge(badge)}
                    </span>
                  )}
                </span>
                <span className="e-nav__mobile-bar-label">{link.shortLabel}</span>
              </a>
            );
          })}
          <button
            ref={menuButtonRef}
            type="button"
            aria-expanded={sheetOpen}
            aria-haspopup="dialog"
            aria-controls="mobile-section-sheet"
            onClick={() => setSheetOpen((open) => !open)}
            className="e-nav__mobile-bar-item"
          >
            <span className="e-nav__mobile-bar-icon" aria-hidden>
              {sheetOpen ? "×" : "☰"}
            </span>
            {sheetOpen ? "Cerrar" : "Más"}
          </button>
        </div>
      </nav>

      {sheetOpen && (
        <>
          <button
            type="button"
            aria-label="Cerrar menú de secciones"
            style={{ bottom: MOBILE_NAV_BOTTOM }}
            className="e-nav__sheet-backdrop"
            onClick={closeSheet}
          />

          <div
            id="mobile-section-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Más secciones"
            style={{ bottom: MOBILE_NAV_BOTTOM }}
            className="e-nav__sheet"
          >
            <div className="e-nav__sheet-header">
              <p className="e-nav__sheet-title">Más secciones</p>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeSheet}
                aria-label="Cerrar menú"
                className="e-nav__sheet-close"
              >
                ×
              </button>
            </div>
            <ul className="e-nav__sheet-list">
              {sheetLinks.map((link) => {
                const badge = badgeValue(link, missing, found);
                return (
                  <li key={link.href}>
                    <button
                      type="button"
                      onClick={() => handleSheetClick(link)}
                      className="e-nav__sheet-item-btn"
                    >
                      <span className="e-nav__sheet-item-icon" aria-hidden>
                        {link.icon}
                      </span>
                      <span className="e-nav__sheet-item-label">{link.label}</span>
                      {badge && (
                        <span className="e-nav__sheet-item-badge">{badge}</span>
                      )}
                    </button>
                  </li>
                );
              })}
              <li className="e-nav__sheet-section">
                <button
                  type="button"
                  onClick={() => {
                    toggleTheme();
                    closeSheet();
                  }}
                  className="e-nav__sheet-item-btn"
                >
                  <span className="e-nav__sheet-item-icon" aria-hidden>
                    🌓
                  </span>
                  Cambiar tema claro/oscuro
                </button>
              </li>
              <li className="e-nav__sheet-section">
                <HelpNavLink variant="sheet" onNavigate={closeSheet} />
              </li>
              <li className="e-nav__sheet-section">
                <DonateNavLink variant="sheet" onNavigate={closeSheet} />
              </li>
              <li className="e-nav__sheet-section">
                <div className="e-nav__share-row">
                  <div className="e-nav__share-col">
                    <ShareNavButton onAfterShare={closeSheet} />
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </>
      )}
    </>
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
