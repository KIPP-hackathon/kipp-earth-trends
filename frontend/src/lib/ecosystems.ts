import type { EarthRegion } from "./earthApi";

export type EcosystemId =
  | "amazon"
  | "sahara"
  | "ocean"
  | "polar"
  | "antarctic"
  | "boreal"
  | "coral"
  | "himalaya"
  | "pantanal"
  | "congo";

export const ecosystemProcesses: Record<EcosystemId, string[]> = {
  amazon: ["Water recycling", "Forest habitat", "Carbon cycle"],
  sahara: ["Water availability", "Energy exchange", "Dust transport"],
  ocean: ["Water exchange", "Heat exchange", "Atmospheric circulation"],
  polar: ["Seasonal sea ice", "Reflected sunlight", "Ocean–air exchange"],
  antarctic: ["Seasonal sea ice", "Reflected sunlight", "Ocean–air exchange"],
  boreal: ["Seasonal growth", "Soil carbon", "Water availability"],
  coral: ["Reef habitat", "Ocean conditions", "Marine biodiversity"],
  himalaya: [
    "Snow and glacier storage",
    "Seasonal precipitation",
    "River systems",
  ],
  pantanal: ["Seasonal flood pulse", "Wetland habitat", "Water exchange"],
  congo: ["Water recycling", "Peatland carbon", "Forest habitat"],
};
export const ecosystemUnlinkedSignals: Record<
  EcosystemId,
  { name: string; reason: string }[]
> = {
  amazon: [
    {
      name: "Forest cover",
      reason:
        "Needed to examine habitat extent; air temperature does not measure forest condition.",
    },
    {
      name: "Soil moisture",
      reason:
        "Helps examine water available in the soil, separately from rainfall.",
    },
  ],
  sahara: [
    {
      name: "Surface albedo",
      reason:
        "Measures reflected sunlight; air temperature is a different quantity.",
    },
    {
      name: "Vegetation cover",
      reason:
        "Needed to observe vegetation response rather than inferring greening from rainfall.",
    },
  ],
  ocean: [
    {
      name: "Sea-surface temperature",
      reason:
        "Ocean surface temperature is distinct from the air-temperature fields linked here.",
    },
    {
      name: "Salinity and currents",
      reason:
        "Needed to study ocean water transport; near-surface air winds do not measure currents.",
    },
  ],
  polar: [
    {
      name: "Sea ice thickness",
      reason: "Concentration does not measure ice thickness or volume.",
    },
    {
      name: "Surface albedo",
      reason:
        "A direct albedo field is needed to quantify reflected solar radiation.",
    },
  ],
  antarctic: [
    {
      name: "Land ice mass",
      reason: "Sea ice concentration does not measure the Antarctic ice sheet.",
    },
    {
      name: "Ocean heat",
      reason: "Air temperature does not measure heat in the surrounding ocean.",
    },
  ],
  boreal: [
    {
      name: "Soil carbon",
      reason:
        "The selected atmospheric fields do not quantify carbon stocks or net carbon exchange.",
    },
    {
      name: "Permafrost temperature",
      reason:
        "Needed where permafrost occurs; air temperature is only context.",
    },
    {
      name: "Vegetation cover",
      reason: "Needed to observe forest extent and changes in habitat.",
    },
  ],
  coral: [
    {
      name: "Sea-surface temperature",
      reason:
        "Dedicated sea-temperature data are needed to study marine thermal stress.",
    },
    {
      name: "Seawater pH",
      reason:
        "Needed to examine ocean acidity; atmospheric fields do not measure it.",
    },
    {
      name: "Coral cover",
      reason: "Needed to observe reef habitat and condition.",
    },
  ],
  himalaya: [
    {
      name: "Snow cover",
      reason:
        "Precipitation totals do not measure how much snow remains on the ground.",
    },
    {
      name: "Glacier mass",
      reason:
        "Required to quantify glacier change; air temperature alone is insufficient.",
    },
    {
      name: "River discharge",
      reason: "Needed to examine river water supply and its seasonality.",
    },
  ],
  pantanal: [
    {
      name: "Flooded area",
      reason:
        "Needed to observe the flood pulse; rainfall is only one part of the water system.",
    },
    {
      name: "River level",
      reason:
        "Needed to describe river conditions rather than inferring them from atmospheric fields.",
    },
    { name: "Water quality", reason: "Requires dedicated water measurements." },
  ],
  congo: [
    {
      name: "Forest cover",
      reason: "Needed to observe habitat extent and forest change.",
    },
    {
      name: "Peat water level",
      reason:
        "Needed to study peatland hydrology beyond atmospheric water exchange.",
    },
    {
      name: "Soil carbon",
      reason:
        "The linked context variables do not measure carbon stocks, uptake or methane emissions.",
    },
  ],
};
export const catalogSources = {
  merra: {
    name: "NASA GMAO · MERRA-2",
    url: "https://gmao.gsfc.nasa.gov/gmao-products/merra-2/",
  },
  rain: { name: "NASA GPM · IMERG", url: "https://gpm.nasa.gov/data/imerg" },
  ice: {
    name: "NSIDC · Sea Ice Index v4",
    url: "https://nsidc.org/data/g02135/versions/4",
  },
  dust: {
    name: "NASA · Saharan dust and Amazon nutrients",
    url: "https://www.nasa.gov/missions/calipso/nasa-satellite-reveals-how-much-saharan-dust-feeds-amazons-plants/",
  },
  sahara: {
    name: "NASA GPM · Rain in the Sahara",
    url: "https://gpm.nasa.gov/applications/weather/news/saharaDesertAugust2024",
  },
  amazon: {
    name: "Nature · Forest–rainfall feedbacks",
    url: "https://www.nature.com/articles/s41586-026-10456-0",
  },
  boreal: {
    name: "NASA · Boreal forests and carbon",
    url: "https://science.nasa.gov/missions/landsat/nasa-study-finds-potential-carbon-sink-in-boreal-forest-growth/",
  },
  coral: {
    name: "NOAA · Coral Triangle",
    url: "https://coralreef.noaa.gov/digital-corals/stories/jun20/coral-triangle/",
  },
  himalaya: {
    name: "ICIMOD · Hindu Kush Himalaya cryosphere",
    url: "https://www.icimod.org/press-release/regional-cryosphere-strategy/",
  },
  pantanal: {
    name: "UNESCO · Pantanal Biosphere Reserve",
    url: "https://www.unesco.org/en/mab/pantanal",
  },
  congo: {
    name: "UNEP · Congo Basin peatlands",
    url: "https://www.unep.org/en/news-and-stories/story/critical-ecosystems-congo-basin-peatlands",
  },
};

export const catalogEcosystems: {
  id: EcosystemId;
  name: string;
  subtitle: string;
  coordinates: string;
  summary: string;
  question: string;
  limitation: string;
  source: { name: string; url: string };
  region: EarthRegion;
}[] = [
  {
    id: "amazon",
    name: "Amazon rainforest",
    subtitle: "A forest that recycles water",
    coordinates: "SOUTH AMERICA",
    summary:
      "Water moves between soil, vegetation and air. Investigate the conditions that support a living forest, through wet and dry seasons.",
    question:
      "How do precipitation, evaporation and air temperature change together across the Amazon seasons?",
    limitation:
      "This rectangle is an Amazon study window, not an exact forest or basin boundary. Evaporation is a model estimate; these variables alone cannot measure forest health or attribute deforestation effects.",
    source: catalogSources.amazon,
    region: {
      id: "custom-catalog-amazon",
      name: "Amazon study rectangle",
      bbox: "-74,-15,-48,5",
      longitude: -61,
      latitude: -5,
    },
  },
  {
    id: "sahara",
    name: "Sahara Desert",
    subtitle: "Water, wind and a moving landscape",
    coordinates: "NORTH AFRICA",
    summary:
      "A desert is a functioning ecosystem. Look at scarce rainfall, thermal conditions and winds that transport mineral dust far beyond its borders.",
    question:
      "How do rainfall, near-surface winds and dust vary seasonally over the Sahara?",
    limitation:
      "Sahara and Sahel are different regions. The study rectangle is approximate. Dust optical depth does not measure nutrient deposition, and monthly fields do not detect individual dust storms.",
    source: catalogSources.sahara,
    region: {
      id: "custom-catalog-sahara",
      name: "Sahara study rectangle",
      bbox: "-17,18,35,30",
      longitude: 9,
      latitude: 24,
    },
  },
  {
    id: "ocean",
    name: "Tropical Atlantic",
    subtitle: "An exchange between ocean and air",
    coordinates: "ATLANTIC OCEAN",
    summary:
      "Moisture, energy and momentum cross the ocean surface. Explore the atmosphere above the sea and its seasonal patterns.",
    question:
      "How do evaporation, air temperature and winds vary over the tropical Atlantic?",
    limitation:
      "This is an ocean study rectangle. Air temperature is not sea-surface temperature. These monthly fields cannot resolve ocean currents or establish hurricane formation.",
    source: catalogSources.merra,
    region: {
      id: "custom-catalog-ocean",
      name: "Tropical Atlantic study rectangle",
      bbox: "-50,0,-20,20",
      longitude: -35,
      latitude: 10,
    },
  },
  {
    id: "polar",
    name: "Arctic Ocean",
    subtitle: "A seasonal rhythm of ice and heat",
    coordinates: "NORTHERN HIGH LATITUDES",
    summary:
      "Freezing and melting are part of a seasonal cycle. Compare ice-covered ocean fractions with the surrounding atmosphere over time.",
    question:
      "How do sea ice concentration and air temperature vary through the Arctic seasons?",
    limitation:
      "The rectangle includes land and missing satellite cells. Concentration is not ice extent, thickness or volume. Compare matching seasons and inspect regional coverage.",
    source: catalogSources.ice,
    region: {
      id: "custom-catalog-polar",
      name: "Arctic study rectangle",
      bbox: "-180,70,180,90",
      longitude: 0,
      latitude: 80,
    },
  },
  {
    id: "antarctic",
    name: "Antarctica & Southern Ocean",
    subtitle: "Ice, reflected sunlight and ocean exchange",
    coordinates: "SOUTHERN HIGH LATITUDES",
    summary:
      "Seasonal sea ice changes the bright surface that reflects sunlight and the exchange between ocean and atmosphere. Antarctic land ice and sea ice are different parts of the system.",
    question:
      "How do sea ice concentration, air temperature and winds vary around Antarctica through the year?",
    limitation:
      "The rectangle covers the Antarctic continent and surrounding ocean. Sea ice data describe valid ocean cells only, not the ice sheet. Air temperature does not measure glacier mass, ice-shelf stability, ocean heat or albedo; none is inferred from these context variables.",
    source: catalogSources.ice,
    region: {
      id: "custom-catalog-antarctic",
      name: "Antarctic and Southern Ocean study rectangle",
      bbox: "-180,-90,180,-60",
      longitude: 0,
      latitude: -75,
    },
  },
  {
    id: "boreal",
    name: "Boreal forest · Taiga",
    subtitle: "A northern forest with carbon-rich soils",
    coordinates: "CANADA · RUSSIA · SCANDINAVIA",
    summary:
      "The boreal forest spans northern continents. Its trees and soils hold carbon, and some areas overlap permafrost. Explore the seasonal thermal and water conditions around this forest system.",
    question:
      "How do temperature, precipitation and evaporation change together in a Canadian boreal study window?",
    limitation:
      "This preset samples Canada, not the entire circumpolar forest. The rectangle includes other land covers. Permafrost does not occur throughout the taiga; these atmospheric fields do not measure frozen soil, carbon stocks, vegetation growth or fire occurrence.",
    source: catalogSources.boreal,
    region: {
      id: "custom-catalog-boreal",
      name: "Canadian boreal study rectangle",
      bbox: "-120,50,-60,65",
      longitude: -90,
      latitude: 57.5,
    },
  },
  {
    id: "coral",
    name: "Coral Triangle",
    subtitle: "A meeting place for marine biodiversity",
    coordinates: "SOUTHEAST ASIA · WESTERN PACIFIC",
    summary:
      "Reefs in the Coral Triangle provide habitat for an exceptional diversity of marine life. Explore rainfall, winds and the atmosphere above the region as environmental context.",
    question:
      "How do precipitation, near-surface winds and air temperature vary seasonally above the Coral Triangle?",
    limitation:
      "This broad rectangle includes islands and waters outside reef habitat. Air temperature is not sea-surface temperature. Coral bleaching, ocean acidity, biodiversity and reef health require dedicated measurements that are not supplied by this preset.",
    source: catalogSources.coral,
    region: {
      id: "custom-catalog-coral",
      name: "Coral Triangle study rectangle",
      bbox: "110,-13,163,23",
      longitude: 136.5,
      latitude: 5,
    },
  },
  {
    id: "himalaya",
    name: "Himalaya & Tibetan Plateau",
    subtitle: "High mountains connected to river systems",
    coordinates: "HIGH MOUNTAIN ASIA",
    summary:
      "Snow and glaciers store water in High Mountain Asia and contribute to river systems alongside rainfall. Explore the atmospheric conditions of this high-elevation environment.",
    question:
      "How do monthly air temperature and precipitation vary across a Himalayan–Tibetan study window?",
    limitation:
      "The rectangle is not a mountain, glacier or drainage-basin mask. Coarse reanalysis grids smooth elevation, and mountain precipitation estimates have limitations. Precipitation is not glacier mass, snow accumulation, river discharge or a measure of downstream water security.",
    source: catalogSources.himalaya,
    region: {
      id: "custom-catalog-himalaya",
      name: "Himalayan–Tibetan study rectangle",
      bbox: "70,26,105,38",
      longitude: 87.5,
      latitude: 32,
    },
  },
  {
    id: "pantanal",
    name: "Pantanal",
    subtitle: "A wetland shaped by a seasonal flood pulse",
    coordinates: "BRAZIL · BOLIVIA · PARAGUAY",
    summary:
      "The seasonal movement of water supports a mosaic of wetland habitats. Look beyond extreme floods and droughts to the recurring cycles that sustain this living landscape.",
    question:
      "How do rainfall, evaporation and air temperature change through the Pantanal’s wet and dry seasons?",
    limitation:
      "The study rectangle includes adjacent uplands and is not an inundation mask. Atmospheric water inputs and outputs alone do not measure flooded area, river level, water quality, habitat condition or net carbon exchange.",
    source: catalogSources.pantanal,
    region: {
      id: "custom-catalog-pantanal",
      name: "Pantanal study rectangle",
      bbox: "-59,-23,-54,-15",
      longitude: -56.5,
      latitude: -19,
    },
  },
  {
    id: "congo",
    name: "Congo Basin",
    subtitle: "Tropical forest, water and peatland carbon",
    coordinates: "CENTRAL AFRICA",
    summary:
      "The Congo Basin’s forests and peatlands connect the water and carbon cycles. Their ecological roles invite questions about ordinary seasonal conditions as well as environmental change.",
    question:
      "How do precipitation, evaporation and near-surface humidity vary across a central Congo study window?",
    limitation:
      "This rectangular window is not the full watershed, a forest mask or the peatland boundary. The selected fields provide atmospheric context; they do not quantify peat depth, carbon stocks, carbon uptake, methane emissions or net greenhouse-gas balance.",
    source: catalogSources.congo,
    region: {
      id: "custom-catalog-congo",
      name: "Central Congo study rectangle",
      bbox: "9,-6,30,5",
      longitude: 19.5,
      latitude: -0.5,
    },
  },
];
