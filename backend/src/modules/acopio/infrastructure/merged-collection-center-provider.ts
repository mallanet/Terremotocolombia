import type { CollectionCenter } from "../domain/collection-center";
import type { CollectionCenterProvider } from "../domain/collection-center-provider";

/** Une varias fuentes; si una falla, las demás siguen sirviendo. */
export class MergedCollectionCenterProvider implements CollectionCenterProvider {
  readonly sourceName = "merged";

  constructor(private readonly providers: readonly CollectionCenterProvider[]) {}

  async list(): Promise<readonly CollectionCenter[]> {
    const chunks = await Promise.all(
      this.providers.map(async (provider) => {
        try {
          return await provider.list();
        } catch (err) {
          console.error(
            JSON.stringify({
              msg: "acopio.provider_failed",
              source: provider.sourceName,
              error: err instanceof Error ? err.message : String(err),
            }),
          );
          return [] as readonly CollectionCenter[];
        }
      }),
    );
    const byId = new Map<string, CollectionCenter>();
    for (const center of chunks.flat()) {
      if (!byId.has(center.id)) byId.set(center.id, center);
    }
    return [...byId.values()];
  }
}
