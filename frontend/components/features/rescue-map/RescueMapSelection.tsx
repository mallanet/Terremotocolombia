"use client";

import { localizedDate } from "./helpers";
import { getRescueMapCopy } from "./copy";
import type {
  RescueMapLanguage,
  RescueMapMappingAoi,
  RescueMapMappingImage,
  RescueMapMappingProduct,
} from "@/lib/rescue-map";

interface RescueMapSelectionProps {
  language: RescueMapLanguage;
  aoi: RescueMapMappingAoi;
  product: RescueMapMappingProduct;
  image: RescueMapMappingImage | null;
  isMobile: boolean;
  onClear: () => void;
}

// Renders the "<area> seleccionada" details card that opens above the rail
// content once the user picks an AOI on the map or in the list. The mobile
// variant adds an "overview" button so callers can collapse back to the
// full AOI grid without scrolling.
export default function RescueMapSelection({
  language,
  aoi,
  product,
  image,
  isMobile,
  onClear,
}: RescueMapSelectionProps) {
  const text = getRescueMapCopy(language);
  return (
    <section className="e-rescue-selection" aria-labelledby="rescue-selected-aoi">
      <p>{text.selectedArea}</p>
      <h2 id="rescue-selected-aoi">{aoi.name[language]}</h2>
      <dl>
        <div>
          <dt>{text.product}</dt>
          <dd>
            <span className="e-rescue-type" data-product={product.type}>
              {product.type} · {product.typeLabel[language]}
            </span>
          </dd>
        </div>
        <div>
          <dt>{text.sensor}</dt>
          <dd>
            {image ? `${image.sensor} · ${image.resolutionClass}` : "—"}
          </dd>
        </div>
        <div>
          <dt>{text.acquisition}</dt>
          <dd>{localizedDate(image?.acquisitionUtc ?? null, language)}</dd>
        </div>
        <div>
          <dt>{text.delivery}</dt>
          <dd>{localizedDate(product.expectedDeliveryUtc, language)}</dd>
        </div>
      </dl>
      {isMobile ? (
        <button
          type="button"
          className="e-rescue-selection-overview"
          onClick={onClear}
        >
          {text.overview}
        </button>
      ) : null}
    </section>
  );
}
