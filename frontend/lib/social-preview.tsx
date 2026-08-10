import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { deploymentConfig } from "@/lib/deployment-config";

export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 } as const;
export const SOCIAL_IMAGE_TYPE = "image/png";

/** Shared Open Graph / Twitter card: pin mark PNG + product/org from deployment config. */
export async function createSocialPreviewImage(): Promise<ImageResponse> {
  const iconPath = path.join(process.cwd(), "public", "icon-512.png");
  const iconData = await readFile(iconPath);
  const iconSrc = `data:image/png;base64,${iconData.toString("base64")}`;

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
          background:
            "linear-gradient(135deg, #00245E 0%, #002F75 45%, #003893 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <img
          src={iconSrc}
          width={128}
          height={128}
          alt=""
          style={{
            borderRadius: 28,
            marginBottom: 32,
          }}
        />
        <div style={{ fontSize: 56, fontWeight: 800, textAlign: "center" }}>
          {deploymentConfig.productName}
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 28,
            opacity: 0.85,
            textAlign: "center",
          }}
        >
          {deploymentConfig.orgName}
        </div>
      </div>
    ),
    { ...SOCIAL_IMAGE_SIZE },
  );
}
