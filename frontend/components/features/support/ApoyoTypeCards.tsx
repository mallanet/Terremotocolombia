import Link from "next/link";
import type { ReactNode } from "react";
import { telHref } from "@/lib/official-support-links";

export function Card({
  emoji,
  iconClass,
  title,
  subtitle,
  children,
}: {
  emoji: string;
  iconClass: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] sm:p-7">
      <div className="mb-5 flex items-start gap-4">
        <span
          aria-hidden
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] text-2xl ${iconClass}`}
        >
          {emoji}
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="text-sm leading-snug text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3">{children}</div>
    </div>
  );
}

export function ContactRow({
  label,
  sublabel,
  phone,
  stacked = false,
}: {
  label: string;
  sublabel: string;
  phone: string;
  stacked?: boolean;
}) {
  const number = (
    <a
      href={telHref(phone)}
      className="font-bold text-[var(--ebuscar-ic)] hover:underline"
    >
      {phone}
    </a>
  );
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      {stacked ? (
        <>
          <p className="font-bold text-slate-900">{label}</p>
          <p className="mb-2 text-[13px] text-slate-500">{sublabel}</p>
          <p className="text-[17px]">{number}</p>
        </>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-slate-900">{label}</p>
            <p className="text-[13px] text-slate-500">{sublabel}</p>
          </div>
          <span className="shrink-0 text-right">{number}</span>
        </div>
      )}
    </div>
  );
}

export function ActionRow({
  label,
  sublabel,
  body,
  href,
  cta,
  filled = false,
  external = false,
}: {
  label?: string;
  sublabel?: string;
  body?: string;
  href: string;
  cta: string;
  filled?: boolean;
  external?: boolean;
}) {
  const className = filled
    ? "e-m-btn e-m-btn--crisis e-m-btn--block mt-4"
    : "e-m-btn e-m-btn--crisis mt-3";
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      {label ? <p className="font-bold text-slate-900">{label}</p> : null}
      {sublabel ? (
        <p className="text-[13px] text-slate-500">{sublabel}</p>
      ) : null}
      {body ? (
        <p className="text-sm leading-relaxed text-slate-600">{body}</p>
      ) : null}
      {external ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          {cta}
        </a>
      ) : (
        <Link href={href} className={className}>
          {cta}
        </Link>
      )}
    </div>
  );
}
