export const MAP_TOUR_STORAGE_KEY = "tc-map-tour-v1";

export const MAP_TUTORIAL_STEPS = [
  {
    element: '[data-tour="map-filters"]',
    title: "Capas del mapa",
    body: "Cada chip es un tipo de punto. Solicitar ayuda son pedidos. Tengo suministros es gente que tiene y puede entregar.",
  },
  {
    element: '[data-tour="map-search"]',
    title: "Busca una zona",
    body: "Escribe una dirección o usa tu ubicación para centrar el mapa.",
  },
  {
    element: '[data-tour="map-report"]',
    title: "Publica un punto",
    body: "Toca Reportar, elige si pides ayuda o si ofreces suministros, ubica el punto y envía. Un toque suelto en el mapa no crea nada.",
  },
] as const;
