"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import {
  MISSING_DEFAULT_LIST_PARAMS,
  MISSING_LIST_PAGE_SIZE,
  MIN_SEARCH_LEN,
  useMarkFound,
  useMissingList,
  useMissingStats,
  usePrefetchMissingPages,
  type MissingPerson,
} from "@/hooks/missing";
import { qk } from "@/lib/query-keys";
import { useLowBandwidthMode } from "@/hooks/useLowBandwidthMode";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { SectionLoading } from "@/components/ui/SectionLoading";
import { StaleDataNotice } from "@/components/ui/StaleDataNotice";
import { MissingPersonCard } from "./MissingPersonCard";
import { ZoneFilters, type PersonStatusFilter } from "./ZoneFilters";

const DetailModal = dynamic(
  () => import("@/components/features/missing/MissingPersonDetail"),
  { ssr: false },
);

const POLL_INTERVAL_MS = 8000;
const LOW_BANDWIDTH_POLL_INTERVAL_MS = 45_000;
const SEARCH_DEBOUNCE_MS = 350;

export type PersonsTabHandle = {
  refresh: () => void;
};

export const PersonsTab = forwardRef<PersonsTabHandle>(function PersonsTab(
  _props,
  ref,
) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<PersonStatusFilter>(
    MISSING_DEFAULT_LIST_PARAMS.status as PersonStatusFilter,
  );
  const [selected, setSelected] = useState<MissingPerson | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const skipScrollRef = useRef(true);

  // pageSize FIJO (ver lib/missing.ts). Antes salía del nº de columnas del grid,
  // que solo se conoce tras montar: el primer render pedía pageSize=8 y el
  // efecto de las media queries lo cambiaba a 4 en móvil, tirando la primera
  // request. Y al no ser predecible desde el servidor, el prefetch SSR generaba
  // una queryKey distinta a la del cliente y no servía de nada. El grid sigue
  // siendo responsive por CSS; ya no manda sobre cuántos registros se piden.
  const pageSize = MISSING_LIST_PAGE_SIZE;
  const network = useLowBandwidthMode(
    POLL_INTERVAL_MS,
    LOW_BANDWIDTH_POLL_INTERVAL_MS,
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const search = debouncedQuery.trim();
  const listParams = {
    status: filter,
    page,
    pageSize,
    q: search.length >= MIN_SEARCH_LEN ? search : undefined,
  };
  const { data, isPending, isError } = useMissingList(listParams, network.pollIntervalMs);
  const stats = useMissingStats();

  const people = data?.people ?? [];
  const totalPages = data?.totalPages ?? 1;
  // Los TRES contadores de la cabecera salen de /stats, NUNCA del total de la
  // lista: ese total es el del FILTRO activo. Cableado a la lista, con
  // "Encontradas" puesto el badge decía "3 reportadas" habiendo 69 personas
  // reportadas, y "desaparecidas" repetía el número de encontradas. Aquí se
  // resume TODO el directorio, no la página que se está viendo. Igual que
  // PetsTab.
  const reportedTotal = stats.data?.total ?? 0;
  const activeTotal = stats.data?.active ?? 0;
  const foundTotal = stats.data?.found ?? 0;
  // Sin datos todavía no se afirma "0": un cero mientras la lista viaja es una
  // afirmación falsa sobre cuánta gente hay reportada. Lo mismo si la petición
  // FALLÓ: un error tampoco es un cero.
  const fmtCount = (n: number, unknown: boolean) =>
    unknown ? "—" : n.toLocaleString("es");
  const statsUnknown = stats.isPending || stats.isError;
  const reportedLabel = fmtCount(reportedTotal, statsUnknown);
  const activeLabel = fmtCount(activeTotal, statsUnknown);
  const foundLabel = fmtCount(foundTotal, statsUnknown);

  const prefetchMissingPages = usePrefetchMissingPages();
  useEffect(() => {
    if (totalPages <= 1) return;
    prefetchMissingPages(listParams, totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page, pageSize, search, totalPages, prefetchMissingPages]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, debouncedQuery, filter]);

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  useImperativeHandle(
    ref,
    () => ({
      refresh() {
        setPage(1);
        void qc.invalidateQueries({ queryKey: qk.missing.all });
      },
    }),
    [qc],
  );

  useEffect(() => {
    if (skipScrollRef.current) {
      skipScrollRef.current = false;
      return;
    }
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [page]);

  const markFound = useMarkFound();
  const handleMarkFound = useCallback(
    async (
      id: string,
      payload: { note: string; photo: string | null; turnstileToken?: string },
    ) => {
      await markFound.mutateAsync({
        id,
        note: payload.note,
        photo: payload.photo,
        turnstileToken: payload.turnstileToken,
      });
      setSelected(null);
    },
    [markFound],
  );

  const isSearching = search.length >= MIN_SEARCH_LEN;
  const queryTooShort = search.length > 0 && search.length < MIN_SEARCH_LEN;

  return (
    <>
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-heading text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Personas
          </h2>
          <Badge
            variant="destructive"
            className="h-auto px-2.5 py-0.5 text-xs"
            aria-label={
              statsUnknown
                ? "Cargando el número de personas reportadas"
                : `${reportedTotal} personas reportadas`
            }
          >
            {reportedLabel} reportadas
          </Badge>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />
            {activeLabel} desaparecidas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
            {foundLabel} encontradas
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Si reconoces a alguien, contacta a quien la reportó.
        </p>
        <StaleDataNotice staleAt={stats.data?.swStaleAt} />
      </div>

      <ZoneFilters filter={filter} onChange={setFilter} />

      <div className="mb-4">
        <SearchInput
          id="personas-directory-search"
          label="Buscar personas"
          ariaLabel="Buscar personas"
          value={query}
          onChange={setQuery}
          placeholder="Buscar por nombre, zona o descripción…"
          autoComplete="off"
        />
        {queryTooShort && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Escribe al menos {MIN_SEARCH_LEN} letras para buscar.
          </p>
        )}
      </div>

      <div
        ref={gridRef}
        role="list"
        className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 min-[960px]:grid-cols-3 min-[1280px]:grid-cols-4"
      >
        {/* "Cargando" y "vacío" NO son el mismo estado. Mientras la lista viaja
            hay que enseñar el esqueleto: pintar "Aún no hay reportes" con la
            respuesta todavía en vuelo se lee como "no hay nadie reportado" y la
            gente cierra la página (mismo razonamiento que SectionLoading). */}
        {isPending ? (
          <SectionLoading
            label="Cargando personas reportadas…"
            rows={3}
            className="col-span-full"
          />
        ) : isError ? (
          // "Falló la petición" y "no hay reportes" NO son lo mismo. Sin esta
          // rama, un error de la API se pinta como "Aún no hay reportes", que
          // afirma algo falso: alguien buscando a un familiar concluiría que su
          // reporte se perdió. Mismo patrón que PetsTab.
          <div
            role="listitem"
            className="col-span-full flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card px-4 py-8 text-center"
          >
            <p className="font-heading text-lg font-extrabold text-foreground">
              No pudimos cargar las personas
            </p>
            <p className="max-w-[36ch] text-sm text-muted-foreground">
              Es un problema nuestro, no tuyo: los reportes siguen guardados.
              Reintentamos solos en unos segundos.
            </p>
          </div>
        ) : people.length === 0 ? (
          <div
            role="listitem"
            className="col-span-full flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card px-4 py-8 text-center"
          >
            <p className="font-heading text-lg font-extrabold text-foreground">
              {isSearching ? "No encontramos coincidencias" : "Aún no hay reportes"}
            </p>
            <p className="max-w-[36ch] text-sm text-muted-foreground">
              {isSearching
                ? "Prueba con otro nombre o zona."
                : "Sé el primero en compartir información para localizar a alguien."}
            </p>
          </div>
        ) : (
          people.map((person) => (
            <MissingPersonCard
              key={person.id}
              person={person}
              onOpen={() => setSelected(person)}
            />
          ))
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        ariaLabel="Paginación del directorio de personas"
      />
      {totalPages > 1 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Página {page.toLocaleString("es")} de {totalPages.toLocaleString("es")}
        </p>
      )}

      {selected && (
        <DetailModal
          person={selected}
          people={people}
          onNavigate={setSelected}
          onClose={() => setSelected(null)}
          onMarkFound={(payload) => handleMarkFound(selected.id, payload)}
        />
      )}
    </>
  );
});
