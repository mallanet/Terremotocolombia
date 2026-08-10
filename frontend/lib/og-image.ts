import { SITE_URL } from "@/lib/site";

/** Versioned static social card — change the filename when art updates so X/WhatsApp drop stale caches. */
export const OG_IMAGE_PATH = "/og-v2.jpg";
export const OG_IMAGE_URL = `${SITE_URL}${OG_IMAGE_PATH}`;
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_TYPE = "image/jpeg";

export function ogImageMeta(alt: string) {
  return {
    url: OG_IMAGE_PATH,
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    type: OG_IMAGE_TYPE,
    alt,
  };
}
