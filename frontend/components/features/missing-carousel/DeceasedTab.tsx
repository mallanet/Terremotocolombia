"use client";

import { useEffect, useState } from "react";
import { ExternalLink, MapPin, UserRound } from "lucide-react";
import { useOfficialDeceased } from "@/hooks/official-deceased";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { SectionLoading } from "@/components/ui/SectionLoading";

const PAGE_SIZE = 12;
const SEARCH_DELAY_MS = 350;

export function DeceasedTab() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const list = useOfficialDeceased({ page, pageSize: PAGE_SIZE, q: search || undefined });
  const people = list.data?.people ?? [];
  const totalPages = list.data?.totalPages ?? 1;

  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setPage((current) => Math.min(current, totalPages)),
    );
    return () => cancelAnimationFrame(frame);
  }, [totalPages]);

  return (
    <>
      <div className="e-m-directory__intro">
        <div className="e-m-person-head">
          <h2 className="e-m-section__title e-m-section__title--sm">
            Fallecidos confirmados
          </h2>
          <span className="e-m-person-head__count">
            {list.isPending ? "—" : (list.data?.total ?? 0).toLocaleString("es")} registros
          </span>
        </div>
        <div className="mt-3 rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-semibold">Información de fuentes oficiales</p>
          <p className="mt-1">
            La información de esta sección proviene directamente de las instituciones oficiales
            enlazadas en cada registro. Consulta la lista original para confirmar los datos.
          </p>
        </div>
      </div>

      <div className="e-m-person-search">
        <SearchInput
          id="fallecidos-directory-search"
          label="Buscar en listas oficiales"
          value={query}
          onChange={setQuery}
          placeholder="Buscar por nombre o ubicación…"
          className="e-input w-full lg:max-w-md"
        />
      </div>

      <div className="e-m-person-grid" role="list">
        {list.isPending ? (
          <SectionLoading label="Cargando listas oficiales…" rows={3} className="col-span-full" />
        ) : list.isError ? (
          <div className="e-m-person-empty col-span-full" role="listitem">
            <p className="e-m-person-empty__title">No pudimos cargar las listas oficiales</p>
            <p className="e-m-person-empty__desc">Inténtalo de nuevo en unos minutos.</p>
          </div>
        ) : people.length === 0 ? (
          <div className="e-m-person-empty col-span-full" role="listitem">
            <p className="e-m-person-empty__title">
              {search ? "No encontramos coincidencias" : "Aún no hay listas oficiales publicadas"}
            </p>
            <p className="e-m-person-empty__desc">
              {search ? "Prueba con otro nombre o ubicación." : "Esta sección se actualizará cuando haya una fuente oficial verificable."}
            </p>
          </div>
        ) : (
          people.map((person) => (
            <article key={person.id} className="e-m-person-card e-m-person-card--deceased" role="listitem">
              <div className="e-m-person-card__media">
                <span className="e-m-person-card__badge e-m-person-card__badge--deceased">
                  Fallecido confirmado
                </span>
                <div className="e-m-person-card__photo e-m-person-card__photo--empty" aria-hidden>
                  <UserRound size={40} strokeWidth={1.5} />
                </div>
              </div>
              <div className="e-m-person-card__body">
                <h3 className="e-m-person-card__name">{person.name}</h3>
                {person.age !== null && <p className="e-m-person-card__meta">{person.age} años</p>}
                {person.location && (
                  <p className="e-m-person-card__row">
                    <MapPin size={14} strokeWidth={2} aria-hidden />
                    <span>{person.location}</span>
                  </p>
                )}
                {person.description && <p className="e-m-person-card__desc">{person.description}</p>}
                <p className="mt-2 text-xs text-[var(--etext2)]">
                  Fuente: {person.list.sourceName} · {person.list.title}
                </p>
                <a
                  href={person.list.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="e-m-person-card__cta inline-flex items-center gap-1"
                >
                  Ver lista oficial <ExternalLink size={13} aria-hidden />
                </a>
              </div>
            </article>
          ))
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        ariaLabel="Paginación de listas oficiales de fallecidos"
      />
    </>
  );
}
