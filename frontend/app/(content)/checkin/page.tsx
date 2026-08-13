import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import SubPageShell from "@/components/layout/SubPageShell";
import CheckinForm from "@/components/features/voluntariado/CheckinForm";
import { CHECKIN_LEAD, CHECKIN_TITLE } from "@/components/features/voluntariado/checkin-copy";

export const metadata: Metadata = pageMetadata({
  title: CHECKIN_TITLE,
  description: CHECKIN_LEAD,
  path: "/checkin",
});

export default function CheckinPage() {
  return (
    <SubPageShell breadcrumb="Check-in" path="/checkin">
      <section className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="mb-2 text-[22px] font-bold text-slate-900 sm:text-2xl">
            {CHECKIN_TITLE}
          </h1>
          <p className="text-sm text-slate-600 sm:text-[15px]">{CHECKIN_LEAD}</p>
        </header>

        <div className="e-card rounded-[24px] bg-white p-6 sm:p-10">
          <CheckinForm />
        </div>
      </section>
    </SubPageShell>
  );
}
