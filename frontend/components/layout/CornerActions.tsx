"use client";

import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import TranslateWidget from "@/components/ui/TranslateWidget";
import { trackPsychosocialClick } from "@/hooks/psychology-help";
import { trackPsychHelpClicked } from "@/lib/analytics";
import "../../styles/landing-mobile.css";

const WHATSAPP_URL = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL ?? "";

export default function CornerActions() {
  return (
    <div className="pointer-events-none fixed right-3 bottom-[6.75rem] z-[1500] flex items-center gap-2 pb-[env(safe-area-inset-bottom)] md:right-5 md:bottom-5 md:pb-0">
      <div className="pointer-events-auto"><TranslateWidget variant="fab" /></div>
      {WHATSAPP_URL ? (
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackPsychosocialClick();
            trackPsychHelpClicked("sticky");
          }}
          aria-label="Ayuda psicosocial: únete al grupo de WhatsApp (se abre en pestaña nueva)"
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition hover:bg-[#1fb857] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#128C7E] xl:w-auto xl:gap-2 xl:py-3 xl:pr-5 xl:pl-4"
        >
          <WhatsAppIcon className="h-5 w-5 shrink-0" aria-hidden />
          <span className="hidden text-sm font-semibold xl:inline">
            Comunidad
          </span>
        </a>
      ) : null}
    </div>
  );
}
