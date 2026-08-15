import { listReports } from "@/services/reports-read";
import type { CollectionCenter } from "../../domain/collection-center";
import type { CollectionCenterProvider } from "../../domain/collection-center-provider";
import {
  isShelterReport,
  toCollectionCenterFromReport,
} from "./reports-collection-center-mapper";

export class ReportsCollectionCenterProvider implements CollectionCenterProvider {
  readonly sourceName = "citizen-reports";

  constructor(private readonly country: string) {}

  async list(): Promise<readonly CollectionCenter[]> {
    const reports = await listReports();
    return reports
      .filter(isShelterReport)
      .map((report) => toCollectionCenterFromReport(report, this.country));
  }
}
