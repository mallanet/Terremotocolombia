import type { CollectionCenterProvider } from "../../domain/collection-center-provider";
import { COLOMBIA_QUAKE_COLLECTION_CENTERS } from "./colombia-quake-centers";

export class StaticCollectionCenterProvider implements CollectionCenterProvider {
  readonly sourceName = "static-colombia-quake";

  async list() {
    return COLOMBIA_QUAKE_COLLECTION_CENTERS;
  }
}
