"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAcopioDirectory } from "@/hooks/acopio-directory";
import {
  ACOPIO_DEFAULT_FILTERS,
  isModuleDisabledError,
} from "@/hooks/acopio";
import { categoryLabel } from "./CollectionCenterCard";
import CollectionCenterCard from "./CollectionCenterCard";

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_COUNTRY = ACOPIO_DEFAULT_FILTERS.country ?? "";

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={active ? "e-m-chip e-m-chip--active" : "e-m-chip"}
    >
      {children}
    </button>
  );
}

export default function CollectionCenters() {
  const [country, setCountry] = useState<string>(DEFAULT_COUNTRY);
  const [category, setCategory] = useState<string>("");
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(rawQuery.trim());
      setShown(PAGE_SIZE);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const filters = useMemo(
    () => ({
      country: country || undefined,
      category: category || undefined,
      q: query || undefined,
    }),
    [country, category, query],
  );

  const { data, isLoading, isError, error, isFetching, refetch } =
    useAcopioDirectory(filters);
  const moduleDisabled = isModuleDisabledError(error);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const facets = data?.facets ?? { byCountry: {}, byCategory: {} };
  const countryChips = useMemo(
    () => Object.entries(facets.byCountry).sort((a, b) => b[1] - a[1]),
    [facets.byCountry],
  );
  const categoryChips = useMemo(
    () => Object.entries(facets.byCategory).sort((a, b) => b[1] - a[1]),
    [facets.byCategory],
  );
  const visible = items.slice(0, shown);

  function clearFilters() {
    setCountry("");
    setCategory("");
    setRawQuery("");
    setQuery("");
    setShown(PAGE_SIZE);
  }

  return (
    <section id="centros-acopio" className="e-m-section e-m-section--wash">
      <div className="e-m-section__inner">
        <header className="e-m-section__head">
          <span className="e-m-kicker">Mallanet · acopio</span>
          <h1 className="e-m-section__title flex flex-wrap items-center gap-2">
            Centros de acopio
            {!isLoading && (
              <span className="e-m-eyebrow">
                {total} {total === 1 ? "punto" : "puntos"}
              </span>
            )}
          </h1>
          <hr className="e-m-section__rule" />
          <p className="e-m-rg-intro" style={{ marginTop: 16 }}>
            Lugares oficiales y reportes ciudadanos donde puedes llevar donaciones
            o encontrar refugio. Revisa qué reciben antes de ir.
          </p>
          <p style={{ marginTop: 12 }}>
            <a href="/acopio/registrar" className="e-m-btn e-m-btn--primary inline-flex">
              Registrar un punto
            </a>
          </p>
        </header>

        <div className="e-m-input-wrap">
          <span className="e-m-input-wrap__icon" aria-hidden>
            🔎
          </span>
          <input
            type="search"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            placeholder="Busca por organización, ciudad o dirección…"
            aria-label="Buscar centro de acopio"
            className="e-m-input"
          />
        </div>

        {countryChips.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p className="e-m-filter-label">País</p>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={!country} onClick={() => setCountry("")}>
                Todos
              </FilterChip>
              {countryChips.map(([name, count]) => (
                <FilterChip
                  key={name}
                  active={country === name}
                  onClick={() => {
                    setCountry(name);
                    setShown(PAGE_SIZE);
                  }}
                >
                  {name} ({count})
                </FilterChip>
              ))}
            </div>
          </div>
        )}

        {categoryChips.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <p className="e-m-filter-label">Reciben</p>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={!category} onClick={() => setCategory("")}>
                Todas
              </FilterChip>
              {categoryChips.map(([key, count]) => (
                <FilterChip
                  key={key}
                  active={category === key}
                  onClick={() => {
                    setCategory(key);
                    setShown(PAGE_SIZE);
                  }}
                >
                  {categoryLabel(key)} ({count})
                </FilterChip>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          {isLoading ? (
            <ul className="e-m-card-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="e-m-skeleton" style={{ height: 176 }} />
              ))}
            </ul>
          ) : moduleDisabled ? (
            <p className="e-m-rg-meta">
              El directorio de centros de acopio no está disponible en este
              deployment.
            </p>
          ) : isError ? (
            <div className="e-m-alert-error">
              No pudimos cargar los centros de acopio en este momento.{" "}
              <button type="button" onClick={() => refetch()} className="e-m-link">
                Reintentar
              </button>
            </div>
          ) : items.length === 0 ? (
            <p className="e-m-rg-meta">
              No encontramos centros con esos filtros.{" "}
              <button type="button" onClick={clearFilters} className="e-m-link">
                Limpiar filtros
              </button>
            </p>
          ) : (
            <>
              <ul className="e-m-card-grid">
                {visible.map((center) => (
                  <CollectionCenterCard key={center.id} center={center} />
                ))}
              </ul>
              {items.length > shown && (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setShown((s) => s + PAGE_SIZE)}
                    className="e-m-btn e-m-btn--primary"
                  >
                    Ver más ({items.length - shown} restantes)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <p className="e-m-note e-m-note--info">
            💚 ¿Conoces otro punto?{" "}
            <a href="/acopio/registrar" className="e-m-link">
              Regístralo aquí
            </a>{" "}
            o en el mapa como <strong>Centro de Acopio / Refugio</strong>.
          </p>
          <p className="e-m-note e-m-note--warning">
            ⚠️ Verifica horarios y disponibilidad antes de ir. Los reportes
            ciudadanos pueden cambiar.
          </p>
        </div>

        <p className="e-m-rg-foot mt-6">
          Datos: Mallanet.org · reportes ciudadanos y centros oficiales
          {isFetching && !isLoading ? " · actualizando…" : ""}
        </p>
      </div>
    </section>
  );
}
