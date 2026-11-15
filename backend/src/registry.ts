import { consolidatedTableFor, additionalIndicators } from "./consolidated-sources.ts";
import { newMerraIndicators, sourceThemes } from "./additional-sources.ts";
// Reviewed against docs/inventario-api-databricks.csv and the producer schemas.
// This is an explicit whitelist: raw encodings, QA and uncertainty fields are not layers.
export type RenderMetadata = {
  kind: "continuous" | "categorical";
  domain: [number, number];
  colors: string[];
  factor: number;
  categories?: { value: number; label: string }[];
};
export type Variable = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  sourceUnit: string;
  product: string;
  run?: string;
  theme?: string;
  processingNote?: string;
  description: string;
  dataType?: "reanalysis" | "model-simulated satellite diagnostic" | "satellite_product";
  table: string;
  column: string;
  coverage?: string;
  nativeGrid: [number, number];
  aggregation: "area_weighted_mean" | "sum" | "weighted_mode";
  conversion: { scale: number; offset: number };
  quality: { rule: string; notes: string[] };
  render: RenderMetadata;
  // Bounds apply to the source value before conversion; null means unbounded.
  validRange?: [number | null, number | null];
  qa?: "modis_good" | "ice_valid";
};
const sequential = ["#0b2545", "#226b94", "#38a9ad", "#b5dca0", "#f5ef9c"];
const diverging = ["#273b91", "#4c9dce", "#e3eef2", "#ed9f69", "#a42d3c"];
const defaultQuality = {
  rule: "finite_source_value",
  notes: [
    "Missing values and numeric sentinels remain missing; aggregation is for display only.",
  ],
};
function continuous(
  input: Omit<
    Variable,
    "aggregation" | "conversion" | "quality" | "nativeGrid" | "render"
  > & {
    domain: [number, number];
    factor?: number;
    nativeGrid?: [number, number];
    aggregation?: Variable["aggregation"];
    conversion?: Variable["conversion"];
    quality?: Variable["quality"];
  },
): Variable {
  const { domain, factor, ...definition } = input;
  const quality = {
    rule: input.validRange
      ? `finite_source_value AND source_range[${input.validRange[0] ?? "unbounded"},${input.validRange[1] ?? "unbounded"}]`
      : defaultQuality.rule,
    notes: [
      ...defaultQuality.notes,
      ...(input.column.startsWith("Var_")
        ? [
            "The mean of native variances is neither pooled spatial variance nor propagated uncertainty.",
          ]
        : []),
      ...(input.column === "Var_DISPH"
        ? [
            "Small numerical negatives down to -1e-9 are preserved; negative values are not globally clipped.",
          ]
        : []),
    ],
  };
  return {
    aggregation: "area_weighted_mean",
    conversion: { scale: 1, offset: 0 },
    quality,
    nativeGrid: [0.625, 0.5],
    ...definition,
    render: {
      kind: "continuous",
      domain,
      colors: domain[0] < 0 ? diverging : sequential,
      factor: factor ?? 2,
    },
  };
}
// Pa→hPa and kg/kg→g/kg use scale² for variances; temperature variances have no offset.
const merraDefinitions = [
  {
    id: "merra2_cldprs",
    name: "Cloud-top pressure",
    quantity: "merra2_cldprs",
    unit: "hPa",
    sourceUnit: "Pa",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_cldprs",
    column: "CLDPRS",
    description: "Cloud-top pressure, in Pa.",
    conversion: {
      scale: 0.01,
      offset: 0,
    },
    domain: [0, 1100],
    validRange: [0, null],
  },
  {
    id: "merra2_cldtmp",
    name: "Cloud-top temperature",
    quantity: "merra2_cldtmp",
    unit: "degC",
    sourceUnit: "K",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_cldtmp",
    column: "CLDTMP",
    description: "Cloud-top temperature, in kelvin.",
    conversion: {
      scale: 1,
      offset: -273.15,
    },
    domain: [-85, 50],
    validRange: [0, null],
  },
  {
    id: "merra2_disph",
    name: "Zero-plane displacement height",
    quantity: "merra2_disph",
    unit: "m",
    sourceUnit: "m",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_disph",
    column: "DISPH",
    description: "Zero-plane displacement height, in meters.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [0, 23.0],
    validRange: undefined,
  },
  {
    id: "merra2_h1000",
    name: "Geopotential height at 1000 hPa",
    quantity: "merra2_h1000",
    unit: "m",
    sourceUnit: "m",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_h1000",
    column: "H1000",
    description:
      "Geopotential height of the pressure surface at 1000 hPa, in meters.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-170.0, 270.0],
    validRange: undefined,
  },
  {
    id: "merra2_h250",
    name: "Geopotential height at 250 hPa",
    quantity: "merra2_h250",
    unit: "m",
    sourceUnit: "m",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_h250",
    column: "H250",
    description:
      "Geopotential height of the pressure surface at 250 hPa, in meters.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [9500.0, 11000.0],
    validRange: undefined,
  },
  {
    id: "merra2_h500",
    name: "Geopotential height at 500 hPa",
    quantity: "merra2_h500",
    unit: "m",
    sourceUnit: "m",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_h500",
    column: "H500",
    description:
      "Geopotential height of the pressure surface at 500 hPa, in meters.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [5000.0, 5900.0],
    validRange: undefined,
  },
  {
    id: "merra2_h850",
    name: "Geopotential height at 850 hPa",
    quantity: "merra2_h850",
    unit: "m",
    sourceUnit: "m",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_h850",
    column: "H850",
    description:
      "Geopotential height of the pressure surface at 850 hPa, in meters.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [1100.0, 1600.0],
    validRange: undefined,
  },
  {
    id: "merra2_omega500",
    name: "Vertical velocity at 500 hPa",
    quantity: "merra2_omega500",
    unit: "Pa/s",
    sourceUnit: "Pa s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_omega500",
    column: "OMEGA500",
    description:
      "Pressure-coordinate vertical velocity at 500 hPa, in Pa/s.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-0.84, 0.64],
    validRange: undefined,
  },
  {
    id: "merra2_pbltop",
    name: "Boundary-layer top pressure",
    quantity: "merra2_pbltop",
    unit: "hPa",
    sourceUnit: "Pa",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_pbltop",
    column: "PBLTOP",
    description: "Planetary boundary-layer top pressure, in Pa.",
    conversion: {
      scale: 0.01,
      offset: 0,
    },
    domain: [0, 1100],
    validRange: [0, null],
  },
  {
    id: "merra2_ps",
    name: "Surface pressure",
    quantity: "merra2_ps",
    unit: "hPa",
    sourceUnit: "Pa",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_ps",
    column: "PS",
    description: "Surface atmospheric pressure, in Pa.",
    conversion: {
      scale: 0.01,
      offset: 0,
    },
    domain: [0, 1100],
    validRange: [0, null],
  },
  {
    id: "merra2_q250",
    name: "Specific humidity at 250 hPa",
    quantity: "merra2_q250",
    unit: "g/kg",
    sourceUnit: "kg kg-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_q250",
    column: "Q250",
    description: "Specific humidity at 250 hPa, in kg/kg.",
    conversion: {
      scale: 1000,
      offset: 0,
    },
    domain: [0, 1],
    validRange: [0, null],
  },
  {
    id: "merra2_q500",
    name: "Specific humidity at 500 hPa",
    quantity: "merra2_q500",
    unit: "g/kg",
    sourceUnit: "kg kg-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_q500",
    column: "Q500",
    description: "Specific humidity at 500 hPa, in kg/kg.",
    conversion: {
      scale: 1000,
      offset: 0,
    },
    domain: [0, 25],
    validRange: [0, null],
  },
  {
    id: "merra2_q850",
    name: "Specific humidity at 850 hPa",
    quantity: "merra2_q850",
    unit: "g/kg",
    sourceUnit: "kg kg-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_q850",
    column: "Q850",
    description: "Specific humidity at 850 hPa, in kg/kg.",
    conversion: {
      scale: 1000,
      offset: 0,
    },
    domain: [0, 25],
    validRange: [0, null],
  },
  {
    id: "merra2_qv10m",
    name: "Specific humidity at 10 m",
    quantity: "merra2_qv10m",
    unit: "g/kg",
    sourceUnit: "kg kg-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_qv10m",
    column: "QV10M",
    description:
      "Monthly QV10M (10-meter specific humidity), in units kg kg-1 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1000,
      offset: 0,
    },
    domain: [0, 25],
    validRange: [0, null],
  },
  {
    id: "merra2_qv2m",
    name: "Specific humidity at 2 m",
    quantity: "merra2_qv2m",
    unit: "g/kg",
    sourceUnit: "kg kg-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_qv2m",
    column: "QV2M",
    description:
      "Monthly QV2M (2-meter specific humidity), in units kg kg-1 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1000,
      offset: 0,
    },
    domain: [0, 25],
    validRange: [0, null],
  },
  {
    id: "merra2_slp",
    name: "Sea-level pressure",
    quantity: "merra2_slp",
    unit: "hPa",
    sourceUnit: "Pa",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_slp",
    column: "SLP",
    description:
      "Monthly SLP (sea level pressure), in units Pa as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 0.01,
      offset: 0,
    },
    domain: [0, 1100],
    validRange: [0, null],
  },
  {
    id: "temperature",
    name: "Air temperature at 10 m",
    quantity: "air_temperature_10m",
    unit: "degC",
    sourceUnit: "degree_Celsius",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_t10m",
    column: "T10M_C",
    description:
      "Air temperature at 10 m in degrees Celsius, converted from Kelvin by subtracting 273.15 in the exporter.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-85, 50],
    validRange: undefined,
  },
  {
    id: "merra2_t250",
    name: "Air temperature at 250 hPa",
    quantity: "merra2_t250",
    unit: "degC",
    sourceUnit: "K",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_t250",
    column: "T250",
    description:
      "Monthly T250 (air temperature at 250 hPa), in units K as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: -273.15,
    },
    domain: [-85, 50],
    validRange: [0, null],
  },
  {
    id: "merra2_t2m",
    name: "Air temperature at 2 m",
    quantity: "merra2_t2m",
    unit: "degC",
    sourceUnit: "K",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_t2m",
    column: "T2M",
    description:
      "Monthly T2M (2-meter air temperature), in units K as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: -273.15,
    },
    domain: [-85, 50],
    validRange: [0, null],
  },
  {
    id: "merra2_t2mdew",
    name: "Dew point at 2 m",
    quantity: "merra2_t2mdew",
    unit: "degC",
    sourceUnit: "K",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_t2mdew",
    column: "T2MDEW",
    description:
      "Monthly T2MDEW (dew point temperature at 2 m), in units K as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: -273.15,
    },
    domain: [-85, 50],
    validRange: [0, null],
  },
  {
    id: "merra2_t2mwet",
    name: "Wet-bulb temperature at 2 m",
    quantity: "merra2_t2mwet",
    unit: "degC",
    sourceUnit: "K",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_t2mwet",
    column: "T2MWET",
    description:
      "Monthly T2MWET (wet bulb temperature at 2 m), in units K as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: -273.15,
    },
    domain: [-85, 50],
    validRange: [0, null],
  },
  {
    id: "merra2_t500",
    name: "Air temperature at 500 hPa",
    quantity: "merra2_t500",
    unit: "degC",
    sourceUnit: "K",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_t500",
    column: "T500",
    description:
      "Monthly T500 (air temperature at 500 hPa), in units K as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: -273.15,
    },
    domain: [-85, 50],
    validRange: [0, null],
  },
  {
    id: "merra2_t850",
    name: "Air temperature at 850 hPa",
    quantity: "merra2_t850",
    unit: "degC",
    sourceUnit: "K",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_t850",
    column: "T850",
    description:
      "Monthly T850 (air temperature at 850 hPa), in units K as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: -273.15,
    },
    domain: [-85, 50],
    validRange: [0, null],
  },
  {
    id: "merra2_to3",
    name: "Total column ozone",
    quantity: "merra2_to3",
    unit: "DU",
    sourceUnit: "Dobsons",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_to3",
    column: "TO3",
    description:
      "Monthly TO3 (total column ozone), in units Dobsons as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [230.0, 480.0],
    validRange: [0, null],
  },
  {
    id: "merra2_tox",
    name: "Total column odd oxygen",
    quantity: "merra2_tox",
    unit: "kg m-2",
    sourceUnit: "kg m-2",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_tox",
    column: "TOX",
    description:
      "Monthly TOX (total column odd oxygen), in units kg m-2 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [0.0049, 0.01],
    validRange: [0, null],
  },
  {
    id: "merra2_tqi",
    name: "Total column ice water",
    quantity: "merra2_tqi",
    unit: "kg m-2",
    sourceUnit: "kg m-2",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_tqi",
    column: "TQI",
    description:
      "Monthly TQI (total precipitable ice water), in units kg m-2 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [2.4e-6, 0.18],
    validRange: [0, null],
  },
  {
    id: "merra2_tql",
    name: "Total column liquid water",
    quantity: "merra2_tql",
    unit: "kg m-2",
    sourceUnit: "kg m-2",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_tql",
    column: "TQL",
    description:
      "Monthly TQL (total precipitable liquid water), in units kg m-2 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [5.1e-5, 0.32],
    validRange: [0, null],
  },
  {
    id: "merra2_tqv",
    name: "Total column water vapor",
    quantity: "merra2_tqv",
    unit: "kg m-2",
    sourceUnit: "kg m-2",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_tqv",
    column: "TQV",
    description:
      "Monthly TQV (total precipitable water vapor), in units kg m-2 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [0.41, 66.0],
    validRange: [0, null],
  },
  {
    id: "merra2_troppb",
    name: "Tropopause pressure · blended",
    quantity: "merra2_troppb",
    unit: "hPa",
    sourceUnit: "Pa",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_troppb",
    column: "TROPPB",
    description:
      "Monthly TROPPB (tropopause pressure based on blended estimate), in units Pa as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 0.01,
      offset: 0,
    },
    domain: [0, 1100],
    validRange: [0, null],
  },
  {
    id: "merra2_troppt",
    name: "Tropopause pressure · thermal",
    quantity: "merra2_troppt",
    unit: "hPa",
    sourceUnit: "Pa",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_troppt",
    column: "TROPPT",
    description:
      "Monthly TROPPT (tropopause pressure based on thermal estimate), in units Pa as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 0.01,
      offset: 0,
    },
    domain: [0, 1100],
    validRange: [0, null],
  },
  {
    id: "merra2_troppv",
    name: "Tropopause pressure · vorticity",
    quantity: "merra2_troppv",
    unit: "hPa",
    sourceUnit: "Pa",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_troppv",
    column: "TROPPV",
    description:
      "Monthly TROPPV (tropopause pressure based on EPV estimate), in units Pa as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 0.01,
      offset: 0,
    },
    domain: [0, 1100],
    validRange: [0, null],
  },
  {
    id: "merra2_tropq",
    name: "Tropopause specific humidity",
    quantity: "merra2_tropq",
    unit: "g/kg",
    sourceUnit: "kg kg-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_tropq",
    column: "TROPQ",
    description:
      "Monthly TROPQ (tropopause specific humidity using blended TROPP estimate), in units kg kg-1 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1000,
      offset: 0,
    },
    domain: [0, 1],
    validRange: [0, null],
  },
  {
    id: "merra2_tropt",
    name: "Tropopause temperature",
    quantity: "merra2_tropt",
    unit: "degC",
    sourceUnit: "K",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_tropt",
    column: "TROPT",
    description:
      "Monthly TROPT (tropopause temperature using blended TROPP estimate), in units K as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: -273.15,
    },
    domain: [-85, 50],
    validRange: [0, null],
  },
  {
    id: "surface_temperature",
    name: "Surface temperature",
    quantity: "surface_temperature",
    unit: "degC",
    sourceUnit: "degree_Celsius",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_ts",
    column: "TS_C",
    description:
      "Surface skin temperature in degrees Celsius, derived as TS_K - 273.15.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-85, 50],
    validRange: undefined,
  },
  {
    id: "merra2_u10m",
    name: "Eastward wind at 10 m",
    quantity: "merra2_u10m",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_u10m",
    column: "U10M",
    description:
      "Monthly U10M (10-meter eastward wind), in units m s-1 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_u250",
    name: "Eastward wind at 250 hPa",
    quantity: "merra2_u250",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_u250",
    column: "U250",
    description:
      "Monthly U250 (eastward wind at 250 hPa), in units m s-1 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_u2m",
    name: "Eastward wind at 2 m",
    quantity: "merra2_u2m",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_u2m",
    column: "U2M",
    description:
      "Monthly U2M (2-meter eastward wind), in units m s-1 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_u500",
    name: "Eastward wind at 500 hPa",
    quantity: "merra2_u500",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_u500",
    column: "U500",
    description:
      "Monthly U500 (eastward wind at 500 hPa), in units m s-1 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_u50m",
    name: "Eastward wind at 50 m",
    quantity: "merra2_u50m",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_u50m",
    column: "U50M",
    description:
      "Monthly U50M (eastward wind at 50 meters), in units m s-1 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_u850",
    name: "Eastward wind at 850 hPa",
    quantity: "merra2_u850",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_u850",
    column: "U850",
    description:
      "Monthly U850 (eastward wind at 850 hPa), in units m s-1 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_v10m",
    name: "Northward wind at 10 m",
    quantity: "merra2_v10m",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_v10m",
    column: "V10M",
    description:
      "Monthly V10M (10-meter northward wind), in units m s-1 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_v250",
    name: "Northward wind at 250 hPa",
    quantity: "merra2_v250",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_v250",
    column: "V250",
    description:
      "Monthly V250 (northward wind at 250 hPa), in units m s-1 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_v2m",
    name: "Northward wind at 2 m",
    quantity: "merra2_v2m",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_v2m",
    column: "V2M",
    description:
      "Monthly V2M (2-meter northward wind), in units m s-1 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_v500",
    name: "Northward wind at 500 hPa",
    quantity: "merra2_v500",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_v500",
    column: "V500",
    description:
      "Monthly V500 (northward wind at 500 hPa), in units m s-1 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_v50m",
    name: "Northward wind at 50 m",
    quantity: "merra2_v50m",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_v50m",
    column: "V50M",
    description:
      "Monthly V50M (northward wind at 50 meters), in units m s-1 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_v850",
    name: "Northward wind at 850 hPa",
    quantity: "merra2_v850",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_v850",
    column: "V850",
    description:
      "Monthly V850 (northward wind at 850 hPa), in units m s-1 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_var_cldprs",
    name: "Variance · Cloud-top pressure",
    quantity: "merra2_var_cldprs",
    unit: "hPa²",
    sourceUnit: "Pa Pa",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_cldprs",
    column: "Var_CLDPRS",
    description:
      "Monthly Var_CLDPRS (Variance of CLDPRS), in units Pa Pa as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 0.0001,
      offset: 0,
    },
    domain: [0, 140000.0],
    validRange: [0, null],
  },
  {
    id: "merra2_var_cldtmp",
    name: "Variance · Cloud-top temperature",
    quantity: "merra2_var_cldtmp",
    unit: "degC²",
    sourceUnit: "K K",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_cldtmp",
    column: "Var_CLDTMP",
    description:
      "Monthly Var_CLDTMP (Variance of CLDTMP), in units K K as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [0, 1800.0],
    validRange: [0, null],
  },
  {
    id: "merra2_var_disph",
    name: "Variance · Zero-plane displacement height",
    quantity: "merra2_var_disph",
    unit: "m²",
    sourceUnit: "m m",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_disph",
    column: "Var_DISPH",
    description:
      "Monthly Var_DISPH (Variance of DISPH), in units m m as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-1e-9, 1],
    validRange: [-1e-9, null],
  },
  {
    id: "merra2_var_h1000",
    name: "Variance · Geopotential height at 1000 hPa",
    quantity: "merra2_var_h1000",
    unit: "m²",
    sourceUnit: "m m",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_h1000",
    column: "Var_H1000",
    description:
      "Monthly Var_H1000 (Variance of H1000), in units m m as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [0, 35000.0],
    validRange: [0, null],
  },
  {
    id: "merra2_var_h250",
    name: "Variance · Geopotential height at 250 hPa",
    quantity: "merra2_var_h250",
    unit: "m²",
    sourceUnit: "m m",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_h250",
    column: "Var_H250",
    description:
      "Monthly Var_H250 (Variance of H250), in units m m as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [0, 120000.0],
    validRange: [0, null],
  },
  {
    id: "merra2_var_h500",
    name: "Variance · Geopotential height at 500 hPa",
    quantity: "merra2_var_h500",
    unit: "m²",
    sourceUnit: "m m",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_h500",
    column: "Var_H500",
    description:
      "Monthly Var_H500 (Variance of H500), in units m m as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [0, 83000.0],
    validRange: [0, null],
  },
  {
    id: "merra2_var_h850",
    name: "Variance · Geopotential height at 850 hPa",
    quantity: "merra2_var_h850",
    unit: "m²",
    sourceUnit: "m m",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_h850",
    column: "Var_H850",
    description:
      "Monthly Var_H850 (Variance of H850), in units m m as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [0, 35000.0],
    validRange: [0, null],
  },
  {
    id: "merra2_var_omega500",
    name: "Variance · Vertical velocity at 500 hPa",
    quantity: "merra2_var_omega500",
    unit: "(Pa/s)²",
    sourceUnit: "Pa s-1 Pa s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_omega500",
    column: "Var_OMEGA500",
    description:
      "Monthly Var_OMEGA500 (Variance of OMEGA500), in units Pa s-1 Pa s-1 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [0, 1.2],
    validRange: [0, null],
  },
  {
    id: "merra2_var_pbltop",
    name: "Variance · Boundary-layer top pressure",
    quantity: "merra2_var_pbltop",
    unit: "hPa²",
    sourceUnit: "Pa Pa",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_pbltop",
    column: "Var_PBLTOP",
    description:
      "Monthly Var_PBLTOP (Variance of PBLTOP), in units Pa Pa as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 0.0001,
      offset: 0,
    },
    domain: [0, 19000.0],
    validRange: [0, null],
  },
  {
    id: "merra2_var_ps",
    name: "Variance · Surface pressure",
    quantity: "merra2_var_ps",
    unit: "hPa²",
    sourceUnit: "Pa Pa",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_ps",
    column: "Var_PS",
    description:
      "Monthly Var_PS (Variance of PS), in units Pa Pa as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 0.0001,
      offset: 0,
    },
    domain: [0, 550.0],
    validRange: [0, null],
  },
  {
    id: "merra2_var_q250",
    name: "Variance · Specific humidity at 250 hPa",
    quantity: "merra2_var_q250",
    unit: "(g/kg)²",
    sourceUnit: "kg kg-1 kg kg-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_q250",
    column: "Var_Q250",
    description:
      "Monthly Var_Q250 (Variance of Q250), in units kg kg-1 kg kg-1 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1000000,
      offset: 0,
    },
    domain: [0, 0.054],
    validRange: [0, null],
  },
  {
    id: "merra2_var_q500",
    name: "Variance · Specific humidity at 500 hPa",
    quantity: "merra2_var_q500",
    unit: "(g/kg)²",
    sourceUnit: "kg kg-1 kg kg-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_q500",
    column: "Var_Q500",
    description:
      "Monthly Var_Q500 (Variance of Q500), in units kg kg-1 kg kg-1 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1000000,
      offset: 0,
    },
    domain: [0, 6.3],
    validRange: [0, null],
  },
  {
    id: "merra2_var_q850",
    name: "Variance · Specific humidity at 850 hPa",
    quantity: "merra2_var_q850",
    unit: "(g/kg)²",
    sourceUnit: "kg kg-1 kg kg-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_q850",
    column: "Var_Q850",
    description:
      "Monthly Var_Q850 (Variance of Q850), in units kg kg-1 kg kg-1 as specified by the MERRA-2 file units attribute.",
    conversion: {
      scale: 1000000,
      offset: 0,
    },
    domain: [0, 22.0],
    validRange: [0, null],
  },
] satisfies Parameters<typeof continuous>[0][];
// All active observation queries use the seven consolidated trusted tables.
export const variables: Variable[] = merraDefinitions.map((definition) =>
  continuous({ ...definition, table: consolidatedTableFor[definition.table] }),
);
for (const [id, table, column, name, unit, collection] of [...additionalIndicators, ...newMerraIndicators]) {
  const diagnostic = column.startsWith("simulated_");
  const variance = column.endsWith("_variance");
  variables.push(continuous({
    id, table, column, name, quantity: id, unit, sourceUnit: unit,
    product: `MERRA-2 ${collection} 5.12.4${diagnostic ? " · COSP simulator diagnostic" : ""}`,
    dataType: diagnostic ? "model-simulated satellite diagnostic" : "reanalysis",
    description: `Monthly ${name.toLowerCase()}, in ${unit}. ${diagnostic
      ? "COSP satellite-simulator diagnostic driven by reanalysis; not a direct MODIS or ISCCP satellite observation."
      : "MERRA-2 reanalysis model field; not a direct measurement."}${variance
      ? " Native temporal variance, not pooled spatial variance, propagated uncertainty or a confidence interval." : ""}`,
    // Visual fallback only. Runtime p5–p95 comes from the exact physical indicator.
    domain: [0, 1],
    quality: { rule: "finite_source_value", notes: [
      "Missing values and numeric sentinels remain missing.",
      ...(diagnostic ? ["Model-simulated satellite diagnostic; not a direct satellite observation."] : []),
      ...(variance ? ["Spatial averaging of native variance is not propagated regional uncertainty."] : []),
    ] },
  }));
}
// One combined base per physical quantity. Per-month processing remains explicit.
for (const rate of [false, true]) {
  const id = rate ? "rainfall_rate" : "rainfall";
  const unit = rate ? "mm/h" : "mm";
  const processingNote = "IMERG combines Final and Late processing in one chronological series. Processing changes can affect comparisons and trends; this is not a homogenized climate record.";
  variables.push(continuous({
    id, run: "Final + Late", table: "tb_gpm_imerg_precipitation_final_late",
    column: rate ? "precipitation_rate_millimeters_per_hour" : "monthly_precipitation_millimeters",
    name: `Precipitation ${rate ? "rate" : "total"} · IMERG`,
    quantity: id, unit, sourceUnit: unit, dataType: "satellite_product",
    product: "GPM IMERG Final + Late V07", processingNote,
    description: `Monthly ${rate ? "mean precipitation rate" : "precipitation total"} from the consolidated IMERG Final + Late table. Each stored monthly value is used once; original processing is retained as monthly provenance. ${processingNote}`,
    coverage: "valid_area_fraction", validRange: [0, null], domain: rate ? [0, 1] : [0, 600],
    quality: { rule: "finite_nonnegative_precipitation AND positive_valid_area_fraction AND known_imerg_run",
      notes: ["Area-weighted regridding to the application grid; satellite precipitation estimate, not a rain gauge measurement.", processingNote] },
  }));
}
variables.push(continuous({
  id: "sea_ice_concentration", table: "tb_sea_ice_concentration_global", column: "sea_ice_concentration_percent",
  name: "Sea ice concentration · both poles", quantity: "sea_ice_concentration", unit: "%", sourceUnit: "%",
  product: "NSIDC Sea Ice Index G02135 v4", dataType: "satellite_product",
  description: "Monthly sea ice concentration; polar coverage only. Missing land, coast and pole-hole cells remain missing. This is not ice extent in km²; input sensors change in January 2025.",
  coverage: "valid_area_fraction", validRange: [0,100], domain: [0,100],
}));
for (const variable of variables) variable.theme = sourceThemes[variable.table];

export const excludedSources = [
  {
    id: "legacy_surface_temperature",
    table: "merra2_ts",
    reason:
      "Legacy table replaced by tb_merra2_ts; surface temperature is not duplicated.",
  },
  {
    id: "wind_speed",
    table: "tb_merra2_speed",
    reason:
      "The exporter incorrectly applied Kelvin/Celsius conversion to SPEED. The unit needs correction at the source; valid U/V components are available separately.",
  },
];
