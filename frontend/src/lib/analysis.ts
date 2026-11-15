export type Variable = "temperature" | "rainfall" | "vegetation";
export type RegionId = "saofrancisco" | "amazonia" | "pantanal";
export type Observation = { year: number; month: number; value: number };
export type AnnualValue = { year: number; value: number };

export const regions = [
  {
    id: "saofrancisco",
    name: "São Francisco basin",
    short: "São Francisco",
    subtitle: "One river, many possible futures.",
    biome: "Cerrado · Caatinga",
    location: [-44, -13] as [number, number],
    coords: "13° S, 44° W",
    description:
      "Water connects rainfall, heat and vegetation. Investigate all three signals in the São Francisco region.",
  },
  {
    id: "amazonia",
    name: "Central Amazon",
    short: "Amazon",
    subtitle: "The pulse of a living forest.",
    biome: "Tropical rainforest",
    location: [-62, -5] as [number, number],
    coords: "05° S, 62° W",
    description:
      "A forest has many rhythms. Compare long-term changes with its natural rainfall cycle.",
  },
  {
    id: "pantanal",
    name: "Pantanal",
    short: "Pantanal",
    subtitle: "Life follows the rhythm of water.",
    biome: "Floodplain",
    location: [-56, -18] as [number, number],
    coords: "18° S, 56° W",
    description:
      "The pulse of water transforms the landscape. Explore changes between cycles and across years.",
  },
] as const;

export const variables = {
  temperature: {
    name: "Air temperature",
    short: "Temperature",
    question: "Is it getting warmer?",
    unit: "°C",
    decadeUnit: "°C / decade",
    color: "#f4b080",
    source: "MERRA-2",
    product: "M2TMNXSLV",
    resolution: "0.5° × 0.625°",
    url: "https://gmao.gsfc.nasa.gov/gmao-products/merra-2/",
    definition:
      "Air temperature at two meters above the ground. It differs from ground temperature observed by a thermal sensor.",
    explanation:
      "A rising line represents warming. The band around it shows uncertainty in the estimate.",
    trendLabel: "warming",
    icon: "temperature",
  },
  rainfall: {
    name: "Precipitation",
    short: "Rainfall",
    question: "Has the rainfall pattern changed?",
    unit: "mm/month",
    decadeUnit: "mm/month / decade",
    color: "#8fc9dc",
    source: "GPM · IMERG",
    product: "GPM_3IMERGM V07",
    resolution: "0.1° × 0.1°",
    url: "https://gpm.nasa.gov/data/imerg",
    definition:
      "Rainfall over one month. One millimeter equals one liter of water per square meter.",
    explanation:
      "Rainfall varies greatly between years. A sloping line can still be consistent with no change.",
    trendLabel: "change in rainfall",
    icon: "rainfall",
  },
  vegetation: {
    name: "Vegetation vigor",
    short: "Vegetation",
    question: "How does vegetation respond?",
    unit: "EVI",
    decadeUnit: "EVI / decade",
    color: "#c5dfa2",
    source: "Terra · MODIS",
    product: "MOD13Q1.061",
    resolution: "250 m · 16 days",
    url: "https://cmr.earthdata.nasa.gov/search/concepts/C1748066515-LPCLOUD",
    definition:
      "EVI is a vegetation index derived from reflected light. It indicates vegetation activity and structure without directly measuring biodiversity.",
    explanation:
      "Vegetation responds to climate and land use. An association does not establish which factor caused a change.",
    trendLabel: "change in vegetation",
    icon: "vegetation",
  },
} as const;

/** Deterministic, invented educational observations. Never represents NASA measurements. */
export function makeSeries(
  region: RegionId,
  variable: Variable,
): Observation[] {
  const regionIndex = regions.findIndex((r) => r.id === region);
  return Array.from({ length: 24 * 12 }, (_, i) => {
    const yearIndex = Math.floor(i / 12);
    const month = (i % 12) + 1;
    const wave = Math.sin(((month - 2) * Math.PI) / 6);
    const annualNoise =
      Math.sin(yearIndex * 1.73 + regionIndex) * 0.16 +
      Math.cos(yearIndex * 2.71) * 0.11;
    const detail = Math.sin(i * 2.39) * 0.09;
    let value: number;
    if (variable === "temperature")
      value =
        25 +
        regionIndex * 0.8 +
        yearIndex * (0.034 + regionIndex * 0.005) +
        wave * 2.6 +
        annualNoise +
        detail;
    else if (variable === "rainfall")
      value =
        95 +
        regionIndex * 35 +
        wave * 65 -
        yearIndex * 0.24 +
        annualNoise * 105 +
        detail * 48;
    else
      value =
        0.59 +
        regionIndex * 0.055 -
        yearIndex * (0.0007 + regionIndex * 0.00015) +
        wave * 0.065 +
        annualNoise * 0.04 +
        detail * 0.025;
    return {
      year: 2001 + yearIndex,
      month,
      value: variable === "rainfall" ? Math.max(0, value) : value,
    };
  });
}

export function annualMeans(series: Observation[]): AnnualValue[] {
  const years = new Map<number, Observation[]>();
  for (const point of series)
    if (Number.isFinite(point.value))
      years.set(point.year, [...(years.get(point.year) ?? []), point]);
  return [...years.entries()]
    .filter(([, values]) => new Set(values.map((v) => v.month)).size === 12)
    .map(([year, values]) => ({
      year,
      value: values.reduce((sum, v) => sum + v.value, 0) / values.length,
    }));
}

export function anomalies(
  series: Observation[],
  reference: Observation[] = series,
): Observation[] {
  const monthMeans = Array.from({ length: 12 }, (_, i) => {
    const points = reference.filter((p) => p.month === i + 1);
    return points.length
      ? points.reduce((sum, p) => sum + p.value, 0) / points.length
      : 0;
  });
  return series.map((p) => ({
    ...p,
    value: p.value - monthMeans[p.month - 1],
  }));
}

// 97.5% Student-t critical values, df 1..30. Annual independent errors are an
// explicit simplifying assumption of this demonstration, not a validated pipeline.
const tCritical = [
  0, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228,
  2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08,
  2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042,
];

export function calculateTrend(points: AnnualValue[]) {
  const clean = points.filter(
    (p) => Number.isFinite(p.year) && Number.isFinite(p.value),
  );
  const n = clean.length;
  if (n < 3) return null;
  const meanX = clean.reduce((s, p) => s + p.year, 0) / n;
  const meanY = clean.reduce((s, p) => s + p.value, 0) / n;
  const ssX = clean.reduce((s, p) => s + (p.year - meanX) ** 2, 0);
  if (!ssX) return null;
  const slopePerYear =
    clean.reduce((s, p) => s + (p.year - meanX) * (p.value - meanY), 0) / ssX;
  const residuals = clean.reduce(
    (s, p) => s + (p.value - (meanY + slopePerYear * (p.year - meanX))) ** 2,
    0,
  );
  const variance = residuals / (n - 2);
  const se = Math.sqrt(variance / ssX);
  const critical = tCritical[Math.min(n - 2, 30)] ?? 1.96;
  const margin = se * critical;
  const interval: [number, number] = [
    (slopePerYear - margin) * 10,
    (slopePerYear + margin) * 10,
  ];
  const predict = (year: number) => meanY + slopePerYear * (year - meanX);
  const confidenceAt = (year: number): [number, number] => {
    const uncertainty =
      critical * Math.sqrt(variance * (1 / n + (year - meanX) ** 2 / ssX));
    return [predict(year) - uncertainty, predict(year) + uncertainty];
  };
  return {
    slope: slopePerYear * 10,
    interval,
    significant: interval[0] > 0 || interval[1] < 0,
    n,
    mean: meanY,
    predict,
    confidenceAt,
  };
}

export function formatValue(value: number, variable: Variable, signed = false) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: variable === "vegetation" ? 3 : 2,
    maximumFractionDigits: variable === "vegetation" ? 3 : 2,
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(value);
}

export function toCsv(
  series: Observation[],
  variable: Variable,
  region: RegionId,
) {
  return (
    `# SIMULATED DATA — educational prototype; not NASA measurements\n# region=${region}; variable=${variable}; unit=${variable === "rainfall" ? "mm/month" : variables[variable].unit}\ndate,value\n` +
    series
      .map(
        (p) =>
          `${p.year}-${String(p.month).padStart(2, "0")},${p.value.toFixed(6)}`,
      )
      .join("\n")
  );
}
