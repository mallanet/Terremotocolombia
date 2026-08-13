import { afterEach, describe, expect, it, vi } from "vitest";
import { postReportToServer, type ReportSubmission } from "@/components/features/emergency/post-report";

const submission: ReportSubmission = {
  type: "need",
  lat: 4.6,
  lng: -74.1,
  place: "DEMO-Punto de ayuda",
  affected: 2,
  needs: "DEMO-Agua potable",
  photo: null,
  turnstileToken: "demo-single-use-proof",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("postReportToServer", () => {
  it("sends the help request and its fresh Turnstile proof to the reports API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          report: {
            id: "demo-report-id",
            ...submission,
            photoUrl: null,
            confirmations: 0,
            createdAt: 1,
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await postReportToServer(submission, {
      humanVerificationEnabled: true,
    });

    expect(outcome.status).toBe("ok");
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      type: "need",
      needs: "DEMO-Agua potable",
      turnstileToken: "demo-single-use-proof",
    });
  });

  it("does not claim a network failure was saved when Turnstile is enabled", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    const outcome = await postReportToServer(submission, {
      humanVerificationEnabled: true,
    });

    expect(outcome).toMatchObject({ status: "drop" });
    if (outcome.status === "drop") {
      expect(outcome.error).toMatch(/no se guardó/i);
    }
  });

  it("shows a 503 save failure instead of queueing a consumed Turnstile token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: "No se pudo guardar el reporte." }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(
      postReportToServer(submission, { humanVerificationEnabled: true }),
    ).resolves.toEqual({
      status: "drop",
      error: "No se pudo guardar el reporte.",
    });
  });

  it("keeps offline queueing available when human verification is disabled", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    await expect(
      postReportToServer(submission, { humanVerificationEnabled: false }),
    ).resolves.toEqual({ status: "queue" });
  });
});
