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
  // metadata and would otherwise drop the social card on inner pages.
  // Use the static PNG (not /opengraph-image) so X/WhatsApp can cache-bust.
  const socialImages = [
    {
      url: "/og-1200x630.png",
      width: 1200,
      height: 630,
      type: "image/png",
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
