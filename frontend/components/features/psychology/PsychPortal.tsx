"use client";

import { useState } from "react";
import {
  CalendarClock,
  FolderHeart,
  HeartHandshake,
  Loader2,
  LogOut,
  UsersRound,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  usePsychLogin,
  usePsychLogout,
  usePsychPortal,
  usePsychSession,
} from "@/hooks/psychology";

function LoginCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const login = usePsychLogin();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    login.mutate(
      { email: email.trim(), password },
      {
        onError: (err) => {
          setError(
            err instanceof ApiError && err.status === 401
              ? "Email o contraseña incorrectos."
              : "No se pudo iniciar sesión. Inténtalo de nuevo.",
          );
        },
      },
    );
  }

  return (
    <div className="e-card rounded-[24px] bg-white p-6 sm:p-10">
      <h2 className="mb-2 text-lg font-bold text-slate-900">Iniciar sesión</h2>
      <p className="mb-6 text-sm text-slate-600">
        Acceso exclusivo para psicólogos y profesionales de salud mental de la
        red. Si te registraste como voluntario de salud mental, el equipo de
        coordinación te enviará tus credenciales.
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="psych-email" className="mb-2 block text-sm font-semibold text-slate-900">
            Correo
          </label>
          <input
            type="email"
            id="psych-email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            maxLength={200}
            className="e-input w-full"
            required
          />
        </div>
        <div>
          <label htmlFor="psych-password" className="mb-2 block text-sm font-semibold text-slate-900">
            Contraseña
          </label>
          <input
            type="password"
            id="psych-password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            maxLength={200}
            className="e-input w-full"
            required
          />
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={login.isPending}
          className="e-m-btn e-m-btn--crisis e-m-btn--block disabled:opacity-60"
        >
          {login.isPending ? "Entrando…" : "Entrar al portal"}
        </button>
      </form>
    </div>
  );
}

function NoAccessCard({ email }: { email: string }) {
  const logout = usePsychLogout();
  return (
    <div className="e-card rounded-[24px] bg-white p-6 sm:p-10">
      <h2 className="mb-2 text-lg font-bold text-slate-900">
        Tu cuenta aún no tiene acceso
      </h2>
      <p className="mb-6 text-sm text-slate-600">
        Entraste como <strong>{email}</strong>, pero este portal es exclusivo
        para psicólogos verificados de la red. Si crees que es un error,
        escríbenos a{" "}
        <a href="mailto:info@mallanet.org" className="underline">
          info@mallanet.org
        </a>
        .
      </p>
      <button
        type="button"
        onClick={() => logout.mutate()}
        className="e-m-btn e-m-btn--block"
      >
        Cerrar sesión
      </button>
    </div>
  );
}

const UPCOMING = [
  {
    icon: UsersRound,
    title: "Casos y derivaciones",
    body: "Personas y rescatistas que necesitan apoyo psicosocial, asignados por la coordinación.",
  },
  {
    icon: FolderHeart,
    title: "Protocolos y recursos",
    body: "Guías de primeros auxilios psicológicos y cuidado del cuidador (prevención de burnout).",
  },
  {
    icon: CalendarClock,
    title: "Guardias y disponibilidad",
    body: "Turnos para atención remota o en terreno según tu disponibilidad.",
  },
];

function Dashboard({ email }: { email: string }) {
  const logout = usePsychLogout();
  return (
    <div className="space-y-6">
      <div className="e-card rounded-[24px] bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="mb-1 text-lg font-bold text-slate-900">
              Bienvenida/o al portal
            </h2>
            <p className="text-sm text-slate-600">{email}</p>
          </div>
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {UPCOMING.map(({ icon: Icon, title, body }) => (
          <article key={title} className="e-card rounded-[20px] bg-white p-5">
            <Icon
              className="mb-3 h-6 w-6 text-[var(--brand-blue)]"
              aria-hidden
            />
            <h3 className="mb-1 text-sm font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-600">{body}</p>
            <p className="mt-3 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-navy)]">
              Próximamente
            </p>
          </article>
        ))}
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-[var(--brand-navy)]">
        <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          El contenido operativo del portal se activará en las próximas horas.
          La coordinación te contactará por tu correo cuando haya casos
          asignados.
        </span>
      </p>
    </div>
  );
}

export default function PsychPortal() {
  const session = usePsychSession();
  const portal = usePsychPortal(Boolean(session.data));

  if (session.isLoading) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Cargando…
      </p>
    );
  }

  if (!session.data) {
    return <LoginCard />;
  }

  if (portal.isLoading) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Verificando acceso…
      </p>
    );
  }

  if (!portal.data) {
    return <NoAccessCard email={session.data.user.email} />;
  }

  return <Dashboard email={session.data.user.email} />;
}
