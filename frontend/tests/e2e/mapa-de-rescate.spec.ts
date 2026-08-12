import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const route = "/mapa-de-rescate";
const incidentPath =
  "/data/incidents/colombia-2026-08-10-san-jose-del-palmar.json";
const mappingPath = "/data/incidents/colombia-2026-08-10-emsr916-map.json";

async function waitForMap(page: Page) {
  const map = page.getByTestId("rescue-map-canvas");
  await expect(map).toBeVisible({ timeout: 15_000 });
  await expect(map).toHaveAttribute("data-map-ready", "true", {
    timeout: 15_000,
  });
  return map;
}

async function ensureServiceWorkerControl(page: Page) {
  await page.goto(route);
  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return;
    await navigator.serviceWorker.ready;
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker?.controller)),
    )
    .toBe(true);
}

test("publica una herramienta map-first integrada y respaldada por fuentes", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route);

  const main = page.getByRole("main");
  await expect(main).toHaveAttribute(
    "data-incident-id",
    "colombia-2026-08-10-san-jose-del-palmar",
  );
  await expect(main).toHaveAttribute(
    "data-status",
    "activated-holding-bulletin",
  );
  await expect(main).toHaveAttribute("data-map-activation", "EMSR916");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Mapa de rescate",
  );

  await expect(
    page.getByRole("link", { name: "Mapa de rescate", exact: true }).first(),
  ).toHaveAttribute("href", route);
  await expect(page.getByRole("contentinfo")).toContainText(
    "Terremoto Colombia",
  );
  await expect(page.getByRole("contentinfo")).toContainText("Contacto");
  await expect(page.getByRole("contentinfo")).toContainText(
    "¿Quieres ser voluntario?",
  );
  await expect(page.getByRole("contentinfo")).toContainText(
    "Política de privacidad",
  );
  const map = await waitForMap(page);
  await expect(map).toHaveAttribute("data-mode", "reference");
  await expect(map).toHaveAttribute("data-visible-aoi-count", "4");
  await expect(map).toHaveAttribute("data-before-ready", "false");
  await expect(map).toHaveAttribute("data-after-ready", "false");
  await expect(
    page
      .getByText("Referencia visual · fecha de captura no verificada")
      .first(),
  ).toBeVisible();
  await expect(page.getByText(/no son límites confirmados de daños/)).toBeVisible();
  await expect(page.locator('[data-testid^="rescue-aoi-"]')).toHaveCount(4);

  await expect(
    page.getByRole("button", { name: "Antes", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Después", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Mapa", exact: true }).click();
  await expect(map).toHaveAttribute("data-mode", "map");
  await page.getByRole("button", { name: "Referencia", exact: true }).click();
  await expect(map).toHaveAttribute("data-mode", "reference");

  const mapAoiLabel = map
    .locator(".leaflet-tooltip")
    .filter({ hasText: "AOI 03 · GRA" });
  await expect(mapAoiLabel).toBeVisible();
  const mapAoiBox = await mapAoiLabel.boundingBox();
  expect(mapAoiBox).not.toBeNull();
  await page.mouse.click(
    (mapAoiBox?.x ?? 0) + (mapAoiBox?.width ?? 0) / 2,
    (mapAoiBox?.y ?? 0) + (mapAoiBox?.height ?? 0) / 2,
  );
  await expect(map).toHaveAttribute("data-selected-aoi", "emsr916-aoi03");
  await page
    .getByRole("button", { name: "Volver a las 4 áreas" })
    .click();
  await expect(map).toHaveAttribute("data-selected-aoi", "");

  await page.getByTestId("rescue-aoi-03").click();
  await expect(map).toHaveAttribute("data-selected-aoi", "emsr916-aoi03");
  await expect(
    page.getByRole("heading", { name: "Centro de Cali" }),
  ).toBeVisible();
  await expect(page.getByText("Pleiades · VHR1", { exact: true })).toBeVisible();
  await expect(
    page
      .locator(".e-rescue-selection")
      .getByText("GRA · Evaluación de daños", { exact: true }),
  ).toBeVisible();

  const incidentResponse = await request.get(incidentPath);
  expect(incidentResponse.ok()).toBe(true);
  const incident = await incidentResponse.json();
  expect(incident).toMatchObject({
    schemaVersion: "1.0.0",
    event: { magnitude: 7.4, longitude: -76.34, latitude: 5.04 },
    publicDamageLayer: { status: "not-published" },
  });

  const mappingResponse = await request.get(mappingPath);
  expect(mappingResponse.ok()).toBe(true);
  const mapping = await mappingResponse.json();
  expect(mapping.aois).toHaveLength(4);
  expect(mapping.imagery).toMatchObject({
    comparisonState: "scheduled",
    before: null,
    after: null,
    reference: {
      role: "visual-reference-only",
      source: "Esri World Imagery",
    },
  });

  const externalLinks = page.locator("main a[target='_blank']");
  expect(await externalLinks.count()).toBeGreaterThanOrEqual(3);
  for (const link of await externalLinks.all()) {
    await expect(link).toHaveAttribute("href", /^https:\/\//);
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("rel", /noreferrer/);
  }

  const approvedExternalHosts = new Set([
    "discord.gg",
    "docs.google.com",
    "leafletjs.com",
    "mallanet.org",
    "mapping.emergency.copernicus.eu",
    "portal.gestiondelriesgo.gov.co",
    "storymaps.arcgis.com",
    "translate.google.com",
    "www.dimar.mil.co",
    "www.esri.com",
    "www.openstreetmap.org",
    "www.sgc.gov.co",
  ]);
  const absoluteLinks = await page.locator("a[href^='https://']").evaluateAll(
    (links) => links.map((link) => (link as HTMLAnchorElement).href),
  );
  for (const href of absoluteLinks) {
    expect(approvedExternalHosts).toContain(new URL(href).hostname);
  }

  const canvas = page.locator(
    '[data-testid="rescue-map-canvas"] canvas',
  ).first();
  await expect(canvas).toBeVisible();
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox?.width).toBeGreaterThan(100);
  expect(canvasBox?.height).toBeGreaterThan(100);
});

test("permite teclado, skip link, cambio ES/EN y pasa WCAG AA automatizado", async ({
  page,
}) => {
  await page.goto(route);
  await waitForMap(page);

  const skip = page.getByRole("link", { name: "Ir al mapa" });
  await skip.focus();
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page.getByTestId("rescue-map-canvas")).toBeFocused();

  const aoiButton = page.getByTestId("rescue-aoi-02");
  await aoiButton.focus();
  await aoiButton.press("Enter");
  await expect(page.getByTestId("rescue-map-canvas")).toHaveAttribute(
    "data-selected-aoi",
    "emsr916-aoi02",
  );

  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rescue map");
  await expect(
    page.getByRole("button", { name: "Before", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Copernicus areas", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("4 AOI", { exact: true })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("mantiene mapa, panel, controles y footer utilizables en todos los breakpoints", async ({
  page,
}) => {
  for (const width of [360, 390, 430, 768, 1440]) {
    const height = width === 768 ? 1024 : width === 1440 ? 900 : 844;
    await page.setViewportSize({ width, height });
    await page.goto(route);
    await waitForMap(page);

    const layout = await page.evaluate(() => {
      const rect = (element: Element | null) => {
        if (!element) return null;
        const bounds = element.getBoundingClientRect();
        return {
          top: bounds.top,
          bottom: bounds.bottom,
          width: bounds.width,
          height: bounds.height,
        };
      };
      const principalControls = Array.from(
        document.querySelectorAll(
          ".e-rescue-language button, .e-rescue-mode-control button, .e-rescue-aoi, .e-rescue-overview",
        ),
        (element) => rect(element),
      ).filter((value): value is NonNullable<typeof value> => value !== null);
      const main = document.querySelector("main");
      const footer = document.querySelector("footer");
      return {
        horizontalOverflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
        main: rect(main),
        rail: rect(document.querySelector("aside.e-rescue-rail")),
        footerOffsetTop: footer instanceof HTMLElement ? footer.offsetTop : 0,
        mainOffsetBottom:
          main instanceof HTMLElement ? main.offsetTop + main.offsetHeight : 0,
        principalControls,
      };
    });

    expect(layout.horizontalOverflow).toBe(false);
    expect(layout.main?.width).toBeGreaterThanOrEqual(width - 1);
    expect(layout.main?.height).toBeGreaterThanOrEqual(height - 70);
    expect(layout.footerOffsetTop).toBeGreaterThanOrEqual(
      layout.mainOffsetBottom - 1,
    );
    expect(layout.principalControls.length).toBeGreaterThanOrEqual(11);
    for (const control of layout.principalControls) {
      expect(control.height).toBeGreaterThanOrEqual(44);
      expect(control.width).toBeGreaterThanOrEqual(44);
    }
    if (width <= 767) {
      expect(layout.rail?.height).toBeLessThanOrEqual(
        (layout.main?.height ?? height) * 0.49,
      );
    } else {
      expect(layout.rail?.width).toBeGreaterThanOrEqual(360);
      expect(layout.rail?.height).toBeGreaterThanOrEqual(
        (layout.main?.height ?? height) - 30,
      );
    }

    const footer = page.getByRole("contentinfo");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
  }
});

test("reabre el último mapa descargado sin red y actualiza sin perder la vista", async ({
  page,
  context,
}) => {
  await ensureServiceWorkerControl(page);
  await waitForMap(page);

  await page.getByText("Instalación y modo offline", { exact: true }).click();
  await page
    .getByRole("button", { name: "Descargar Centro de Cali" })
    .click();
  await expect(page.getByText("Paquete offline guardado correctamente.")).toBeVisible();
  await page.getByTestId("rescue-aoi-03").click();
  await expect(page.getByTestId("rescue-map-canvas")).toHaveAttribute(
    "data-selected-aoi",
    "emsr916-aoi03",
  );

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  const map = await waitForMap(page);
  await expect(page.getByText("Sin conexión", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText("Esta imagen requiere conexión", { exact: true }).first(),
  ).toBeVisible();
  await expect(map).toHaveAttribute("data-selected-aoi", "emsr916-aoi03");
  await page.getByText("Instalación y modo offline", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Eliminar Centro de Cali" }),
  ).toBeVisible();

  await context.setOffline(false);
  await expect(
    page.getByText("En línea", { exact: true }).first(),
  ).toBeVisible({ timeout: 10_000 });
  await expect(map).toHaveAttribute("data-selected-aoi", "emsr916-aoi03");
});

test("degrada con explicación segura cuando la caché está vacía", async ({
  page,
  context,
}) => {
  await ensureServiceWorkerControl(page);
  await page.evaluate(async () => {
    await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
  });
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "🛰️ Sin conexión" })).toBeVisible();
  await expect(page.getByText(/servicios de emergencia locales/)).toBeVisible();
});

test("maneja almacenamiento lleno sin dejar un paquete parcial", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.storage, "estimate", {
      configurable: true,
      value: async () => ({ usage: 100, quota: 100 }),
    });
  });
  await page.goto(route);
  await page.getByText("Instalación y modo offline", { exact: true }).click();
  await page
    .getByRole("button", { name: "Descargar Colombia occidental" })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "No hay espacio suficiente" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Descargar Colombia occidental" }),
  ).toBeVisible();
});

test("descarta una escritura incompleta en IndexedDB", async ({ page }) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
      if (this.name === "packages") {
        throw new DOMException("simulated incomplete write", "AbortError");
      }
      return key === undefined
        ? original.call(this, value)
        : original.call(this, value, key);
    };
  });
  await page.goto(route);
  await page.getByText("Instalación y modo offline", { exact: true }).click();
  await page
    .getByRole("button", { name: "Descargar Colombia occidental" })
    .click();
  await expect(
    page.getByRole("alert").filter({
      hasText:
        "La descarga no se completó. No se guardó un paquete parcial.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Descargar Colombia occidental" }),
  ).toBeVisible();
});

test("expone instalación Android y abre la ruta correcta desde el manifest", async ({
  browser,
  page,
  request,
}) => {
  await page.goto(route);
  await page.getByText("Instalación y modo offline", { exact: true }).click();
  await page.evaluate(() => {
    const prompt = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(prompt, {
      prompt: async () => undefined,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(prompt);
  });
  await page.getByRole("button", { name: "Instalar app" }).click();
  await expect(page.getByText(/Instalación iniciada/)).toBeVisible();

  const manifestLink = page.locator('link[rel="manifest"]');
  await expect(manifestLink).toHaveAttribute(
    "href",
    "/mapa-de-rescate.webmanifest",
  );
  const manifestResponse = await request.get("/mapa-de-rescate.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({
    start_url: route,
    display: "standalone",
    theme_color: "#0f2154",
    background_color: "#eef2f7",
  });

  const swResponse = await request.get("/sw.js");
  expect(swResponse.ok()).toBe(true);
  expect(swResponse.headers()["content-type"]).toContain(
    "application/javascript",
  );
  expect(swResponse.headers()["cache-control"]).toContain("no-cache");
  expect(swResponse.headers()["service-worker-allowed"]).toBe("/");

  const standaloneContext = await browser.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL,
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 Chrome/151.0 Mobile Safari/537.36",
  });
  const standalonePage = await standaloneContext.newPage();
  await standalonePage.addInitScript(() => {
    const originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => {
      const result = originalMatchMedia(query);
      if (query === "(display-mode: standalone)") {
        Object.defineProperty(result, "matches", { value: true });
      }
      return result;
    };
  });
  await standalonePage.goto(route);
  await expect(standalonePage).toHaveURL(new RegExp(`${route}$`));
  await standalonePage
    .getByText("Instalación y modo offline", { exact: true })
    .click();
  await expect(
    standalonePage.getByTestId("rescue-installed-state"),
  ).toBeVisible();
  await standaloneContext.close();
});

test("muestra el flujo Añadir a pantalla de inicio en iOS", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();
  await page.goto(route);
  await page.getByText("Instalación y modo offline", { exact: true }).click();
  await expect(
    page.getByText(/toca Compartir y elige “Añadir a pantalla de inicio”/),
  ).toBeVisible();
  await context.close();
});
