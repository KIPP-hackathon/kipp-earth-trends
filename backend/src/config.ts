// Curated context belongs to the API. Bboxes are study regions, not event footprints.
export const regions = [
  {
    id: "saofrancisco",
    name: "São Francisco · study area",
    bbox: "-47,-21,-38,-8",
    longitude: -43,
    latitude: -14,
  },
  {
    id: "amazonia",
    name: "Central Amazon · study area",
    bbox: "-66,-9,-58,-1",
    longitude: -62,
    latitude: -5,
  },
  {
    id: "pantanal",
    name: "Pantanal · study area",
    bbox: "-59,-22,-54,-15",
    longitude: -56,
    latitude: -18,
  },
  {
    id: "pacifico",
    name: "Equatorial Pacific · ENSO context",
    bbox: "-170,-5,-120,5",
    longitude: -145,
    latitude: 0,
  },
  {
    id: "caribe",
    name: "Caribbean and Gulf of Mexico · study area",
    bbox: "-98,8,-55,32",
    longitude: -77,
    latitude: 20,
  },
  {
    id: "japao",
    name: "Northeastern Japan · study area",
    bbox: "138,33,146,42",
    longitude: 142,
    latitude: 38,
  },
  {
    id: "arctico",
    name: "Arctic · study area",
    bbox: "-180,60,180,90",
    longitude: 0,
    latitude: 75,
  },
  {
    id: "antartida",
    name: "Antarctic · study area",
    bbox: "-180,-90,180,-60",
    longitude: 0,
    latitude: -75,
  },
];

export const configuration = {
  version: 1,
  regions,
  playback: { cadenceMs: 1200, lookAhead: 3, initialBuffer: 2 },
  comparison: { maxGlobes: 2, synchronizedCamera: true },
  limitations: [
    "Study areas are rectangles, not exact basin boundaries or affected areas.",
    "Monthly resolution provides environmental context; it cannot resolve hurricane tracks or tsunami waves.",
    "Visual comparison does not automatically identify similar phenomena or establish causality.",
  ],
};

export type HistoricalEvent = {
  id: string;
  title: string;
  category: string;
  location: string;
  window: [string, string];
  region: string;
  variable: string;
  description: string;
  limitation: string;
  source: { name: string; url: string };
};
export const historicalEvents: HistoricalEvent[] = [
  {
    id: "pantanal-2024",
    title: "Pantanal fires · 2024",
    category: "Wildfires",
    location: "Pantanal · Brazil",
    window: ["2024-06", "2024-09"],
    region: "pantanal",
    variable: "rainfall",
    description:
      "Satellite records documented fires in the Pantanal in 2024. Explore monthly rainfall and temperature context in the study area.",
    limitation:
      "The rectangle is not a burned-area footprint. Monthly rainfall, air temperature and humidity provide environmental context, not hotspots or fire detection.",
    source: {
      name: "NASA Earth Observatory",
      url: "https://science.nasa.gov/earth/earth-observatory/smoke-fills-south-american-skies-153295/",
    },
  },
  {
    id: "elnino-2024",
    title: "End of El Niño 2023–2024",
    category: "El Niño",
    location: "Equatorial Pacific",
    window: ["2024-01", "2024-05"],
    region: "pacifico",
    variable: "temperature",
    description:
      "The 2023–2024 episode weakened in the first half of 2024. This preset compares monthly environmental fields during that period.",
    limitation:
      "Air temperature is not sea-surface temperature. Without an ONI index or climatology, these fields do not diagnose El Niño.",
    source: {
      name: "NASA Earth Observatory",
      url: "https://science.nasa.gov/earth/earth-observatory/el-nino-exits-153058/",
    },
  },
  {
    id: "beryl-2024",
    title: "Hurricane Beryl",
    category: "Hurricanes",
    location: "Caribbean · Gulf of Mexico",
    window: ["2024-06", "2024-07"],
    region: "caribe",
    variable: "rainfall",
    description:
      "Beryl occurred from June 28 to July 9, 2024. Compare monthly precipitation context in the Caribbean and the Gulf.",
    limitation:
      "The bbox is illustrative, not a storm track. Monthly means do not show peak winds, daily rainfall or hurricane movement.",
    source: {
      name: "NOAA · National Hurricane Center",
      url: "https://www.nhc.noaa.gov/data/tcr/AL022024_Beryl.pdf",
    },
  },
  {
    id: "pantanal-2020",
    title: "Pantanal fires · 2020",
    category: "Wildfires",
    location: "Pantanal · Brazil",
    window: ["2020-08", "2020-10"],
    region: "pantanal",
    variable: "rainfall",
    description:
      "Historical record of extensive fires in the Pantanal in 2020.",
    limitation:
      "Monthly environmental fields provide context, not burned area or fire detection. The rectangle is not the affected footprint.",
    source: {
      name: "NASA Earth Observatory",
      url: "https://science.nasa.gov/earth/earth-observatory/fires-char-the-pantanal-147269/",
    },
  },
  {
    id: "elnino-2015",
    title: "El Niño 2015–2016",
    category: "El Niño",
    location: "Equatorial Pacific",
    window: ["2015-03", "2016-05"],
    region: "pacifico",
    variable: "temperature",
    description:
      "Explore monthly environmental context during the documented 2015–2016 El Niño episode.",
    limitation:
      "Air temperature is not sea-surface temperature. ENSO indices and sea temperature are needed to characterize this phenomenon; monthly context alone does not diagnose El Niño.",
    source: {
      name: "NOAA · ENSO",
      url: "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ensofaq.shtml",
    },
  },
  {
    id: "amazonia-2019",
    title: "Amazon fires · 2019",
    category: "Wildfires",
    location: "Amazon · Brazil",
    window: ["2019-07", "2019-10"],
    region: "amazonia",
    variable: "rainfall",
    description:
      "Satellite imagery recorded fire activity in the Amazon in 2019.",
    limitation:
      "Monthly environmental fields do not detect fires or attribute their causes. The rectangle does not reproduce the distribution of fires.",
    source: {
      name: "NASA Earth Observatory",
      url: "https://science.nasa.gov/earth/earth-observatory/uptick-in-amazon-fire-activity-in-2019-145498/",
    },
  },
  {
    id: "katrina-2005",
    title: "Hurricane Katrina",
    category: "Hurricanes",
    location: "Gulf of Mexico · United States",
    window: ["2005-08", "2005-08"],
    region: "caribe",
    variable: "rainfall",
    description:
      "Historical record of the cyclone that crossed the Gulf of Mexico in August 2005.",
    limitation:
      "Monthly environmental fields cannot resolve storm peaks. Hurricane analysis requires subdaily data and a storm track.",
    source: {
      name: "NOAA · National Hurricane Center",
      url: "https://www.nhc.noaa.gov/data/tcr/AL122005_Katrina.pdf",
    },
  },
  {
    id: "tohoku-2011",
    title: "Tōhoku tsunami",
    category: "Tsunamis",
    location: "Japan · Pacific Ocean",
    window: ["2011-03", "2011-03"],
    region: "japao",
    variable: "rainfall",
    description:
      "The earthquake on March 11, 2011 generated a tsunami recorded across the Pacific.",
    limitation:
      "No suitable layer: sea level, DART buoys and seismic records are required. Monthly rainfall and temperature do not represent a tsunami wave.",
    source: {
      name: "NOAA · Tsunami Research",
      url: "https://nctr.pmel.noaa.gov/honshu20110311/",
    },
  },
];
