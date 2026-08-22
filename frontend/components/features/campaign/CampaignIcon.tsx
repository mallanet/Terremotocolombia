import Image from "next/image";

const ICONS = {
  registrar: "/campana/icons/icon-campana-registrar.png",
  punto: "/campana/icons/icon-campana-punto.png",
  horario: "/campana/icons/icon-campana-horario.png",
  contacto: "/campana/icons/icon-campana-contacto.png",
  material: "/campana/icons/icon-campana-material.png",
} as const;

export default function CampaignIcon({
  name,
  size,
}: {
  name: keyof typeof ICONS;
  size: number;
}) {
  return (
    <Image
      src={ICONS[name]}
      alt=""
      width={size}
      height={size}
      unoptimized
      aria-hidden
      className="shrink-0 object-contain"
    />
  );
}
