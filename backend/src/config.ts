// Curated context belongs to the API. Bboxes are study regions, not event footprints.
export const regions = [
  {
    id: "saofrancisco",
    name: "São Francisco · recorte",
    bbox: "-47,-21,-38,-8",
    longitude: -43,
    latitude: -14,
  },
  {
    id: "amazonia",
    name: "Amazônia central · recorte",
    bbox: "-66,-9,-58,-1",
    longitude: -62,
    latitude: -5,
  },
  {
    id: "pantanal",
    name: "Pantanal · recorte",
    bbox: "-59,-22,-54,-15",
    longitude: -56,
    latitude: -18,
  },
  {
    id: "pacifico",
    name: "Pacífico equatorial · contexto ENSO",
    bbox: "-170,-5,-120,5",
    longitude: -145,
    latitude: 0,
  },
  {
    id: "caribe",
    name: "Caribe e Golfo do México · recorte",
    bbox: "-98,8,-55,32",
    longitude: -77,
    latitude: 20,
  },
  {
    id: "japao",
    name: "Nordeste do Japão · recorte",
    bbox: "138,33,146,42",
    longitude: 142,
    latitude: 38,
  },
  {
    id: "arctico",
    name: "Ártico · recorte",
    bbox: "-180,60,180,90",
    longitude: 0,
    latitude: 75,
  },
  {
    id: "antartida",
    name: "Antártida · recorte",
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
    "Os recortes são retângulos de estudo, não limites exatos de bacias ou áreas atingidas.",
    "A resolução mensal permite observar contexto ambiental; não resolve a trajetória de furacões ou ondas de tsunami.",
    "Comparação visual não identifica automaticamente fenômenos semelhantes nem estabelece causalidade.",
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
    title: "Incêndios no Pantanal · 2024",
    category: "Queimadas",
    location: "Pantanal · Brasil",
    window: ["2024-06", "2024-09"],
    region: "pantanal",
    variable: "rainfall",
    description:
      "Registros de satélite documentaram fogo no Pantanal em 2024. Explore o contexto mensal de chuva e temperatura no recorte.",
    limitation:
      "O recorte não é uma área queimada. Não há focos de calor nem detecção de incêndios nesta camada; MODIS disponível apenas em parte de 2024.",
    source: {
      name: "NASA Earth Observatory",
      url: "https://science.nasa.gov/earth/earth-observatory/smoke-fills-south-american-skies-153295/",
    },
  },
  {
    id: "elnino-2024",
    title: "Fim do El Niño 2023–2024",
    category: "El Niño",
    location: "Pacífico equatorial",
    window: ["2024-01", "2024-05"],
    region: "pacifico",
    variable: "temperature",
    description:
      "O episódio de 2023–2024 enfraqueceu no primeiro semestre de 2024. O preset permite comparar campos ambientais mensais nesse período.",
    limitation:
      "Temperatura do ar não é temperatura da superfície do mar. Sem índice ONI ou climatologia, estes campos não diagnosticam El Niño.",
    source: {
      name: "NASA Earth Observatory",
      url: "https://science.nasa.gov/earth/earth-observatory/el-nino-exits-153058/",
    },
  },
  {
    id: "beryl-2024",
    title: "Furacão Beryl",
    category: "Furacões",
    location: "Caribe · Golfo do México",
    window: ["2024-06", "2024-07"],
    region: "caribe",
    variable: "rainfall",
    description:
      "Beryl ocorreu entre 28 de junho e 9 de julho de 2024. Compare o contexto mensal de precipitação no Caribe e no Golfo.",
    limitation:
      "O bbox é ilustrativo, não uma trajetória. Médias mensais não mostram o pico de vento, a chuva diária ou o deslocamento do furacão.",
    source: {
      name: "NOAA · National Hurricane Center",
      url: "https://www.nhc.noaa.gov/data/tcr/AL022024_Beryl.pdf",
    },
  },
  {
    id: "pantanal-2020",
    title: "O Pantanal em chamas · 2020",
    category: "Queimadas",
    location: "Pantanal · Brasil",
    window: ["2020-08", "2020-10"],
    region: "pantanal",
    variable: "rainfall",
    description:
      "Registro histórico de incêndios extensos no Pantanal em 2020.",
    limitation:
      "Fora do histórico atualmente carregado. Não substituímos o período por uma simulação.",
    source: {
      name: "NASA Earth Observatory",
      url: "https://science.nasa.gov/earth/earth-observatory/fires-char-the-pantanal-147269/",
    },
  },
  {
    id: "elnino-2015",
    title: "El Niño 2015–2016",
    category: "El Niño",
    location: "Pacífico equatorial",
    window: ["2015-03", "2016-05"],
    region: "pacifico",
    variable: "temperature",
    description:
      "Ficha histórica para uma futura comparação entre episódios de ENSO.",
    limitation:
      "Fora do histórico carregado; exige também índices ENSO e temperatura do mar para caracterizar o fenômeno.",
    source: {
      name: "NOAA · ENSO",
      url: "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ensofaq.shtml",
    },
  },
  {
    id: "amazonia-2019",
    title: "Fogo na Amazônia · 2019",
    category: "Queimadas",
    location: "Amazônia · Brasil",
    window: ["2019-07", "2019-10"],
    region: "amazonia",
    variable: "rainfall",
    description:
      "Imagens de satélite registraram atividade de fogo na Amazônia em 2019.",
    limitation:
      "Fora do histórico carregado. O recorte não reproduz a distribuição dos incêndios.",
    source: {
      name: "NASA Earth Observatory",
      url: "https://science.nasa.gov/earth/earth-observatory/uptick-in-amazon-fire-activity-in-2019-145498/",
    },
  },
  {
    id: "katrina-2005",
    title: "Furacão Katrina",
    category: "Furacões",
    location: "Golfo do México · Estados Unidos",
    window: ["2005-08", "2005-08"],
    region: "caribe",
    variable: "rainfall",
    description:
      "Registro histórico do ciclone que atravessou o Golfo do México em agosto de 2005.",
    limitation:
      "Fora do histórico carregado; uma análise do furacão exige dados subdiários e trajetória.",
    source: {
      name: "NOAA · National Hurricane Center",
      url: "https://www.nhc.noaa.gov/data/tcr/AL122005_Katrina.pdf",
    },
  },
  {
    id: "tohoku-2011",
    title: "Tsunami de Tōhoku",
    category: "Tsunamis",
    location: "Japão · Oceano Pacífico",
    window: ["2011-03", "2011-03"],
    region: "japao",
    variable: "rainfall",
    description:
      "O terremoto de 11 de março de 2011 gerou um tsunami registrado no Pacífico.",
    limitation:
      "Sem camada adequada: requer nível do mar, boias DART e registros sísmicos. Chuva e temperatura mensais não representam uma onda de tsunami.",
    source: {
      name: "NOAA · Tsunami Research",
      url: "https://nctr.pmel.noaa.gov/honshu20110311/",
    },
  },
];
