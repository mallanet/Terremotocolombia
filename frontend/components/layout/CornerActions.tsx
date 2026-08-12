"use client";

import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import TranslateWidget from "@/components/ui/TranslateWidget";
import { trackPsychosocialClick } from "@/hooks/psychology-help";
import { trackPsychHelpClicked } from "@/lib/analytics";
import "../../styles/landing-mobile.css";

const WHATSAPP_URL = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL ?? "";

export default function CornerActions() {
  return (
    <div className="fixed right-4 bottom-[5.75rem] z-[1500] flex items-center gap-2 pb-[env(safe-area-inset-bottom)] md:right-6 md:bottom-6 md:pb-0">
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
          aria-label="Ayuda psicosocial: únete al grupo de WhatsApp (se abre en pestaña nueva)"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition hover:bg-[#1fb857] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#128C7E] md:w-auto md:gap-2 md:py-3 md:pr-5 md:pl-4"
        >
          <WhatsAppIcon className="h-5 w-5 shrink-0" aria-hidden />
          <span className="hidden text-sm font-semibold md:inline">
            Comunidad
          </span>
        </a>
      ) : null}
    </div>
  );
}
