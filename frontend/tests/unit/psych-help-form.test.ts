import { describe, expect, it } from "vitest";
import {
  PSYCH_HELP_FORM_URL,
  PSYCHOSOCIAL_NETWORK_FORM_URL,
} from "@/lib/psych-help-form";

describe("psych help forms", () => {
  it("separa el formulario clínico del de la red psicosocial", () => {
    expect(PSYCH_HELP_FORM_URL).toMatch(/^https:\/\/docs\.google\.com\//);
    expect(PSYCHOSOCIAL_NETWORK_FORM_URL).toBe(
      "https://forms.gle/wVuELvZy1i9eeBaw7",
    );
    expect(PSYCHOSOCIAL_NETWORK_FORM_URL).not.toBe(PSYCH_HELP_FORM_URL);
  });
});
