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
  description: string;
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
    "Ausências e sentinelas numéricas permanecem ausentes; a agregação é apenas para visualização.",
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
            "A média das variâncias nativas não é variância espacial combinada nem incerteza propagada.",
          ]
        : []),
      ...(input.column === "Var_DISPH"
        ? [
            "Pequenos negativos numéricos até -1e-9 são preservados; não há corte global de valores negativos.",
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
    name: "Pressão no topo das nuvens",
    quantity: "merra2_cldprs",
    unit: "hPa",
    sourceUnit: "Pa",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_cldprs",
    column: "CLDPRS",
    description: "Pressão no topo das nuvens, em Pa.",
    conversion: {
      scale: 0.01,
      offset: 0,
    },
    domain: [0, 1100],
    validRange: [0, null],
  },
  {
    id: "merra2_cldtmp",
    name: "Temperatura no topo das nuvens",
    quantity: "merra2_cldtmp",
    unit: "degC",
    sourceUnit: "K",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_cldtmp",
    column: "CLDTMP",
    description: "Temperatura no topo das nuvens, em kelvin.",
    conversion: {
      scale: 1,
      offset: -273.15,
    },
    domain: [-85, 50],
    validRange: [0, null],
  },
  {
    id: "merra2_disph",
    name: "Altura de deslocamento do plano zero",
    quantity: "merra2_disph",
    unit: "m",
    sourceUnit: "m",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_disph",
    column: "DISPH",
    description: "Altura de deslocamento do plano zero, em metros.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [0, 23.0],
    validRange: undefined,
  },
  {
    id: "merra2_h1000",
    name: "Altura geopotencial a 1000 hPa",
    quantity: "merra2_h1000",
    unit: "m",
    sourceUnit: "m",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_h1000",
    column: "H1000",
    description:
      "Altura geopotencial da superfície de pressão de 1000 hPa, em metros.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-170.0, 270.0],
    validRange: undefined,
  },
  {
    id: "merra2_h250",
    name: "Altura geopotencial a 250 hPa",
    quantity: "merra2_h250",
    unit: "m",
    sourceUnit: "m",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_h250",
    column: "H250",
    description:
      "Altura geopotencial da superfície de pressão de 250 hPa, em metros.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [9500.0, 11000.0],
    validRange: undefined,
  },
  {
    id: "merra2_h500",
    name: "Altura geopotencial a 500 hPa",
    quantity: "merra2_h500",
    unit: "m",
    sourceUnit: "m",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_h500",
    column: "H500",
    description:
      "Altura geopotencial da superfície de pressão de 500 hPa, em metros.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [5000.0, 5900.0],
    validRange: undefined,
  },
  {
    id: "merra2_h850",
    name: "Altura geopotencial a 850 hPa",
    quantity: "merra2_h850",
    unit: "m",
    sourceUnit: "m",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_h850",
    column: "H850",
    description:
      "Altura geopotencial da superfície de pressão de 850 hPa, em metros.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [1100.0, 1600.0],
    validRange: undefined,
  },
  {
    id: "merra2_omega500",
    name: "Velocidade vertical a 500 hPa",
    quantity: "merra2_omega500",
    unit: "Pa/s",
    sourceUnit: "Pa s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_omega500",
    column: "OMEGA500",
    description:
      "Velocidade vertical em coordenada de pressão a 500 hPa, em Pa/s.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-0.84, 0.64],
    validRange: undefined,
  },
  {
    id: "merra2_pbltop",
    name: "Pressão no topo da camada limite",
    quantity: "merra2_pbltop",
    unit: "hPa",
    sourceUnit: "Pa",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_pbltop",
    column: "PBLTOP",
    description: "Pressão no topo da camada limite planetária, em Pa.",
    conversion: {
      scale: 0.01,
      offset: 0,
    },
    domain: [0, 1100],
    validRange: [0, null],
  },
  {
    id: "merra2_ps",
    name: "Pressão na superfície",
    quantity: "merra2_ps",
    unit: "hPa",
    sourceUnit: "Pa",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_ps",
    column: "PS",
    description: "Pressão atmosférica na superfície, em Pa.",
    conversion: {
      scale: 0.01,
      offset: 0,
    },
    domain: [0, 1100],
    validRange: [0, null],
  },
  {
    id: "merra2_q250",
    name: "Umidade específica a 250 hPa",
    quantity: "merra2_q250",
    unit: "g/kg",
    sourceUnit: "kg kg-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_q250",
    column: "Q250",
    description: "Umidade específica a 250 hPa, em kg/kg.",
    conversion: {
      scale: 1000,
      offset: 0,
    },
    domain: [0, 1],
    validRange: [0, null],
  },
  {
    id: "merra2_q500",
    name: "Umidade específica a 500 hPa",
    quantity: "merra2_q500",
    unit: "g/kg",
    sourceUnit: "kg kg-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_q500",
    column: "Q500",
    description: "Umidade específica a 500 hPa, em kg/kg.",
    conversion: {
      scale: 1000,
      offset: 0,
    },
    domain: [0, 25],
    validRange: [0, null],
  },
  {
    id: "merra2_q850",
    name: "Umidade específica a 850 hPa",
    quantity: "merra2_q850",
    unit: "g/kg",
    sourceUnit: "kg kg-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_q850",
    column: "Q850",
    description: "Umidade específica a 850 hPa, em kg/kg.",
    conversion: {
      scale: 1000,
      offset: 0,
    },
    domain: [0, 25],
    validRange: [0, null],
  },
  {
    id: "merra2_qv10m",
    name: "Umidade específica a 10 m",
    quantity: "merra2_qv10m",
    unit: "g/kg",
    sourceUnit: "kg kg-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_qv10m",
    column: "QV10M",
    description:
      "Média mensal de QV10M (10-meter specific humidity), na unidade kg kg-1 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1000,
      offset: 0,
    },
    domain: [0, 25],
    validRange: [0, null],
  },
  {
    id: "merra2_qv2m",
    name: "Umidade específica a 2 m",
    quantity: "merra2_qv2m",
    unit: "g/kg",
    sourceUnit: "kg kg-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_qv2m",
    column: "QV2M",
    description:
      "Média mensal de QV2M (2-meter specific humidity), na unidade kg kg-1 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1000,
      offset: 0,
    },
    domain: [0, 25],
    validRange: [0, null],
  },
  {
    id: "merra2_slp",
    name: "Pressão ao nível do mar",
    quantity: "merra2_slp",
    unit: "hPa",
    sourceUnit: "Pa",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_slp",
    column: "SLP",
    description:
      "Média mensal de SLP (sea level pressure), na unidade Pa indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 0.01,
      offset: 0,
    },
    domain: [0, 1100],
    validRange: [0, null],
  },
  {
    id: "temperature",
    name: "Temperatura do ar a 10 m",
    quantity: "air_temperature_10m",
    unit: "degC",
    sourceUnit: "degree_Celsius",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_t10m",
    column: "T10M_C",
    description:
      "Temperatura do ar a 10 m em graus Celsius, com conversão de Kelvin por subtração de 273,15 no exportador.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-85, 50],
    validRange: undefined,
  },
  {
    id: "merra2_t250",
    name: "Temperatura do ar a 250 hPa",
    quantity: "merra2_t250",
    unit: "degC",
    sourceUnit: "K",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_t250",
    column: "T250",
    description:
      "Média mensal de T250 (air temperature at 250 hPa), na unidade K indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: -273.15,
    },
    domain: [-85, 50],
    validRange: [0, null],
  },
  {
    id: "merra2_t2m",
    name: "Temperatura do ar a 2 m",
    quantity: "merra2_t2m",
    unit: "degC",
    sourceUnit: "K",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_t2m",
    column: "T2M",
    description:
      "Média mensal de T2M (2-meter air temperature), na unidade K indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: -273.15,
    },
    domain: [-85, 50],
    validRange: [0, null],
  },
  {
    id: "merra2_t2mdew",
    name: "Ponto de orvalho a 2 m",
    quantity: "merra2_t2mdew",
    unit: "degC",
    sourceUnit: "K",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_t2mdew",
    column: "T2MDEW",
    description:
      "Média mensal de T2MDEW (dew point temperature at 2 m), na unidade K indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: -273.15,
    },
    domain: [-85, 50],
    validRange: [0, null],
  },
  {
    id: "merra2_t2mwet",
    name: "Temperatura de bulbo úmido a 2 m",
    quantity: "merra2_t2mwet",
    unit: "degC",
    sourceUnit: "K",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_t2mwet",
    column: "T2MWET",
    description:
      "Média mensal de T2MWET (wet bulb temperature at 2 m), na unidade K indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: -273.15,
    },
    domain: [-85, 50],
    validRange: [0, null],
  },
  {
    id: "merra2_t500",
    name: "Temperatura do ar a 500 hPa",
    quantity: "merra2_t500",
    unit: "degC",
    sourceUnit: "K",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_t500",
    column: "T500",
    description:
      "Média mensal de T500 (air temperature at 500 hPa), na unidade K indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: -273.15,
    },
    domain: [-85, 50],
    validRange: [0, null],
  },
  {
    id: "merra2_t850",
    name: "Temperatura do ar a 850 hPa",
    quantity: "merra2_t850",
    unit: "degC",
    sourceUnit: "K",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_t850",
    column: "T850",
    description:
      "Média mensal de T850 (air temperature at 850 hPa), na unidade K indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: -273.15,
    },
    domain: [-85, 50],
    validRange: [0, null],
  },
  {
    id: "merra2_to3",
    name: "Ozônio na coluna total",
    quantity: "merra2_to3",
    unit: "DU",
    sourceUnit: "Dobsons",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_to3",
    column: "TO3",
    description:
      "Média mensal de TO3 (total column ozone), na unidade Dobsons indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [230.0, 480.0],
    validRange: [0, null],
  },
  {
    id: "merra2_tox",
    name: "Oxigênio ímpar na coluna total",
    quantity: "merra2_tox",
    unit: "kg m-2",
    sourceUnit: "kg m-2",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_tox",
    column: "TOX",
    description:
      "Média mensal de TOX (total column odd oxygen), na unidade kg m-2 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [0.0049, 0.01],
    validRange: [0, null],
  },
  {
    id: "merra2_tqi",
    name: "Água de gelo na coluna",
    quantity: "merra2_tqi",
    unit: "kg m-2",
    sourceUnit: "kg m-2",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_tqi",
    column: "TQI",
    description:
      "Média mensal de TQI (total precipitable ice water), na unidade kg m-2 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [2.4e-6, 0.18],
    validRange: [0, null],
  },
  {
    id: "merra2_tql",
    name: "Água líquida na coluna",
    quantity: "merra2_tql",
    unit: "kg m-2",
    sourceUnit: "kg m-2",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_tql",
    column: "TQL",
    description:
      "Média mensal de TQL (total precipitable liquid water), na unidade kg m-2 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [5.1e-5, 0.32],
    validRange: [0, null],
  },
  {
    id: "merra2_tqv",
    name: "Vapor de água na coluna",
    quantity: "merra2_tqv",
    unit: "kg m-2",
    sourceUnit: "kg m-2",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_tqv",
    column: "TQV",
    description:
      "Média mensal de TQV (total precipitable water vapor), na unidade kg m-2 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [0.41, 66.0],
    validRange: [0, null],
  },
  {
    id: "merra2_troppb",
    name: "Pressão da tropopausa · combinada",
    quantity: "merra2_troppb",
    unit: "hPa",
    sourceUnit: "Pa",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_troppb",
    column: "TROPPB",
    description:
      "Média mensal de TROPPB (tropopause pressure based on blended estimate), na unidade Pa indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 0.01,
      offset: 0,
    },
    domain: [0, 1100],
    validRange: [0, null],
  },
  {
    id: "merra2_troppt",
    name: "Pressão da tropopausa · térmica",
    quantity: "merra2_troppt",
    unit: "hPa",
    sourceUnit: "Pa",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_troppt",
    column: "TROPPT",
    description:
      "Média mensal de TROPPT (tropopause pressure based on thermal estimate), na unidade Pa indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 0.01,
      offset: 0,
    },
    domain: [0, 1100],
    validRange: [0, null],
  },
  {
    id: "merra2_troppv",
    name: "Pressão da tropopausa · vorticidade",
    quantity: "merra2_troppv",
    unit: "hPa",
    sourceUnit: "Pa",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_troppv",
    column: "TROPPV",
    description:
      "Média mensal de TROPPV (tropopause pressure based on EPV estimate), na unidade Pa indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 0.01,
      offset: 0,
    },
    domain: [0, 1100],
    validRange: [0, null],
  },
  {
    id: "merra2_tropq",
    name: "Umidade específica na tropopausa",
    quantity: "merra2_tropq",
    unit: "g/kg",
    sourceUnit: "kg kg-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_tropq",
    column: "TROPQ",
    description:
      "Média mensal de TROPQ (tropopause specific humidity using blended TROPP estimate), na unidade kg kg-1 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1000,
      offset: 0,
    },
    domain: [0, 1],
    validRange: [0, null],
  },
  {
    id: "merra2_tropt",
    name: "Temperatura da tropopausa",
    quantity: "merra2_tropt",
    unit: "degC",
    sourceUnit: "K",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_tropt",
    column: "TROPT",
    description:
      "Média mensal de TROPT (tropopause temperature using blended TROPP estimate), na unidade K indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: -273.15,
    },
    domain: [-85, 50],
    validRange: [0, null],
  },
  {
    id: "surface_temperature",
    name: "Temperatura de superfície",
    quantity: "surface_temperature",
    unit: "degC",
    sourceUnit: "degree_Celsius",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_ts",
    column: "TS_C",
    description:
      "Temperatura da pele da superfície em graus Celsius, derivada por TS_K - 273,15.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-85, 50],
    validRange: undefined,
  },
  {
    id: "merra2_u10m",
    name: "Vento zonal a 10 m",
    quantity: "merra2_u10m",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_u10m",
    column: "U10M",
    description:
      "Média mensal de U10M (10-meter eastward wind), na unidade m s-1 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_u250",
    name: "Vento zonal a 250 hPa",
    quantity: "merra2_u250",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_u250",
    column: "U250",
    description:
      "Média mensal de U250 (eastward wind at 250 hPa), na unidade m s-1 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_u2m",
    name: "Vento zonal a 2 m",
    quantity: "merra2_u2m",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_u2m",
    column: "U2M",
    description:
      "Média mensal de U2M (2-meter eastward wind), na unidade m s-1 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_u500",
    name: "Vento zonal a 500 hPa",
    quantity: "merra2_u500",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_u500",
    column: "U500",
    description:
      "Média mensal de U500 (eastward wind at 500 hPa), na unidade m s-1 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_u50m",
    name: "Vento zonal a 50 m",
    quantity: "merra2_u50m",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_u50m",
    column: "U50M",
    description:
      "Média mensal de U50M (eastward wind at 50 meters), na unidade m s-1 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_u850",
    name: "Vento zonal a 850 hPa",
    quantity: "merra2_u850",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_u850",
    column: "U850",
    description:
      "Média mensal de U850 (eastward wind at 850 hPa), na unidade m s-1 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_v10m",
    name: "Vento meridional a 10 m",
    quantity: "merra2_v10m",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_v10m",
    column: "V10M",
    description:
      "Média mensal de V10M (10-meter northward wind), na unidade m s-1 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_v250",
    name: "Vento meridional a 250 hPa",
    quantity: "merra2_v250",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_v250",
    column: "V250",
    description:
      "Variável mensal V250 (northward wind at 250 hPa), na unidade m s-1 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_v2m",
    name: "Vento meridional a 2 m",
    quantity: "merra2_v2m",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_v2m",
    column: "V2M",
    description:
      "Variável mensal V2M (2-meter northward wind), na unidade m s-1 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_v500",
    name: "Vento meridional a 500 hPa",
    quantity: "merra2_v500",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_v500",
    column: "V500",
    description:
      "Variável mensal V500 (northward wind at 500 hPa), na unidade m s-1 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_v50m",
    name: "Vento meridional a 50 m",
    quantity: "merra2_v50m",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_v50m",
    column: "V50M",
    description:
      "Variável mensal V50M (northward wind at 50 meters), na unidade m s-1 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_v850",
    name: "Vento meridional a 850 hPa",
    quantity: "merra2_v850",
    unit: "m/s",
    sourceUnit: "m s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_v850",
    column: "V850",
    description:
      "Variável mensal V850 (northward wind at 850 hPa), na unidade m s-1 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-50, 50],
    validRange: undefined,
  },
  {
    id: "merra2_var_cldprs",
    name: "Variância · Pressão no topo das nuvens",
    quantity: "merra2_var_cldprs",
    unit: "hPa²",
    sourceUnit: "Pa Pa",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_cldprs",
    column: "Var_CLDPRS",
    description:
      "Variável mensal Var_CLDPRS (Variance of CLDPRS), na unidade Pa Pa indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 0.0001,
      offset: 0,
    },
    domain: [0, 140000.0],
    validRange: [0, null],
  },
  {
    id: "merra2_var_cldtmp",
    name: "Variância · Temperatura no topo das nuvens",
    quantity: "merra2_var_cldtmp",
    unit: "degC²",
    sourceUnit: "K K",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_cldtmp",
    column: "Var_CLDTMP",
    description:
      "Variável mensal Var_CLDTMP (Variance of CLDTMP), na unidade K K indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [0, 1800.0],
    validRange: [0, null],
  },
  {
    id: "merra2_var_disph",
    name: "Variância · Altura de deslocamento do plano zero",
    quantity: "merra2_var_disph",
    unit: "m²",
    sourceUnit: "m m",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_disph",
    column: "Var_DISPH",
    description:
      "Variável mensal Var_DISPH (Variance of DISPH), na unidade m m indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [-1e-9, 1],
    validRange: [-1e-9, null],
  },
  {
    id: "merra2_var_h1000",
    name: "Variância · Altura geopotencial a 1000 hPa",
    quantity: "merra2_var_h1000",
    unit: "m²",
    sourceUnit: "m m",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_h1000",
    column: "Var_H1000",
    description:
      "Variável mensal Var_H1000 (Variance of H1000), na unidade m m indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [0, 35000.0],
    validRange: [0, null],
  },
  {
    id: "merra2_var_h250",
    name: "Variância · Altura geopotencial a 250 hPa",
    quantity: "merra2_var_h250",
    unit: "m²",
    sourceUnit: "m m",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_h250",
    column: "Var_H250",
    description:
      "Variável mensal Var_H250 (Variance of H250), na unidade m m indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [0, 120000.0],
    validRange: [0, null],
  },
  {
    id: "merra2_var_h500",
    name: "Variância · Altura geopotencial a 500 hPa",
    quantity: "merra2_var_h500",
    unit: "m²",
    sourceUnit: "m m",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_h500",
    column: "Var_H500",
    description:
      "Variável mensal Var_H500 (Variance of H500), na unidade m m indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [0, 83000.0],
    validRange: [0, null],
  },
  {
    id: "merra2_var_h850",
    name: "Variância · Altura geopotencial a 850 hPa",
    quantity: "merra2_var_h850",
    unit: "m²",
    sourceUnit: "m m",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_h850",
    column: "Var_H850",
    description:
      "Variável mensal Var_H850 (Variance of H850), na unidade m m indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [0, 35000.0],
    validRange: [0, null],
  },
  {
    id: "merra2_var_omega500",
    name: "Variância · Velocidade vertical a 500 hPa",
    quantity: "merra2_var_omega500",
    unit: "(Pa/s)²",
    sourceUnit: "Pa s-1 Pa s-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_omega500",
    column: "Var_OMEGA500",
    description:
      "Variável mensal Var_OMEGA500 (Variance of OMEGA500), na unidade Pa s-1 Pa s-1 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1,
      offset: 0,
    },
    domain: [0, 1.2],
    validRange: [0, null],
  },
  {
    id: "merra2_var_pbltop",
    name: "Variância · Pressão no topo da camada limite",
    quantity: "merra2_var_pbltop",
    unit: "hPa²",
    sourceUnit: "Pa Pa",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_pbltop",
    column: "Var_PBLTOP",
    description:
      "Variável mensal Var_PBLTOP (Variance of PBLTOP), na unidade Pa Pa indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 0.0001,
      offset: 0,
    },
    domain: [0, 19000.0],
    validRange: [0, null],
  },
  {
    id: "merra2_var_ps",
    name: "Variância · Pressão na superfície",
    quantity: "merra2_var_ps",
    unit: "hPa²",
    sourceUnit: "Pa Pa",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_ps",
    column: "Var_PS",
    description:
      "Variável mensal Var_PS (Variance of PS), na unidade Pa Pa indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 0.0001,
      offset: 0,
    },
    domain: [0, 550.0],
    validRange: [0, null],
  },
  {
    id: "merra2_var_q250",
    name: "Variância · Umidade específica a 250 hPa",
    quantity: "merra2_var_q250",
    unit: "(g/kg)²",
    sourceUnit: "kg kg-1 kg kg-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_q250",
    column: "Var_Q250",
    description:
      "Variável mensal Var_Q250 (Variance of Q250), na unidade kg kg-1 kg kg-1 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1000000,
      offset: 0,
    },
    domain: [0, 0.054],
    validRange: [0, null],
  },
  {
    id: "merra2_var_q500",
    name: "Variância · Umidade específica a 500 hPa",
    quantity: "merra2_var_q500",
    unit: "(g/kg)²",
    sourceUnit: "kg kg-1 kg kg-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_q500",
    column: "Var_Q500",
    description:
      "Variável mensal Var_Q500 (Variance of Q500), na unidade kg kg-1 kg kg-1 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1000000,
      offset: 0,
    },
    domain: [0, 6.3],
    validRange: [0, null],
  },
  {
    id: "merra2_var_q850",
    name: "Variância · Umidade específica a 850 hPa",
    quantity: "merra2_var_q850",
    unit: "(g/kg)²",
    sourceUnit: "kg kg-1 kg kg-1",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    table: "tb_merra2_var_q850",
    column: "Var_Q850",
    description:
      "Variável mensal Var_Q850 (Variance of Q850), na unidade kg kg-1 kg kg-1 indicada pelo atributo units do arquivo MERRA-2.",
    conversion: {
      scale: 1000000,
      offset: 0,
    },
    domain: [0, 22.0],
    validRange: [0, null],
  },
] satisfies Parameters<typeof continuous>[0][];
export const variables: Variable[] = merraDefinitions.map(continuous);
for (const run of ["Final", "Late"] as const) {
  const table =
    run === "Final"
      ? "tb_gpm_imerg_precipitation"
      : "tb_gpm_imerg_late_precipitation";
  for (const rate of [false, true])
    variables.push(
      continuous({
        id: `${run === "Final" ? "rainfall" : "rainfall_late"}${rate ? "_rate" : ""}`,
        name: `${rate ? "Taxa média de precipitação" : "Precipitação mensal"} · ${run}`,
        quantity: rate ? "precipitation_rate" : "monthly_precipitation",
        unit: rate ? "mm/h" : "mm/month",
        sourceUnit: rate ? "mm h-1" : "mm month-1",
        product: "GPM IMERG V07",
        run,
        table,
        column: rate ? "precipitation_mm_h" : "precipitation_mm_month",
        coverage: "valid_area_fraction",
        description:
          "Estimativa mensal de precipitação do produto NASA IMERG; Final e Late são processamentos distintos.",
        validRange: [0, null],
        domain: rate ? [0, 3] : [0, 1500],
        quality: {
          rule: "finite_nonnegative_with_valid_area_fraction",
          notes: [
            "Cobertura do exportador preservada; erros nativos auxiliares não são intervalos de confiança.",
          ],
        },
      }),
    );
}
variables.push(
  continuous({
    id: "liquid_precipitation_probability",
    name: "Probabilidade da fase líquida",
    quantity: "liquid_precipitation_probability",
    unit: "%",
    sourceUnit: "percent",
    product: "GPM IMERG V07",
    run: "Final",
    table: "tb_gpm_imerg_liquid_probability",
    column: "liquid_precipitation_probability_pct",
    coverage: "valid_area_fraction",
    description:
      "Probabilidade da fase líquida do IMERG Final, não probabilidade de chover nem fração de volume líquido.",
    validRange: [0, 100],
    domain: [0, 100],
  }),
);
for (const mass of [false, true])
  variables.push(
    continuous({
      id: mass ? "grace_mass_anomaly" : "grace_water_equivalent",
      name: mass
        ? "Anomalia de massa superficial total"
        : "Anomalia de massa · água equivalente",
      quantity: mass
        ? "total_surface_mass_anomaly"
        : "surface_mass_anomaly_water_equivalent",
      unit: mass ? "Gt" : "mm w.e.",
      sourceUnit: mass ? "Gt" : "mm water equivalent",
      product: "GRACE/GRACE-FO JPL CRI RL06.3Mv04",
      table: "tb_grace_jpl_mass_anomaly",
      column: mass ? "cell_mass_anomaly_gt" : "mass_anomaly_mm_we",
      coverage: "valid_area_fraction",
      description:
        "Anomalia em relação à média 2004–2009. Inclui água continental, gelo e oceano; não isola água subterrânea. Ganhos hidrológicos não aplicados.",
      aggregation: mass ? "sum" : "area_weighted_mean",
      domain: mass ? [-100, 100] : [-2000, 2000],
      quality: {
        rule: "finite_with_valid_area_fraction",
        notes: [
          "A massa em Gt é somada por célula/região, sem uma segunda ponderação por área.",
          "Incerteza nativa é auxiliar e não representa incerteza regional propagada.",
        ],
      },
    }),
  );
for (const index of ["ndvi", "evi"])
  variables.push(
    continuous({
      id: index,
      name: `${index.toUpperCase()} · vegetação`,
      quantity: `vegetation_${index}`,
      unit: "1",
      sourceUnit: "1",
      product: "MODIS Terra MOD13C2.061",
      table: "tb_modis_mod13c2_vegetation",
      column: index,
      description:
        "Índice mensal calibrado na grade geográfica nativa de 0,05°. Valores raw e QA não são camadas científicas separadas.",
      nativeGrid: [0.05, 0.05],
      factor: 32,
      validRange: [-0.2, 1],
      qa: "modis_good",
      domain: [-0.2, 1],
      quality: {
        rule: "range[-0.2,1] AND pixel_reliability=0 AND vi_quality<>65535",
        notes: [
          "Filtro conservador de pixels bons; não decodifica integralmente os bits de qualidade CMG 061.",
        ],
      },
    }),
  );
for (const pole of ["arctic", "antarctic"]) {
  const label = pole === "arctic" ? "Ártico" : "Antártida";
  const flag = continuous({
    id: `sea_ice_extent_${pole}`,
    name: `Classe de extensão de gelo · ${label}`,
    quantity: "sea_ice_extent_class",
    unit: "class",
    sourceUnit: "1",
    product: `NSIDC Sea Ice Index G02135 v4 · ${label}`,
    table: `tb_sea_ice_${pole}`,
    column: "sea_ice_extent_flag",
    description:
      "Classe mensal no ponto: 0 oceano aberto, 1 gelo (limiar nativo 15%). Não é uma medida regional de extensão em km².",
    qa: "ice_valid",
    validRange: [0, 1],
    domain: [0, 1],
    aggregation: "weighted_mode",
    quality: {
      rule: "valid_sample=1 AND class IN (0,1)",
      notes: [
        "Moda ponderada por área; empate escolhe oceano aberto. Nenhuma amostra válida resulta em ausência.",
      ],
    },
  });
  flag.render = {
    kind: "categorical",
    domain: [0, 1],
    colors: ["#143b64", "#dcf6ff"],
    factor: 2,
    categories: [
      { value: 0, label: "Oceano aberto" },
      { value: 1, label: "Gelo marinho ≥15%" },
    ],
  };
  variables.push(
    flag,
    continuous({
      id: `sea_ice_concentration_${pole}`,
      name: `Concentração de gelo marinho · ${label}`,
      quantity: "sea_ice_concentration",
      unit: "%",
      sourceUnit: "percent",
      product: `NSIDC Sea Ice Index G02135 v4 · ${label}`,
      table: `tb_sea_ice_concentration_${pole}`,
      column: "sea_ice_concentration_pct",
      coverage: "valid_area_fraction",
      description:
        "Concentração mensal contínua; remapeamento por quadratura aproximada. Terra/costa/pole hole são ausentes; limiar nativo 15% preservado.",
      validRange: [0, 100],
      domain: [0, 100],
    }),
  );
}
export const excludedSources = [
  {
    id: "legacy_surface_temperature",
    table: "merra2_ts",
    reason:
      "Tabela legada substituída por tb_merra2_ts; não duplicar a temperatura de superfície.",
  },
  {
    id: "wind_speed",
    table: "tb_merra2_speed",
    reason:
      "Exportador aplicou conversão Kelvin/Celsius indevida a SPEED. Unidade pendente de correção na origem; componentes U/V válidos estão disponíveis separadamente.",
  },
];
