import type { RegionId, Variable } from "./analysis";
import { createScenario } from "./comparison";
import type { Scenario } from "./comparison";
import { LAST_FRAME, parseMonth } from "./playback";

export type EventCategory = "Queimadas" | "El Niño" | "Furacões" | "Tsunamis";
export type EventPhase = "before" | "during" | "after";
export type NaturalEvent = {
  id: string;
  title: string;
  category: EventCategory;
  location: string;
  dates: string;
  window: [string, string];
  description: string;
  question: string;
  layers: string[];
  limitation: string;
  source: { name: string; url: string };
  preset?: { region: RegionId; variable: Variable };
};
export const naturalEvents: NaturalEvent[] = [
  {
    id: "pantanal-2020",
    title: "O Pantanal em chamas",
    category: "Queimadas",
    location: "Pantanal · Brasil",
    dates: "2020",
    window: ["2020-08", "2020-10"],
    description:
      "Em 2020, incêndios atingiram extensas áreas do Pantanal. O registro histórico convida a investigar a relação entre água, vegetação e fogo.",
    question:
      "Como observar chuva e vegetação antes e depois de uma temporada de fogo?",
    layers: ["Focos de calor", "Chuva", "Vegetação"],
    limitation:
      "O preset recorta uma série inventada do Pantanal. Não contém focos de calor nem reproduz os impactos dos incêndios.",
    source: {
      name: "NASA Earth Observatory",
      url: "https://science.nasa.gov/earth/earth-observatory/fires-char-the-pantanal-147269/",
    },
    preset: { region: "pantanal", variable: "vegetation" },
  },
  {
    id: "elnino-2015",
    title: "El Niño 2015–2016",
    category: "El Niño",
    location: "Pacífico · contexto na Amazônia",
    dates: "2015–2016",
    window: ["2015-03", "2016-05"],
    description:
      "O El Niño envolve mudanças no oceano e na atmosfera do Pacífico tropical. Seus efeitos regionais podem ser investigados em diferentes partes do planeta.",
    question:
      "Como comparar o contexto regional de chuva durante episódios diferentes?",
    layers: ["Temperatura do mar", "Índices ENSO", "Chuva"],
    limitation:
      "O preset mostra apenas contexto simulado na Amazônia. A temperatura disponível é do ar; não há temperatura do mar nem detecção de El Niño.",
    source: {
      name: "NOAA · ENSO",
      url: "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ensofaq.shtml",
    },
    preset: { region: "amazonia", variable: "rainfall" },
  },
  {
    id: "amazonia-2019",
    title: "Fogo na Amazônia",
    category: "Queimadas",
    location: "Amazônia · Brasil",
    dates: "2019",
    window: ["2019-07", "2019-10"],
    description:
      "Imagens de satélite documentaram o aumento da atividade de fogo na Amazônia em 2019. Observar vários sinais ajuda a formular perguntas sobre a paisagem.",
    question: "O que muda quando olhamos para chuva em vez de vegetação?",
    layers: ["Focos de calor", "Uso do solo", "Vegetação"],
    limitation:
      "A série inventada da Amazônia central é um recorte educativo, sem representar a distribuição dos incêndios reais de 2019.",
    source: {
      name: "NASA Earth Observatory",
      url: "https://science.nasa.gov/earth/earth-observatory/uptick-in-amazon-fire-activity-in-2019-145498/",
    },
    preset: { region: "amazonia", variable: "vegetation" },
  },
  {
    id: "katrina-2005",
    title: "Furacão Katrina",
    category: "Furacões",
    location: "Golfo do México · Estados Unidos",
    dates: "23–30 ago. 2005",
    window: ["2005-08", "2005-08"],
    description:
      "O Katrina atravessou o Golfo do México em agosto de 2005. Sua trajetória é um ponto de partida para estudar a evolução de um ciclone tropical.",
    question:
      "Como vento, pressão e temperatura do oceano variaram ao longo da trajetória?",
    layers: ["Trajetória", "Vento e pressão", "Temperatura do mar"],
    limitation:
      "Ficha histórica. A região e as camadas de ciclones ainda não estão integradas. Séries mensais brasileiras não representam este evento.",
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
    dates: "11 mar. 2011",
    window: ["2011-03", "2011-03"],
    description:
      "O terremoto de março de 2011 gerou um tsunami registrado em estações no Pacífico. Essas observações permitem estudar a propagação das ondas.",
    question: "Como a onda foi registrada em diferentes pontos do oceano?",
    layers: ["Nível do mar", "Boias DART", "Registros sísmicos"],
    limitation:
      "Ficha histórica. São necessários dados de nível do mar com resolução adequada; médias mensais de clima não permitem analisar a onda.",
    source: {
      name: "NOAA · Tsunami Research",
      url: "https://nctr.pmel.noaa.gov/honshu20110311/",
    },
  },
];
export const phaseNames: Record<EventPhase, string> = {
  before: "Antes",
  during: "Durante",
  after: "Depois",
};
export function eventScenario(
  event: NaturalEvent,
  phase: EventPhase,
): Scenario | null {
  if (!event.preset) return null;
  const start = parseMonth(event.window[0]),
    end = parseMonth(event.window[1]);
  if (start === null || end === null) return null;
  const count = end - start + 1;
  const offset = phase === "before" ? -count : phase === "after" ? count : 0;
  if (start + offset < 0 || end + offset > LAST_FRAME) return null;
  return createScenario({
    ...event.preset,
    context: `${event.title} · ${phaseNames[phase].toLowerCase()} · simulação`,
    timeline: {
      start: start + offset,
      end: end + offset,
      frame: start + offset,
    },
  });
}
export function referenceScenario(scenario: Scenario): Scenario {
  const shift = (2024 - (2001 + Math.floor(scenario.timeline.end / 12))) * 12;
  return createScenario({
    ...scenario,
    context: "Referência em 2024 · simulação, sem dados atuais",
    timeline: {
      ...scenario.timeline,
      start: scenario.timeline.start + shift,
      end: scenario.timeline.end + shift,
      frame: scenario.timeline.start + shift,
      playing: false,
    },
  });
}
