"use client";

/**
 * Pestaña "Mascotas" del directorio. Espeja PersonsTab (búsqueda debounced,
 * paginación con prefetch de vecinas, poll adaptado al ancho de banda, estados
 * de carga honestos) sobre el dominio `pets`, que tiene sus PROPIOS endpoints y
 * su propia tabla: nada de lo que pase aquí puede alterar el conteo de personas.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import {
  PET_DEFAULT_LIST_PARAMS,
  PET_LIST_PAGE_SIZE,
  PET_SPECIES_OPTIONS,
  MIN_SEARCH_LEN,
  useMarkPetFound,
  usePetsList,
  usePetStats,
  usePrefetchPetsPages,
  type Pet,
} from "@/hooks/pets";
import { qk } from "@/lib/query-keys";
import { useLowBandwidthMode } from "@/hooks/useLowBandwidthMode";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import { SectionLoading } from "@/components/ui/SectionLoading";
import { StaleDataNotice } from "@/components/ui/StaleDataNotice";
import { PetCard } from "./PetCard";
import { ZoneFilters, type PersonStatusFilter } from "./ZoneFilters";

const PetDetailModal = dynamic(
  () => import("@/components/features/pets/PetDetail"),
  { ssr: false },
);

const POLL_INTERVAL_MS = 8000;
const LOW_BANDWIDTH_POLL_INTERVAL_MS = 45_000;
const SEARCH_DEBOUNCE_MS = 350;

export type PetsTabHandle = {
  refresh: () => void;
};

export const PetsTab = forwardRef<PetsTabHandle>(function PetsTab(_props, ref) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<PersonStatusFilter>(
    PET_DEFAULT_LIST_PARAMS.status as PersonStatusFilter,
  );
  const [species, setSpecies] = useState<string | null>(null);
  const [selected, setSelected] = useState<Pet | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const skipScrollRef = useRef(true);

  // pageSize FIJO, igual que en personas: es lo que permite que la queryKey del
  // servidor y la del cliente coincidan y la lista llegue ya en el HTML.
  const pageSize = PET_LIST_PAGE_SIZE;
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
    species: species ?? undefined,
  };
  const { data, isPending, isError } = usePetsList(listParams, network.pollIntervalMs);
  const stats = usePetStats();

  const pets = data?.pets ?? [];
  const totalPages = data?.totalPages ?? 1;
  // Los tres contadores salen de /api/pets/stats, NO del total de la lista: ese
  // total es el del FILTRO activo, así que con "Todas" seleccionado etiquetarlo
  // como "perdidas" daría "43 perdidas / 6 reunidas" sobre 43 en total — números
  // que no suman y que hacen dudar del resto de la página. El badge "reportadas"
  // tenía el mismo fallo: con "Reunidas" puesto anunciaba el nº de reunidas como
  // si fuera el total reportado.
  const reportedTotal = stats.data?.total ?? 0;
  const activeTotal = stats.data?.active ?? 0;
  const foundTotal = stats.data?.found ?? 0;
  // Sin datos todavía no se afirma "0": un cero mientras la lista viaja —o
  // cuando la petición falló— se lee como "no hay ninguna reportada", que es
  // una afirmación falsa sobre cuántas mascotas hay buscándose. Se muestra "—"
  // hasta tener un número de verdad (mismo criterio que PersonsTab, extendido
  // también al caso de error).
  const fmtCount = (n: number, unknown: boolean) =>
    unknown ? "—" : n.toLocaleString("es");
  const statsUnknown = stats.isPending || stats.isError;
  const reportedLabel = fmtCount(reportedTotal, statsUnknown);
  const activeLabel = fmtCount(activeTotal, statsUnknown);
  const foundLabel = fmtCount(foundTotal, statsUnknown);

  const prefetchPetsPages = usePrefetchPetsPages();
  useEffect(() => {
    if (totalPages <= 1) return;
    prefetchPetsPages(listParams, totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page, pageSize, search, species, totalPages, prefetchPetsPages]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, debouncedQuery, filter, species]);

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  useImperativeHandle(
    ref,
    () => ({
      refresh() {
        setPage(1);
        void qc.invalidateQueries({ queryKey: qk.pets.all });
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

  const markFound = useMarkPetFound();
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
            Mascotas
          </h2>
          <Badge
            variant="destructive"
            className="h-auto px-2.5 py-0.5 text-xs"
            aria-label={
              statsUnknown
                ? "Cargando el número de mascotas reportadas"
                : `${reportedTotal} mascotas reportadas`
            }
          >
            {reportedLabel} reportadas
          </Badge>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />
            {activeLabel} perdidas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
            {foundLabel} reunidas
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Si reconoces a alguna, contacta a quien la reportó.
        </p>
        <StaleDataNotice staleAt={stats.data?.swStaleAt} />
      </div>

      <ZoneFilters filter={filter} onChange={setFilter} />

      <div role="group" aria-label="Filtrar por especie" className="mt-2 mb-3 flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={species === null ? "default" : "outline"}
          aria-pressed={species === null}
          onClick={() => setSpecies(null)}
          className="rounded-full"
        >
          Todas
        </Button>
        {PET_SPECIES_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={species === option.value ? "default" : "outline"}
            aria-pressed={species === option.value}
            onClick={() => setSpecies(species === option.value ? null : option.value)}
            className="rounded-full"
          >
            <span aria-hidden>{option.icon}</span> {option.label}
          </Button>
        ))}
      </div>

      <div className="mb-4">
        <SearchInput
          id="mascotas-directory-search"
          label="Buscar mascotas"
          ariaLabel="Buscar mascotas"
          value={query}
          onChange={setQuery}
          placeholder="Buscar por nombre, raza, color o zona…"
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
        {/* "Cargando" y "vacío" NO son el mismo estado: pintar "aún no hay
            reportes" con la respuesta en vuelo afirma algo falso. */}
        {isPending ? (
          <SectionLoading
            label="Cargando mascotas reportadas…"
            rows={3}
            className="col-span-full"
          />
        ) : isError ? (
          // "Falló la petición" y "no hay reportes" NO son lo mismo. Sin esta
          // rama, un error de la API se pinta como "Aún no hay reportes", que
          // afirma algo falso: alguien buscando a su mascota concluiría que su
          // reporte se perdió. Pasa de verdad en la ventana entre desplegar el
          // backend y correr la migración, cuando /api/pets todavía da 500.
          <div
            role="listitem"
            className="col-span-full flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card px-4 py-8 text-center"
          >
            <p className="font-heading text-lg font-extrabold text-foreground">
              No pudimos cargar las mascotas
            </p>
            <p className="max-w-[36ch] text-sm text-muted-foreground">
              Es un problema nuestro, no tuyo: los reportes siguen guardados.
              Reintentamos solos en unos segundos.
            </p>
          </div>
        ) : pets.length === 0 ? (
          <div
            role="listitem"
            className="col-span-full flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card px-4 py-8 text-center"
          >
            <p className="font-heading text-lg font-extrabold text-foreground">
              {isSearching ? "No encontramos coincidencias" : "Aún no hay reportes"}
            </p>
            <p className="max-w-[36ch] text-sm text-muted-foreground">
              {isSearching
                ? "Prueba con otra raza, color o zona."
                : "Sé el primero en reportar una mascota perdida o encontrada."}
            </p>
          </div>
        ) : (
          pets.map((pet) => (
            <PetCard key={pet.id} pet={pet} onOpen={() => setSelected(pet)} />
          ))
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        ariaLabel="Paginación del directorio de mascotas"
      />
      {totalPages > 1 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Página {page.toLocaleString("es")} de {totalPages.toLocaleString("es")}
        </p>
      )}

      {selected && (
        <PetDetailModal
          pet={selected}
          pets={pets}
          onNavigate={setSelected}
          onClose={() => setSelected(null)}
          onMarkFound={(payload) => handleMarkFound(selected.id, payload)}
        />
      )}
    </>
  );
});
