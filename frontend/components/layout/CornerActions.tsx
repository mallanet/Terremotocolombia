"use client";

import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import TranslateWidget from "@/components/ui/TranslateWidget";
import { trackPsychosocialClick } from "@/hooks/psychology-help";
import { trackPsychHelpClicked } from "@/lib/analytics";

const WHATSAPP_URL = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL ?? "";

// Acciones flotantes abajo a la derecha: selector de idioma (siempre) y el
// acceso a la comunidad de WhatsApp (si la URL está configurada).
export default function CornerActions() {
  return (
    <div className="fixed right-4 bottom-[4.5rem] z-40 flex items-center gap-2 pb-[env(safe-area-inset-bottom)] md:right-6 md:bottom-6 md:pb-0">
      <TranslateWidget variant="fab" />
      {WHATSAPP_URL ? (
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackPsychosocialClick();
            trackPsychHelpClicked("sticky");
          }}
          aria-label="Comunidad: únete al grupo de WhatsApp (se abre en pestaña nueva)"
          className="flex items-center gap-2 rounded-full bg-[#25D366] py-3 pr-5 pl-4 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-[#1fb857] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#128C7E]"
        >
          <WhatsAppIcon className="h-5 w-5 shrink-0" aria-hidden />
          Comunidad
        </a>
      ) : null}
    </div>
  );
}
