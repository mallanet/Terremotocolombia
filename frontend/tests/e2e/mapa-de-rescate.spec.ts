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

async function expandMobileSheet(page: Page) {
  const toggle = page.getByTestId("rescue-sheet-toggle");
  if (
    (await toggle.isVisible()) &&
    (await toggle.getAttribute("aria-expanded")) !== "true"
  ) {
    await toggle.click();
  }
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
    page.locator('.e-nav__links a[href="/mapa-de-rescate"]'),
  ).toHaveCount(0);
  await expect(page.locator(".e-rescue-language")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Cambiar idioma de la página" }),
  ).toBeVisible();
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
  // La base inicial es OSM: la imagen Esri de referencia sale oscura y con
  // nubes sobre la cordillera; como primera impresión parecía un mapa roto.
  const sheet = page.locator("aside.e-rescue-rail");
  const sheetToggle = page.getByTestId("rescue-sheet-toggle");
  const mobileNavigation = page.getByRole("navigation", {
    name: "Navegación rápida",
  });
  await expect(sheet).toHaveAttribute("data-sheet-state", "compact");
  await expect(sheetToggle).toHaveAttribute("aria-expanded", "false");
  await expect(mobileNavigation).toBeVisible();
  await expect(map).toHaveAttribute("data-mode", "map");
  await expect(map).toHaveAttribute("data-visible-aoi-count", "4");
  await expect(map).toHaveAttribute("data-before-ready", "false");
  await expect(map).toHaveAttribute("data-after-ready", "false");
  await expect(page.locator(".e-rescue-notice")).toContainText("OpenStreetMap");

  await expandMobileSheet(page);
  await expect(sheet).toHaveAttribute("data-sheet-state", "expanded");
  await expect(sheetToggle).toHaveAttribute("aria-expanded", "true");
  await expect(mobileNavigation).toBeHidden();
  await expect(page.getByText(/no son límites confirmados de daños/)).toBeVisible();
  await expect(page.locator('[data-testid^="rescue-aoi-"]')).toHaveCount(4);

  const comparison = page.locator("details.e-rescue-comparison");
  await expect(comparison).not.toHaveAttribute("open", "");
  await comparison.locator("summary").click();
  await expect(comparison).toHaveAttribute("open", "");
  await expect(
    page.getByRole("button", { name: "Antes", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Después", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Imágenes pendientes", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("SCHEDULED", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Referencia", exact: true }).click();
  await expect(map).toHaveAttribute("data-mode", "reference");
  await expect(
    page
      .getByText("Referencia visual · fecha de captura no verificada")
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mapa", exact: true }).click();
  await expect(map).toHaveAttribute("data-mode", "map");

  await page.getByTestId("rescue-aoi-03").click();
  await expect(map).toHaveAttribute("data-selected-aoi", "emsr916-aoi03");
  await expect(map.locator(".leaflet-popup")).toHaveCount(0);
  await expect(map.locator(".e-rescue-aoi-label")).toHaveCount(1);
  await expect(map.locator(".e-rescue-aoi-label")).toContainText(
    "AOI 03 · GRA",
  );
  await expect(
    page.getByRole("region", { name: "Centro de Cali" }),
  ).toBeVisible();
  await expect(page.getByText("Pleiades · VHR1", { exact: true })).toBeVisible();
  await expect(
    page
      .locator(".e-rescue-selection")
      .getByText("GRA · Evaluación de daños", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Volver a las 4 áreas" })
    .first()
    .click();
  await expect(map).toHaveAttribute("data-selected-aoi", "");
  await expect(map.locator(".e-rescue-aoi-label")).toHaveCount(0);

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
    "chat.whatsapp.com",
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

test("selecciona un AOI desde el mapa sin abrir un popup", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(route);
  const map = await waitForMap(page);

  const mapAoiLabel = map
    .locator(".leaflet-tooltip")
    .filter({ hasText: "AOI 03 · GRA" });
  await expect(mapAoiLabel).toBeVisible();
  await mapAoiLabel.click();

  await expect(map).toHaveAttribute("data-selected-aoi", "emsr916-aoi03");
  await expect(map.locator(".leaflet-popup")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Centro de Cali" }),
  ).toBeVisible();
});

test("selecciona un AOI directamente desde el canvas móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route);
  const map = await waitForMap(page);
  const mapBox = await map.boundingBox();
  expect(mapBox).not.toBeNull();

  await page.mouse.click(
    (mapBox?.x ?? 0) + (mapBox?.width ?? 0) * 0.5,
    (mapBox?.y ?? 0) + (mapBox?.height ?? 0) * 0.42,
  );

  await expect(map).not.toHaveAttribute("data-selected-aoi", "");
  await expect(page.getByTestId("rescue-sheet-toggle")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(map.locator(".leaflet-popup")).toHaveCount(0);
  await expect(map.locator(".e-rescue-aoi-label")).toHaveCount(1);
});

test("permite teclado, usa el idioma global y pasa WCAG AA automatizado", async ({
  page,
  context,
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

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);

  const globalLanguage = page.getByRole("button", {
    name: "Cambiar idioma de la página",
  });
  await globalLanguage.click();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect
    .poll(async () =>
      (await context.cookies()).some(
        (cookie) =>
          cookie.name === "googtrans" && cookie.value === "/es/en",
      ),
    )
    .toBe(true);
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
          [
            ".e-rescue-mode-control button",
            ".e-rescue-aoi",
            ".e-rescue-overview",
            ".e-rescue-sheet-toggle",
            ".e-rescue-map-legend > summary",
            ".e-rescue-attribution > summary",
            ".leaflet-control-zoom a",
          ].join(", "),
        ),
        (element) =>
          getComputedStyle(element).display === "none" ? null : rect(element),
      ).filter(
        (value): value is NonNullable<typeof value> =>
          value !== null && value.height > 0 && value.width > 0,
      );
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
    expect(layout.principalControls.length).toBeGreaterThanOrEqual(7);
    for (const control of layout.principalControls) {
      expect(control.height).toBeGreaterThanOrEqual(44);
      expect(control.width).toBeGreaterThanOrEqual(44);
    }
    if (width <= 767) {
      expect(layout.rail?.height).toBeLessThanOrEqual(200);
      const compactRailHeight = layout.rail?.height ?? 0;
      await expect(
        page.getByRole("navigation", { name: "Navegación rápida" }),
      ).toBeVisible();
      await expandMobileSheet(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect
        .poll(() =>
          page
            .locator("aside.e-rescue-rail")
            .evaluate((element) => element.getBoundingClientRect().height),
        )
        .toBeGreaterThan(compactRailHeight + 40);
      const expandedGeometry = await page.evaluate(() => {
        const rail = document
          .querySelector("aside.e-rescue-rail")
          ?.getBoundingClientRect();
        const attribution = document
          .querySelector(".e-rescue-attribution")
          ?.getBoundingClientRect();
        return {
          rail: rail ? { top: rail.top, bottom: rail.bottom, height: rail.height } : null,
          attribution: attribution
            ? { top: attribution.top, bottom: attribution.bottom }
            : null,
        };
      });
      expect(expandedGeometry.rail?.height).toBeLessThanOrEqual(
        (layout.main?.height ?? height) * 0.49,
      );
      expect(expandedGeometry.rail?.bottom).toBeLessThanOrEqual(height + 1);
      expect(expandedGeometry.attribution?.bottom).toBeLessThanOrEqual(
        (expandedGeometry.rail?.top ?? height) - 1,
      );
      await expect(
        page.getByRole("navigation", { name: "Navegación rápida" }),
      ).toBeHidden();
    } else {
      await expect(page.getByTestId("rescue-sheet-toggle")).toBeHidden();
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

test("mantiene la hoja dentro de teléfonos cortos y paisaje", async ({ page }) => {
  for (const viewport of [
    { width: 360, height: 568 },
    { width: 360, height: 640 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(route);
    await waitForMap(page);

    const geometry = await page.evaluate(() => {
      const read = (selector: string) => {
        const bounds = document.querySelector(selector)?.getBoundingClientRect();
        return bounds
          ? { top: bounds.top, bottom: bounds.bottom, height: bounds.height }
          : null;
      };
      return {
        main: read("main.e-rescue-page"),
        rail: read("aside.e-rescue-rail"),
        navigation: read(".e-nav__mobile-bar"),
        horizontalOverflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      };
    });

    expect(geometry.horizontalOverflow).toBe(false);
    expect(geometry.main?.bottom).toBeLessThanOrEqual(viewport.height + 1);
    expect(geometry.rail?.bottom).toBeLessThanOrEqual(viewport.height + 1);

    if (viewport.width <= 767) {
      expect(geometry.navigation).not.toBeNull();
      expect(geometry.rail?.bottom).toBeLessThanOrEqual(
        (geometry.navigation?.top ?? viewport.height) - 1,
      );
      const compactHeight = geometry.rail?.height ?? 0;
      await expandMobileSheet(page);
      await expect
        .poll(() =>
          page
            .locator("aside.e-rescue-rail")
            .evaluate((element) => element.getBoundingClientRect().height),
        )
        .toBeGreaterThan(compactHeight + 30);
      const expanded = await page
        .locator("aside.e-rescue-rail")
        .evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return { top: bounds.top, bottom: bounds.bottom };
        });
      expect(expanded.top).toBeGreaterThanOrEqual(0);
      expect(expanded.bottom).toBeLessThanOrEqual(viewport.height + 1);
    } else {
      await expect(page.getByTestId("rescue-sheet-toggle")).toBeHidden();
    }
  }
});

test("lleva el detalle seleccionado al inicio de una hoja desplazada", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route);
  await waitForMap(page);
  await expandMobileSheet(page);
  const content = page.locator(".e-rescue-rail-content");
  await content.evaluate((element) => element.scrollTo(0, element.scrollHeight));

  await page.getByTestId("rescue-aoi-03").click();
  await expect
    .poll(() => content.evaluate((element) => element.scrollTop))
    .toBeLessThanOrEqual(1);
  const visibility = await page.evaluate(() => {
    const read = (selector: string) => {
      const bounds = document.querySelector(selector)?.getBoundingClientRect();
      return bounds ? { top: bounds.top, bottom: bounds.bottom } : null;
    };
    return {
      contentBounds: read(".e-rescue-rail-content"),
      selectionBounds: read(".e-rescue-selection"),
    };
  });
  expect(visibility.selectionBounds?.top).toBeGreaterThanOrEqual(
    (visibility.contentBounds?.top ?? 0) - 1,
  );
  expect(visibility.selectionBounds?.bottom).toBeLessThanOrEqual(
    (visibility.contentBounds?.bottom ?? 0) + 1,
  );
  await expect(
    page.getByRole("button", { name: "Volver a las 4 áreas" }).first(),
  ).toBeVisible();
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
  await expect(
    page
      .locator(".e-rescue-desktop-intro")
      .getByText("Sin conexión", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".e-rescue-map-status")
      .getByText("Esta imagen requiere conexión", { exact: true }),
  ).toBeVisible();
  await expect(map).toHaveAttribute("data-selected-aoi", "emsr916-aoi03");
  await page.getByText("Instalación y modo offline", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Eliminar Centro de Cali" }),
  ).toBeVisible();

  await context.setOffline(false);
  await expect(
    page
      .locator(".e-rescue-desktop-intro")
      .getByText("En línea", { exact: true }),
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
  await expandMobileSheet(standalonePage);
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
  await expandMobileSheet(page);
  await page.getByText("Instalación y modo offline", { exact: true }).click();
  await expect(
    page.getByText(/toca Compartir y elige “Añadir a pantalla de inicio”/),
  ).toBeVisible();
  await context.close();
});
