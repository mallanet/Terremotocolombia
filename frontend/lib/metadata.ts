import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

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
  // metadata and would otherwise drop `/opengraph-image` on inner pages.
  const socialImages = [
    {
      url: "/opengraph-image",
      width: 1200,
      height: 630,
      alt: fullTitle,
    },
  ];
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
      images: ["/twitter-image"],
    },
  };
  if (path) meta.alternates = { canonical: path };
  if (!index) meta.robots = { index: false, follow: false };
  return meta;
}
