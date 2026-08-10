import {
  createSocialPreviewImage,
  SOCIAL_IMAGE_SIZE,
  SOCIAL_IMAGE_TYPE,
} from "@/lib/social-preview";

export const size = SOCIAL_IMAGE_SIZE;
export const contentType = SOCIAL_IMAGE_TYPE;
export const alt =
  "Terremoto Colombia · Mallanet.org — mapa de emergencia y rescate";

export default async function TwitterImage() {
  return createSocialPreviewImage();
}
