import type { Router } from "express";
import { env } from "@/config/env";
import { ListCollectionCenters } from "./application/list-collection-centers";
import { ResponseGridClient } from "./infrastructure/responsegrid/responsegrid-client";
import { ResponseGridCollectionCenterProvider } from "./infrastructure/responsegrid/responsegrid-collection-center-provider";
import { CachedCollectionCenterProvider } from "./infrastructure/cached-collection-center-provider";
import { StaticCollectionCenterProvider } from "./infrastructure/static/static-collection-center-provider";
import { MergedCollectionCenterProvider } from "./infrastructure/merged-collection-center-provider";
import type { CollectionCenterProvider } from "./domain/collection-center-provider";
import { createAcopioRouter } from "./interface/http/acopio-router";

const CACHE_TTL_MS = 120_000;
const REQUEST_TIMEOUT_MS = 5_000;
const REFRESH_TIMEOUT_MS = 10_000;

/**
 * Composition root. Siempre sirve la lista estática (centros oficiales del
 * sismo). Si ENABLE_RESPONSEGRID=true, fusiona ResponseGrid encima.
 */
export function buildAcopioRouter(): Router {
  const providers: CollectionCenterProvider[] = [
    new StaticCollectionCenterProvider(),
  ];

  if (
    env.ENABLE_RESPONSEGRID &&
    env.RESPONSEGRID_API_URL &&
    env.RESPONSEGRID_EMERGENCY_SLUG
  ) {
    const responseGrid = new ResponseGridClient({
      baseUrl: env.RESPONSEGRID_API_URL,
      emergencySlug: env.RESPONSEGRID_EMERGENCY_SLUG,
      timeoutMs: REQUEST_TIMEOUT_MS,
      refreshTimeoutMs: REFRESH_TIMEOUT_MS,
    });
    providers.push(
      new CachedCollectionCenterProvider(
        new ResponseGridCollectionCenterProvider(responseGrid),
        CACHE_TTL_MS,
      ),
    );
  }

  const provider =
    providers.length === 1
      ? providers[0]!
      : new MergedCollectionCenterProvider(providers);

  return createAcopioRouter(new ListCollectionCenters(provider));
}
