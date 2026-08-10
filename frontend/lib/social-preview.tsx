import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { deploymentConfig } from "@/lib/deployment-config";

export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 } as const;
export const SOCIAL_IMAGE_TYPE = "image/png";

/**
 * Open Graph / Twitter card — Mallanet ink canvas, official wordmark,
 * product promise only (no magnitudes, death tolls, or event dates).
 */
export async function createSocialPreviewImage(): Promise<ImageResponse> {
  const logoPath = path.join(
    process.cwd(),
    "public",
    "brand",
    "logo-claro.png",
  );
  const logoData = await readFile(logoPath);
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;
  const domain = deploymentConfig.domains.web;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f2154",
          color: "#e1eaff",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Colombia flag strip — territorial chrome only */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 10,
            display: "flex",
          }}
        >
          <div style={{ flex: 2, background: "#FCD116" }} />
          <div style={{ flex: 1, background: "#003893" }} />
          <div style={{ flex: 1, background: "#CE1126" }} />
        </div>

        {/* next/og ImageResponse requires <img>; next/image is not supported here */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          width={320}
          height={98}
          alt=""
          style={{
            display: "flex",
            objectFit: "contain",
            marginBottom: 36,
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 52,
            fontWeight: 700,
            textAlign: "center",
            color: "#ffffff",
            letterSpacing: "-0.02em",
          }}
        >
          {deploymentConfig.productName}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 26,
            opacity: 0.9,
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          Reportes, mapa y fuentes oficiales de emergencia
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 22,
            color: "#4080f2",
            fontWeight: 600,
          }}
        >
          {domain}
        </div>
      </div>
    ),
    { ...SOCIAL_IMAGE_SIZE },
  );
}
