"use client";

import dynamic from "next/dynamic";
import { ApiError } from "@/lib/api";
import {
  useAssignment,
  useAssignmentRespond,
  type AssignmentDetail,
} from "@/hooks/voluntariado";

const AssignmentMap = dynamic(() => import("./AssignmentMap"), { ssr: false });

const STATUS_LABEL: Record<AssignmentDetail["status"], string> = {
  offered: "Pendiente de tu respuesta",
  accepted: "Aceptada — en tus manos",
  done: "Terminada. ¡Gracias!",
  declined: "La declinaste",
};

function Coords({ lat, lng }: { lat: number; lng: number }) {
  return (
    <span className="font-mono text-xs text-slate-500">
      ({lat.toFixed(5)}, {lng.toFixed(5)})
    </span>
  );
}

export default function AssignmentView({ token }: { token: string }) {
  const { data, isLoading, error } = useAssignment(token);
  const respond = useAssignmentRespond(token);

  if (isLoading) {
    return <p className="text-sm text-slate-500">Cargando tu asignación…</p>;
  }
  if (error || !data) {
    const message =
      error instanceof ApiError && error.status === 404
        ? error.message
        : "No pudimos cargar tu asignación. Intenta de nuevo en unos minutos.";
    return (
      <div className="e-card rounded-[24px] bg-white p-6 sm:p-10">
        <p role="alert" className="text-sm text-red-600">{message}</p>
      </div>
    );
  }

  const { task, volunteerName, status } = data;
  const hasMap =
    (task.originLat !== null && task.originLng !== null) ||
    (task.destLat !== null && task.destLng !== null);

  return (
    <div className="flex flex-col gap-5">
      <div className="e-card rounded-[24px] bg-white p-6 sm:p-8">
        <p className="text-sm text-slate-600">Hola, {volunteerName}</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">{task.title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {task.kind === "terreno" ? "En terreno" : "Digital"}
          {task.city ? ` · ${task.city}` : ""} · {STATUS_LABEL[status]}
        </p>
        {task.description && (
          <p className="mt-4 text-[15px] text-slate-700">{task.description}</p>
        )}

        {(task.originName || task.destName) && (
          <ul className="mt-4 flex flex-col gap-2 text-sm text-slate-700">
            {task.originName && (
              <li>
                <strong>A — Recoger en:</strong> {task.originName}{" "}
                {task.originLat !== null && task.originLng !== null && (
                  <Coords lat={task.originLat} lng={task.originLng} />
                )}
              </li>
            )}
            {task.destName && (
              <li>
                <strong>B — Entregar en:</strong> {task.destName}{" "}
                {task.destLat !== null && task.destLng !== null && (
                  <Coords lat={task.destLat} lng={task.destLng} />
                )}
              </li>
            )}
          </ul>
        )}
        {task.transportNote && (
          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            <strong>Transporte:</strong> {task.transportNote}
          </p>
        )}
      </div>

      {hasMap && (
        <div className="e-card h-72 overflow-hidden rounded-[24px] bg-white sm:h-96">
          <AssignmentMap task={task} />
        </div>
      )}

      {respond.error && (
        <p role="alert" className="text-sm text-red-600">
          {respond.error instanceof Error ? respond.error.message : "No se pudo enviar tu respuesta."}
        </p>
      )}

      {status === "offered" && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={respond.isPending}
            onClick={() => respond.mutate("aceptar")}
            className="e-m-btn e-m-btn--crisis flex-1 disabled:opacity-60"
          >
            Aceptar la tarea
          </button>
          <button
            type="button"
            disabled={respond.isPending}
            onClick={() => respond.mutate("rechazar")}
            className="e-m-btn flex-1 disabled:opacity-60"
          >
            No puedo
          </button>
        </div>
      )}
      {status === "accepted" && (
        <button
          type="button"
          disabled={respond.isPending}
          onClick={() => respond.mutate("terminar")}
          className="e-m-btn e-m-btn--crisis e-m-btn--block disabled:opacity-60"
        >
          Marcar como terminada
        </button>
      )}
      {(status === "done" || status === "declined") && (
        <p className="text-center text-sm text-slate-500">
          {status === "done"
            ? "Gracias por tu ayuda. El equipo ya ve la tarea como terminada."
            : "Gracias por avisar. El equipo asignará esta tarea a otra persona."}
        </p>
      )}
    </div>
  );
}
