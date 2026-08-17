"use client";

/**
 * Enlaces de primer nivel de la barra de escritorio.
 *
 * Extraído de SectionNav.tsx: allí el filtro, el map y el manejador de clic
 * anidaban tanto que el gate de anidamiento rechazaba cualquier edición del
 * archivo, incluida la de añadir un enlace.
 *
 * Lista PROPIA, deliberadamente más corta que SECTION_LINKS (que alimenta la
 * hoja del menú móvil): aquí solo caben los destinos de primer nivel. Si
 * añades uno, añádelo también a SECTION_LINKS o quedará fuera del móvil.
 */
const DESKTOP_HEADER_LINKS = [
  { href: "/mapa-de-rescate", label: "Rescate", title: "Mapa de rescate" },
  { href: "#mapa", label: "Suministros", title: "Mapa de suministro" },
  { href: "#e-directory", label: "Personas", title: "Personas" },
  { href: "/mascotas", label: "Mascotas", title: "Mascotas" },
  { href: "/acopio", label: "Acopio", title: "Acopio" },
  { href: "/guia", label: "Guía", title: "Guía" },
] as const;

type HeaderLink = (typeof DESKTOP_HEADER_LINKS)[number];

function isAnchor(href: string): boolean {
  return href.startsWith("#");
}

export function scrollToSection(href: string) {
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

function HeaderLinkItem({
  link,
  pathname,
  onHome,
}: {
  link: HeaderLink;
  pathname: string;
  onHome: boolean;
}) {
  const anchor = isAnchor(link.href);
  const href = anchor && !onHome ? `/${link.href}` : link.href;
  const current = !anchor && pathname === link.href ? "page" : undefined;

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!anchor || !onHome) return;
    event.preventDefault();
    scrollToSection(link.href);
  }

  return (
    <a
      href={href}
      title={link.title}
      aria-label={link.title}
      aria-current={current}
      onClick={handleClick}
    >
      {link.label}
    </a>
  );
}

/** El mapa de rescate no se enlaza a sí mismo cuando ya estás en él. */
function visibleLinks(pathname: string): readonly HeaderLink[] {
  if (pathname !== "/mapa-de-rescate") return DESKTOP_HEADER_LINKS;
  return DESKTOP_HEADER_LINKS.filter((link) => link.href !== pathname);
}

export function DesktopHeaderLinks({
  pathname,
  onHome,
}: {
  pathname: string;
  onHome: boolean;
}) {
  return (
    <div className="e-nav__links">
      {visibleLinks(pathname).map((link) => (
        <HeaderLinkItem
          key={link.href}
          link={link}
          pathname={pathname}
          onHome={onHome}
        />
      ))}
    </div>
  );
}
