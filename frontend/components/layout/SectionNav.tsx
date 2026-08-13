"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Brain } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { SiteBrand } from "./HeroSection";
import { usePsychHelpClickCount, trackPsychosocialClick } from "@/hooks/psychology-help";
import { trackPsychHelpClicked } from "@/lib/analytics";
import { PSYCH_HELP_FORM_URL } from "@/lib/psych-help-form";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export { MobileStickyNav } from "./MobileStickyNav";

// Lista PROPIA del header de escritorio, deliberadamente mas corta que
// SECTION_LINKS (que alimenta la hoja del menu movil): aqui solo caben los
// destinos de primer nivel. Si añades uno, añádelo también a SECTION_LINKS o
// quedara fuera del menu movil.
const DESKTOP_HEADER_LINKS = [
  { href: "/mapa-de-rescate", label: "Rescate", title: "Mapa de rescate" },
  { href: "#mapa", label: "Suministros", title: "Mapa de suministro" },
  { href: "#e-directory", label: "Personas", title: "Personas" },
  { href: "/mascotas", label: "Mascotas", title: "Mascotas" },
  { href: "/acopio", label: "Acopio", title: "Acopio" },
  { href: "/guia", label: "Guía", title: "Guía" },
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
        <Button type="button" variant="outline" aria-label={buttonAriaLabel}>
          <Image
            src="/brand/icons/icon-ayuda.png"
            alt=""
            width={18}
            height={18}
            unoptimized
            aria-hidden
            data-icon="inline-start"
            className="shrink-0 object-contain"
          />
          Ayuda
          {count !== undefined ? (
            <Badge
              variant="secondary"
              className="ml-0.5 h-5 min-w-5 rounded-full px-1.5 text-[10px] font-bold tabular-nums"
            >
              {countLabel}
            </Badge>
          ) : null}
        </Button>
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
    <Button asChild>
      <Link href="/donaciones" aria-label="Ver formas de donar">
        <Image
          src="/brand/icons/icon-donar.png"
          alt=""
          width={18}
          height={18}
          unoptimized
          aria-hidden
          data-icon="inline-start"
          className="shrink-0 object-contain"
        />
        Donar
      </Link>
    </Button>
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
              const active = !anchor && pathname === link.href;
              return (
                <Button
                  key={link.href}
                  asChild
                  variant={active ? "secondary" : "ghost"}
                >
                  <a
                    href={href}
                    title={link.title}
                    aria-label={link.title}
                    aria-current={active ? "page" : undefined}
                    onClick={(event) => {
                      if (!anchor || !onHome) return;
                      event.preventDefault();
                      scrollToSection(link.href);
                    }}
                  >
                    {link.label}
                  </a>
                </Button>
              );
            })}
          </div>
          <NavHeaderActions />
        </nav>
      </div>
    </header>
  );
}
