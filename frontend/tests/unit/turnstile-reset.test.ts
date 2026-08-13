import { afterEach, describe, expect, it, vi } from "vitest";
import {
  scheduleTurnstileReset,
  type TurnstileAPI,
} from "@/hooks/useTurnstile";

function fakeApi(reset: (id: string) => void): TurnstileAPI {
  return {
    render: vi.fn(() => "widget-id"),
    getResponse: vi.fn(),
    reset,
    remove: vi.fn(),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("scheduleTurnstileReset", () => {
  it("waits until the provider callback finishes before resetting", () => {
    vi.useFakeTimers();
    const reset = vi.fn();

    scheduleTurnstileReset(fakeApi(reset), "widget-id", () => true);

    expect(reset).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(reset).toHaveBeenCalledWith("widget-id");
  });

  it("does not reset a widget whose React container was replaced", () => {
    vi.useFakeTimers();
    const reset = vi.fn();

    scheduleTurnstileReset(fakeApi(reset), "stale-widget", () => false);
    vi.runAllTimers();

    expect(reset).not.toHaveBeenCalled();
  });
});
