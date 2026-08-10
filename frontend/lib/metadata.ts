import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { OG_IMAGE_PATH, ogImageMeta } from "@/lib/og-image";

interface PageMetadataInput {
  title: string;
  description: string;
  path?: string;
  index?: boolean;
}

export function pageMetadata({
  title,
  description,
  path,
  index = true,
}: PageMetadataInput): Metadata {
  const fullTitle = `${title} · ${SITE_NAME}`;
  // Explicit images: a partial `openGraph` object replaces the root layout
  // metadata and would otherwise drop the social card on inner pages.
  const socialImages = [ogImageMeta(fullTitle)];
  const meta: Metadata = {
    title: { absolute: fullTitle },
    description,
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
      images: socialImages,
      ...(path ? { url: path } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [OG_IMAGE_PATH],
    },
  };
  if (path) meta.alternates = { canonical: path };
  if (!index) meta.robots = { index: false, follow: false };
  return meta;
}
