"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Brain,
  Compass,
  HandCoins,
  Hospital,
  Map as MapIcon,
  Megaphone,
  Menu,
  MessagesSquare,
  Moon,
  Package,
  PawPrint,
  Phone,
  Share2,
  Sun,
  UserSearch,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { useMissingStats } from "@/hooks/missing";
import {
  trackPsychosocialClick,
  usePsychHelpClickCount,
} from "@/hooks/psychology-help";
import { trackPsychHelpClicked } from "@/lib/analytics";
import { PSYCH_HELP_FORM_URL } from "@/lib/psych-help-form";
import {
  MOBILE_BAR_LINKS,
  SECTION_LINKS,
  type SectionLink,
} from "@/lib/section-nav";
import { SITE_PRODUCT_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";
import { toggleTheme } from "./ThemeProvider";

const SHARE_TEXT = `${SITE_PRODUCT_NAME}. Reporta y consulta el estado de las zonas en tiempo real.`;
const PSYCHOSOCIAL_WHATSAPP_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL ?? "";

const LINK_ICONS: Record<string, LucideIcon> = {
  "#mapa": MapIcon,
  "/mapa-de-rescate": Compass,
  "#e-directory": UserSearch,
  "/mascotas": PawPrint,
  "/hospitales": Hospital,
  "/telefonos": Phone,
  "/guia": BookOpen,
  "/acopio": Package,
  "/publicar-necesidad": Megaphone,
  "/chat": MessagesSquare,
};

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

function compactBadge(value: string): string {
  const digits = value.replace(/\D/g, "");
  const n = Number(digits);
  if (Number.isNaN(n) || n < 1000) return value;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  return `${Math.round(n / 1000)}k`;
}

function usePeopleTotals() {
  const { data: stats } = useMissingStats();
  return { missing: stats?.active ?? null, found: stats?.found ?? null };
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

function iconFor(link: SectionLink): LucideIcon {
  return LINK_ICONS[link.href] ?? Compass;
}

export function MobileStickyNav() {
  const { missing, found } = usePeopleTotals();
  const { data: psychCount } = usePsychHelpClickCount();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const onHome = pathname === "/";

  useEffect(() => {
    document.body.classList.add("has-mobile-nav");
    return () => document.body.classList.remove("has-mobile-nav");
  }, []);

  useEffect(() => {
    setIsDark(document.documentElement.dataset.dark === "true");
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

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: SITE_PRODUCT_NAME,
          text: SHARE_TEXT,
          url,
        });
        closeSheet();
        return;
      } catch {
        /* cancelado */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* sin permisos */
    }
  }, [closeSheet]);

  return (
    <>
      <nav aria-label="Navegación rápida" className="e-nav__mobile-bar e-nav__mobile-bar--polish">
        <div className="e-nav__mobile-bar-grid">
          {MOBILE_BAR_LINKS.map((link) => {
            const badge = badgeValue(link, missing, found);
            const Icon = iconFor(link);
            const active =
              (!isAnchor(link.href) && pathname === link.href) ||
              (link.href === "#mapa" && onHome);
            return (
              <a
                key={link.href}
                href={resolveHref(link.href, onHome)}
                aria-label={link.label}
                aria-current={pathname === link.href ? "page" : undefined}
                onClick={(e) => handleBarClick(e, link)}
                className={cn(
                  "e-nav__mobile-bar-item",
                  active && "e-nav__mobile-bar-item--active",
                )}
              >
                <span className="e-nav__mobile-bar-icon" aria-hidden>
                  <Icon className="size-[1.15rem]" strokeWidth={2.1} />
                  {badge && (
                    <Badge className="e-nav__mobile-badge absolute -right-2 -top-1 h-4 min-w-4 rounded-full px-1 text-[9px] font-bold">
                      {compactBadge(badge)}
                    </Badge>
                  )}
                </span>
                <span className="e-nav__mobile-bar-label">{link.shortLabel}</span>
              </a>
            );
          })}
          <button
            type="button"
            aria-expanded={sheetOpen}
            aria-haspopup="dialog"
            onClick={() => setSheetOpen((open) => !open)}
            className={cn(
              "e-nav__mobile-bar-item",
              sheetOpen && "e-nav__mobile-bar-item--active",
            )}
          >
            <span className="e-nav__mobile-bar-icon" aria-hidden>
              {sheetOpen ? (
                <X className="size-[1.15rem]" strokeWidth={2.2} />
              ) : (
                <Menu className="size-[1.15rem]" strokeWidth={2.2} />
              )}
            </span>
            <span className="e-nav__mobile-bar-label">
              {sheetOpen ? "Cerrar" : "Más"}
            </span>
          </button>
        </div>
      </nav>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="z-[1950] max-h-[min(72dvh,32rem)] gap-0 overflow-hidden rounded-t-3xl border-border p-0 pb-[calc(3.5rem+env(safe-area-inset-bottom))]"
        >
          <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-muted" aria-hidden />
          <SheetHeader className="border-b px-4 py-3 text-left">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="font-heading text-base">
                  Más secciones
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Ayuda, mapas y directorios
                </SheetDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={closeSheet}
                aria-label="Cerrar menú"
              >
                <X />
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1 p-3">
              {sheetLinks.map((link) => {
                const badge = badgeValue(link, missing, found);
                const Icon = iconFor(link);
                return (
                  <button
                    key={link.href}
                    type="button"
                    onClick={() => handleSheetClick(link)}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-foreground transition hover:bg-muted active:bg-muted"
                  >
                    <span className="grid size-9 place-items-center rounded-lg bg-muted text-foreground">
                      <Icon className="size-4" strokeWidth={2.1} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">{link.label}</span>
                    {badge ? (
                      <Badge variant="secondary" className="tabular-nums">
                        {badge}
                      </Badge>
                    ) : null}
                  </button>
                );
              })}

              <Separator className="my-2" />

              <div className="grid gap-2 px-1">
                {PSYCHOSOCIAL_WHATSAPP_URL ? (
                  <Button
                    asChild
                    variant="outline"
                    className="h-12 justify-start gap-2 border-sky-300 bg-sky-50 text-sky-950 hover:bg-sky-100"
                  >
                    <a
                      href={PSYCHOSOCIAL_WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        trackPsychosocialClick();
                        trackPsychHelpClicked("mobile_sheet");
                        closeSheet();
                      }}
                      aria-label="Ayuda psicosocial: únete al grupo de WhatsApp (se abre en pestaña nueva)"
                    >
                      <WhatsAppIcon className="size-4 shrink-0" aria-hidden />
                      Ayuda psicosocial
                      {psychCount !== undefined ? (
                        <Badge className="ml-auto bg-sky-700 text-white">
                          {psychCount.toLocaleString("es")}
                        </Badge>
                      ) : null}
                    </a>
                  </Button>
                ) : null}
                <Button
                  asChild
                  variant="outline"
                  className="h-12 justify-start gap-2 border-violet-300 bg-violet-50 text-violet-950 hover:bg-violet-100"
                >
                  <a
                    href={PSYCH_HELP_FORM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeSheet}
                    aria-label="Ayuda psicológica: abrir formulario de apoyo (se abre en pestaña nueva)"
                  >
                    <Brain className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />
                    Ayuda psicológica
                  </a>
                </Button>
                <Button
                  asChild
                  className="h-12 justify-start gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <Link href="/donaciones" onClick={closeSheet} aria-label="Ver formas de donar">
                    <HandCoins className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />
                    Donar
                  </Link>
                </Button>
              </div>

              <Separator className="my-2" />

              <div className="grid grid-cols-2 gap-2 px-1 pb-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 justify-start gap-2"
                  onClick={() => {
                    toggleTheme();
                    setIsDark((v) => !v);
                  }}
                >
                  {isDark ? (
                    <Sun className="size-4" aria-hidden />
                  ) : (
                    <Moon className="size-4" aria-hidden />
                  )}
                  {isDark ? "Modo claro" : "Modo oscuro"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 justify-start gap-2"
                  onClick={handleShare}
                >
                  <Share2 className="size-4" aria-hidden />
                  {copied ? "Copiado" : "Compartir"}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default MobileStickyNav;
