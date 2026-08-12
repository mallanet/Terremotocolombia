"use client";

import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { VolunteerPostSubmitBanner } from "./VolunteerPostSubmitBanner";

const WHATSAPP_GROUP_URL = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL ?? "";

type VolunteerSubmitSuccessProps = {
  message: string;
  volunteerCode: string | null;
  codeCopied: boolean;
  onCopyCode: () => void;
};

export function VolunteerSubmitSuccess({
  message,
  volunteerCode,
  codeCopied,
  onCopyCode,
}: VolunteerSubmitSuccessProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="e-m-alert-success text-center" role="status">
        <span className="block text-lg font-bold">
          Muchas gracias por ser parte de esto
        </span>
        <span className="mt-1 block">{message}</span>
      </div>
      <VolunteerPostSubmitBanner />
      {volunteerCode && (
        <div className="rounded-[20px] bg-slate-900 p-5 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">
            Tu código de voluntario
          </p>
          <p className="my-2 font-mono text-4xl font-bold tracking-[0.35em]">
            {volunteerCode}
          </p>
          <p className="mx-auto max-w-md text-xs text-slate-300">
            Guárdalo bien: lo usarás para registrar tus actividades (check-ins)
            y firmar tus reportes. Solo tú y el equipo de coordinación lo
            conocen.
          </p>
          <button
            type="button"
            onClick={onCopyCode}
            className="mt-3 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-slate-900 hover:bg-slate-100"
          >
            {codeCopied ? "¡Copiado!" : "Copiar código"}
          </button>
        </div>
      )}
      {WHATSAPP_GROUP_URL && (
        <div className="rounded-[20px] border border-[#25D366]/30 bg-[#25D366]/5 p-5 text-center">
          <WhatsAppIcon className="mx-auto mb-2 h-9 w-9 text-[#25D366]" />
          <p className="mb-1 text-base font-bold text-slate-900">
            Último paso: entra al grupo de WhatsApp
          </p>
          <p className="mx-auto mb-4 max-w-md text-sm text-slate-600">
            Ahí coordinamos las tareas del día a día: avisos de acopio,
            traslados y necesidades urgentes. Entra y preséntate.
          </p>
          <a
            href={WHATSAPP_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="e-m-btn inline-flex items-center gap-2 !bg-[#25D366] !text-white"
          >
            <WhatsAppIcon className="h-5 w-5" aria-hidden />
            Entrar al grupo
          </a>
        </div>
      )}
    </div>
  );
}
