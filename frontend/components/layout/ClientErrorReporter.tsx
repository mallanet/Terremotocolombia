"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/client-errors";

const MAX_REPORTS_PER_PAGE = 20;

export default function ClientErrorReporter() {
  useEffect(() => {
    let reports = 0;
    const onError = (event: ErrorEvent) => {
      if (reports >= MAX_REPORTS_PER_PAGE) return;
      reports++;
      reportClientError("window", event.error, {
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (reports >= MAX_REPORTS_PER_PAGE) return;
      reports++;
      reportClientError("promise", event.reason);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
