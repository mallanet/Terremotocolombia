"use client";

import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { trackPsychosocialClick } from "@/hooks/psychology-help";
import { trackPsychHelpClicked } from "@/lib/analytics";

const WHATSAPP_URL = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL ?? "";

export default function PsychosocialSticky() {
  if (!WHATSAPP_URL) return null;
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        trackPsychosocialClick();
        trackPsychHelpClicked("sticky");
      }}
      aria-label="Ayuda psicosocial: únete al grupo de WhatsApp (se abre en pestaña nueva)"
      className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-2 rounded-full bg-[#25D366] py-3 pr-5 pl-4 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-[#1fb857] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#128C7E] md:right-6 md:bottom-6"
    >
      <WhatsAppIcon className="h-5 w-5 shrink-0" aria-hidden />
      Ayuda psicosocial
    </a>
  );
}
