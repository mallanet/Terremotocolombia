"use client";

import { memo } from "react";
import { MapPin, User } from "lucide-react";
import type { MissingPerson } from "@/hooks/missing";
import { mediaUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MissingPersonCardProps {
  person: MissingPerson;
  onOpen: () => void;
}

function MissingPersonCardImpl({ person, onOpen }: MissingPersonCardProps) {
  const isFound = person.status === "found";
  const personMeta = [
    person.age !== null ? `${person.age} años` : null,
    person.nationality || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={onOpen}
      role="listitem"
      className="group flex h-full flex-col overflow-hidden rounded-xl bg-card text-left ring-1 ring-foreground/10 transition hover:-translate-y-0.5 hover:ring-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-sm:grid max-sm:min-h-[148px] max-sm:grid-cols-[112px_minmax(0,1fr)]"
    >
      <span className="relative block aspect-[3/2] w-full overflow-hidden bg-secondary max-sm:aspect-auto max-sm:h-full">
        <Badge
          className={cn(
            "absolute top-2 left-2 z-10 uppercase",
            isFound
              ? "bg-secondary text-secondary-foreground"
              : "bg-amber-100 text-amber-900",
          )}
        >
          {isFound ? "Encontrada" : "Desaparecida"}
        </Badge>
        {person.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(person.photoUrl)}
            alt={`Foto de ${person.name}`}
            loading="lazy"
            className="block size-full object-cover object-center"
          />
        ) : (
          <span className="grid size-full place-items-center text-primary/40" aria-hidden>
            <User size={40} strokeWidth={1.5} />
          </span>
        )}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1.5 p-3.5">
        <span
          className="line-clamp-2 font-heading text-base leading-snug font-extrabold text-foreground"
          title={person.name}
        >
          {person.name}
        </span>
        {personMeta && (
          <span className="text-sm font-medium text-muted-foreground">{personMeta}</span>
        )}

        {person.lastSeen && (
          <span className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin size={14} strokeWidth={2} aria-hidden className="mt-0.5 shrink-0 text-primary" />
            <span className="line-clamp-2">{person.lastSeen}</span>
          </span>
        )}

        <span className="mt-auto inline-flex items-center gap-1.5 pt-1.5 text-sm font-bold text-primary">
          Ver detalles
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </span>
    </button>
  );
}

export const MissingPersonCard = memo(MissingPersonCardImpl);
