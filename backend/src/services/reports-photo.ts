import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getObject, isR2Url, keyFromR2Url } from "@/lib/r2";
import { parseImageDataUri } from "@/lib/image";
import type { PhotoData, RemotePhoto } from "@/services/report-types";

const { reports } = schema;

export async function getReportPhoto(
  id: string,
): Promise<PhotoData | RemotePhoto | null> {
  const db = await getDb();
  const rows = await db
    .select({ photo: reports.photo })
    .from(reports)
    .where(eq(reports.id, id));
  const dataUrl = rows[0]?.photo ?? null;
  if (!dataUrl) return null;
  if (/^https?:\/\//i.test(dataUrl)) {
    if (isR2Url(dataUrl)) {
      const obj = await getObject(keyFromR2Url(dataUrl));
      if (obj) return obj;
    }
    return { redirectTo: dataUrl };
  }
  const parsed = parseImageDataUri(dataUrl);
  if (!parsed) return null;
  return { contentType: parsed.contentType, buffer: parsed.bytes };
}
