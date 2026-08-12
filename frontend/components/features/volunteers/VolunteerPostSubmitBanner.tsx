import { Info } from "lucide-react";
import {
  POST_SUBMIT_HEADING,
  POST_SUBMIT_PARAGRAPHS,
} from "./volunteer-post-submit";

export function VolunteerPostSubmitBanner() {
  return (
    <aside
      className="rounded-[20px] border border-[color-mix(in_srgb,var(--brand-blue)_28%,white)] bg-[var(--qi-info-surface)] p-5 text-left sm:p-6"
      aria-labelledby="volunteer-post-submit-heading"
    >
      <div className="mb-3 flex items-start gap-2">
        <Info
          className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-blue)]"
          aria-hidden
        />
        <h3
          id="volunteer-post-submit-heading"
          className="text-base font-bold text-[var(--brand-navy)] sm:text-lg"
        >
          {POST_SUBMIT_HEADING}
        </h3>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-slate-700 sm:text-[15px]">
        {POST_SUBMIT_PARAGRAPHS.map((paragraph) => (
          <p key={paragraph.slice(0, 48)}>{paragraph}</p>
        ))}
      </div>
    </aside>
  );
}
