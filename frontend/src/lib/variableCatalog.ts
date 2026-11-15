import type { EarthRegion, EarthVariable } from "./earthApi";

export type CatalogTopic = "water" | "heat" | "air" | "ice";
import { catalogSources } from "./ecosystems";
import type { EcosystemId } from "./ecosystems";
export { catalogSources, catalogEcosystems } from "./ecosystems";
export type { EcosystemId } from "./ecosystems";

export type CatalogProfile = {
  id: string;
  title: string;
  topic: CatalogTopic;
  summary: string;
  role: string;
  interpretation: string;
  caution: string;
  question: string;
  aliases: string;
  ecosystems: EcosystemId[];
  related: { id: string; relationship: string }[];
};
export const catalogTopics: { id: CatalogTopic; label: string }[] = [
  { id: "water", label: "Water cycle" },
  { id: "heat", label: "Heat & energy" },
  { id: "air", label: "Atmosphere" },
  { id: "ice", label: "Ice & oceans" },
];

export const catalogProfiles: CatalogProfile[] = [
  {
    id: "rainfall",
    title: "Precipitation",
    topic: "water",
    summary:
      "Water arriving from the atmosphere, expressed as a depth accumulated over a month.",
    role: "Rain supplies water to soils, rivers and vegetation. Its timing matters as much as the total: ecosystems have seasonal water needs.",
    interpretation:
      "More rain in a month can mean greater water input. A drier month is meaningful relative to that place’s usual season and a stated reference period.",
    caution:
      "A monthly total can hide long dry spells and intense short storms. The catalog combines IMERG Final and Late processing; inspect provenance before interpreting trends.",
    question:
      "Is the seasonal pattern of precipitation changing in this region?",
    aliases:
      "chuva precipitacao precipitação rainfall rain water drought seca flood enchente",
    ecosystems: [
      "amazon",
      "sahara",
      "ocean",
      "boreal",
      "coral",
      "himalaya",
      "pantanal",
      "congo",
    ],
    related: [
      {
        id: "merra2_flx_evap",
        relationship:
          "Rain adds water; evaporation returns water to the atmosphere. Their units need conversion before subtraction.",
      },
      {
        id: "temperature",
        relationship:
          "Temperature provides thermal context for water demand; simultaneous changes do not establish causality.",
      },
    ],
  },
  {
    id: "temperature",
    title: "Air temperature · 10 m",
    topic: "heat",
    summary:
      "How warm the air is at 10 meters above the surface, averaged over a month.",
    role: "Thermal conditions influence biological activity, water exchange and the seasonal freezing and melting environment.",
    interpretation:
      "A higher value means warmer air at this level. Compare the same season and location before interpreting a long-term change.",
    caution:
      "This is air at 10 m, not surface skin temperature or the standard 2 m field. Monthly means do not measure daily heat extremes.",
    question:
      "How quickly has monthly air temperature changed here, and how uncertain is that estimate?",
    aliases: "temperatura calor aquecimento heat warming air",
    ecosystems: [
      "amazon",
      "sahara",
      "ocean",
      "polar",
      "antarctic",
      "boreal",
      "coral",
      "himalaya",
      "pantanal",
      "congo",
    ],
    related: [
      {
        id: "merra2_qv2m",
        relationship:
          "Temperature and moisture describe different parts of the near-surface environment; their measurement heights differ.",
      },
      {
        id: "sea_ice_concentration",
        relationship:
          "Air temperature provides seasonal context for ice. It is not a complete measure of the ocean’s energy balance.",
      },
    ],
  },
  {
    id: "merra2_flx_evap",
    title: "Evaporation",
    topic: "water",
    summary:
      "A modeled flux of water from the surface to the atmosphere, per area and per second.",
    role: "Surface water exchange connects land and ocean to atmospheric moisture. Over vegetation, modeled surface evaporation can include water released through plants.",
    interpretation:
      "Read the product’s flux convention. Changes reflect available water, energy and atmospheric conditions together, rather than a single cause.",
    caution:
      "The flux unit kg m⁻² s⁻¹ is not a monthly depth in mm. Integrating in time requires the actual month duration. This field alone does not isolate plant transpiration.",
    question:
      "Does surface evaporation follow the same seasonal rhythm as precipitation?",
    aliases:
      "evaporacao evaporação evapotranspiracao evapotranspiração water recycling",
    ecosystems: [
      "amazon",
      "sahara",
      "ocean",
      "boreal",
      "coral",
      "himalaya",
      "pantanal",
      "congo",
    ],
    related: [
      {
        id: "rainfall",
        relationship:
          "These describe different directions of water exchange. A difference would be a partial balance, not total water storage.",
      },
      {
        id: "merra2_flx_eflux",
        relationship:
          "Latent energy accompanies water phase changes; energy flux and water flux have different units.",
      },
    ],
  },
  {
    id: "merra2_qv2m",
    title: "Specific humidity · 2 m",
    topic: "water",
    summary:
      "The mass of water vapor per mass of moist air, close to the surface.",
    role: "Atmospheric water vapor connects evaporation, moisture transport and the conditions from which clouds and precipitation can develop.",
    interpretation:
      "A larger value means more water vapor per mass of air. It is not a percentage and does not say how close air is to saturation.",
    caution:
      "Specific humidity is different from relative humidity. The displayed g/kg unit may differ from the producer’s original kg/kg encoding.",
    question:
      "How does near-surface moisture vary between wetter and drier months?",
    aliases: "umidade humidade humidity moisture vapor agua água",
    ecosystems: [
      "amazon",
      "sahara",
      "ocean",
      "boreal",
      "coral",
      "himalaya",
      "pantanal",
      "congo",
    ],
    related: [
      {
        id: "merra2_flx_evap",
        relationship:
          "Evaporation supplies vapor, while transport and condensation also affect local humidity.",
      },
      {
        id: "merra2_u10m",
        relationship:
          "Winds transport moisture; a single component at a different height does not quantify total moisture transport.",
      },
    ],
  },
  {
    id: "merra2_u10m",
    title: "Eastward wind · 10 m",
    topic: "air",
    summary:
      "The east–west component of near-surface wind. Positive values point eastward.",
    role: "Wind moves heat, moisture and airborne particles. Its direction helps connect distant regions through atmospheric transport.",
    interpretation:
      "A more positive value means a stronger eastward component; a negative value means westward flow. Zero does not mean calm air.",
    caution:
      "A component is not total wind speed. Monthly mean components can cancel changing directions and do not capture storm gusts.",
    question:
      "How does the prevailing east–west airflow change through the year?",
    aliases: "vento ventos wind circulation transporte transport",
    ecosystems: [
      "amazon",
      "sahara",
      "ocean",
      "polar",
      "antarctic",
      "boreal",
      "coral",
      "himalaya",
      "pantanal",
      "congo",
    ],
    related: [
      {
        id: "merra2_v10m",
        relationship:
          "Together, eastward and northward components describe a horizontal wind vector at the same level.",
      },
      {
        id: "merra2_aer_duexttau",
        relationship:
          "Winds can transport dust. These monthly fields alone do not reconstruct trajectories or prove source attribution.",
      },
    ],
  },
  {
    id: "merra2_v10m",
    title: "Northward wind · 10 m",
    topic: "air",
    summary:
      "The north–south component of near-surface wind. Positive values point northward.",
    role: "Meridional airflow contributes to the movement of air masses, moisture and energy between latitudes.",
    interpretation:
      "Positive is northward, negative is southward. Interpret it alongside the eastward component and the season.",
    caution:
      "The magnitude of a monthly mean vector is not the monthly mean of instantaneous wind speed. Regional averaging can hide local circulation.",
    question:
      "Do the two wind components reveal a seasonal shift in circulation?",
    aliases: "vento norte sul north south circulation",
    ecosystems: [
      "amazon",
      "sahara",
      "ocean",
      "polar",
      "antarctic",
      "boreal",
      "coral",
      "himalaya",
      "pantanal",
      "congo",
    ],
    related: [
      {
        id: "merra2_u10m",
        relationship:
          "Both components are needed to describe the horizontal flow; neither component alone measures total speed.",
      },
    ],
  },
  {
    id: "merra2_aer_duexttau",
    title: "Dust optical depth",
    topic: "air",
    summary:
      "How strongly mineral dust in the atmospheric column attenuates light at 550 nanometers.",
    role: "Dust interacts with radiation and can transport minerals between continents. NASA research documents African dust carrying phosphorus toward the Amazon.",
    interpretation:
      "Higher optical depth means stronger light extinction attributed to dust in this modeled column, not necessarily more dust at breathing height.",
    caution:
      "Optical depth is dimensionless. It does not measure deposition, phosphorus content or vegetation response. The nutrient connection is published context, not a finding calculated by this app.",
    question:
      "Does the seasonal dust pattern coincide with changes in regional winds?",
    aliases:
      "poeira areia dust aerosol aerossol sahara saara nutrients nutrientes",
    ecosystems: ["sahara", "amazon", "ocean"],
    related: [
      {
        id: "merra2_u10m",
        relationship:
          "Airflow provides transport context, but monthly near-surface winds cannot identify the full dust pathway.",
      },
      {
        id: "merra2_aer_dusmass",
        relationship:
          "Surface mass concentration measures a different vertical part of the dust distribution.",
      },
    ],
  },
  {
    id: "merra2_aer_dusmass",
    title: "Dust near the surface",
    topic: "air",
    summary: "Modeled mineral-dust mass per volume of air near the surface.",
    role: "A surface concentration adds local atmospheric context to the larger picture of dust transport and exchange.",
    interpretation:
      "Larger values mean more modeled dust mass per volume. They are distinct from the total column’s optical properties.",
    caution:
      "This is a monthly reanalysis estimate, not a local air-quality sensor or a health advisory. No exposure thresholds are assigned here.",
    question:
      "Do near-surface dust and column dust show similar seasonal patterns?",
    aliases: "poeira dust aerosol concentration concentracao concentração",
    ecosystems: ["sahara", "ocean"],
    related: [
      {
        id: "merra2_aer_duexttau",
        relationship:
          "The column can contain elevated dust even when the near-surface concentration is lower.",
      },
    ],
  },
  {
    id: "merra2_flx_eflux",
    title: "Latent energy flux",
    topic: "heat",
    summary:
      "Modeled energy exchange associated with water changing phase at the surface.",
    role: "Evaporation links water and energy cycles: moving water into vapor also involves energy exchange.",
    interpretation:
      "Read the producer’s sign convention and compare the same season. Energy flux and air temperature describe different physical quantities.",
    caution:
      "Measured in watts per square meter, not degrees. A monthly mean flux is not accumulated energy or a direct measure of ecosystem health.",
    question:
      "How does the seasonal exchange of latent energy accompany water exchange?",
    aliases: "energia calor latente energy latent heat",
    ecosystems: [
      "amazon",
      "sahara",
      "ocean",
      "boreal",
      "coral",
      "himalaya",
      "pantanal",
      "congo",
    ],
    related: [
      {
        id: "merra2_flx_evap",
        relationship:
          "Water phase changes connect these fluxes; conversion requires the appropriate latent heat and flux conventions.",
      },
      {
        id: "merra2_flx_hflux",
        relationship:
          "Latent and sensible heat are distinct components, not the entire surface energy balance.",
      },
    ],
  },
  {
    id: "merra2_flx_hflux",
    title: "Sensible heat flux",
    topic: "heat",
    summary:
      "Modeled turbulent heat exchange between the surface and the air, without a water phase change.",
    role: "Surface heating and turbulent exchange help shape the thermal environment above forests, deserts and oceans.",
    interpretation:
      "Interpret magnitude and direction using the source convention. A different heat flux does not necessarily imply a proportional temperature change.",
    caution:
      "Radiation, storage and latent heat also matter. This variable alone cannot close an energy budget or explain a temperature trend.",
    question:
      "How do sensible and latent energy exchanges differ between seasons?",
    aliases: "calor sensivel sensível heat energy energia",
    ecosystems: [
      "amazon",
      "sahara",
      "ocean",
      "polar",
      "antarctic",
      "boreal",
      "coral",
      "himalaya",
      "pantanal",
      "congo",
    ],
    related: [
      {
        id: "merra2_flx_eflux",
        relationship:
          "Comparing these components describes how turbulent energy exchange is partitioned.",
      },
      {
        id: "temperature",
        relationship:
          "The near-surface thermal state and turbulent exchange are related but are not interchangeable measurements.",
      },
    ],
  },
  {
    id: "merra2_slp",
    title: "Sea-level pressure",
    topic: "air",
    summary:
      "Atmospheric pressure adjusted to sea level, making broad weather patterns easier to compare.",
    role: "Pressure patterns provide context for atmospheric circulation and the movement of air masses.",
    interpretation:
      "Study spatial pressure patterns alongside winds. One regional monthly mean does not describe the pressure gradient.",
    caution:
      "Monthly pressure cannot detect individual storms. Sea-level pressure is different from the actual pressure at a high-elevation surface.",
    question:
      "How do monthly pressure and wind patterns vary over the Atlantic?",
    aliases: "pressao pressão pressure circulation circulacao circulação",
    ecosystems: ["sahara", "ocean", "polar", "antarctic", "coral"],
    related: [
      {
        id: "merra2_u10m",
        relationship:
          "Pressure gradients contribute to airflow, with rotation, friction and other forces also affecting winds.",
      },
    ],
  },
  {
    id: "sea_ice_concentration",
    title: "Sea ice concentration",
    topic: "ice",
    summary: "The percentage of a valid ocean grid cell covered by sea ice.",
    role: "Sea ice is part of polar habitat and the seasonal exchange of energy between ocean and atmosphere.",
    interpretation:
      "A lower concentration means less of a valid cell is ice-covered. Examine the annual freeze–melt cycle before interpreting a trend.",
    caution:
      "Concentration is not ice extent, thickness or volume. Land, coast and pole-hole cells can be missing. This variable has polar coverage only.",
    question:
      "Is the seasonal cycle of ice concentration changing in the selected polar window?",
    aliases:
      "gelo sea ice ocean oceano arctic artico ártico antarctic antartida antártida polar cryosphere criosfera",
    ecosystems: ["polar", "antarctic"],
    related: [
      {
        id: "temperature",
        relationship:
          "Air temperature offers thermal context, but ocean heat, winds and other factors also influence ice.",
      },
    ],
  },
];

const profilesById = new Map(
  catalogProfiles.map((profile) => [profile.id, profile]),
);
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export const validCatalogMonths = (variable: EarthVariable) =>
  variable.available === false
    ? []
    : [
        ...new Set(
          variable.months
            .filter(
              (row) =>
                row.validSamples > 0 &&
                /^\d{4}-(0[1-9]|1[0-2])$/.test(row.month),
            )
            .map((row) => row.month),
        ),
      ].sort();
export function catalogKind(variable: EarthVariable) {
  if (/COSP|simulator/i.test(variable.product)) return "Simulator diagnostic";
  if (/MERRA-2/i.test(variable.product)) return "Reanalysis";
  if (/IMERG|Sea Ice Index|MODIS/i.test(variable.product))
    return "Satellite estimate";
  return "Check source method";
}
export const catalogSource = (variable: EarthVariable) =>
  /IMERG/i.test(variable.product)
    ? catalogSources.rain
    : /Sea Ice Index/i.test(variable.product)
      ? catalogSources.ice
      : /MERRA-2/i.test(variable.product)
        ? catalogSources.merra
        : undefined;
export type CatalogEntry = {
  variable: EarthVariable;
  profile?: CatalogProfile;
  months: string[];
  search: string;
};
export function buildCatalogIndex(variables: EarthVariable[]): CatalogEntry[] {
  return variables.map((variable) => {
    const profile = profilesById.get(variable.id);
    return {
      variable,
      profile,
      months: validCatalogMonths(variable),
      search: normalize(
        `${variable.id} ${variable.name} ${variable.product} ${variable.unit} ${variable.description ?? ""} ${profile ? `${profile.title} ${profile.summary} ${profile.aliases}` : ""}`,
      ),
    };
  });
}
export function filterCatalog(
  entries: CatalogEntry[],
  filters: {
    query?: string;
    topic?: CatalogTopic | "all";
    ecosystem?: EcosystemId | "all";
    full?: boolean;
    availableOnly?: boolean;
  },
) {
  const terms = normalize(filters.query?.trim() ?? "")
    .split(/\s+/)
    .filter(Boolean);
  return entries
    .filter(
      (entry) =>
        (filters.full || entry.profile) &&
        (!filters.availableOnly || entry.months.length > 0) &&
        (!filters.topic ||
          filters.topic === "all" ||
          entry.profile?.topic === filters.topic) &&
        (!filters.ecosystem ||
          filters.ecosystem === "all" ||
          entry.profile?.ecosystems.includes(filters.ecosystem)) &&
        terms.every((term) => entry.search.includes(term)),
    )
    .sort((a, b) => {
      const ai = catalogProfiles.findIndex(
        (profile) => profile.id === a.variable.id,
      );
      const bi = catalogProfiles.findIndex(
        (profile) => profile.id === b.variable.id,
      );
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });
}
export type CatalogInvestigation = {
  variables: string[];
  start: string;
  end: string;
  commonMonths: number;
  region?: EarthRegion;
};
export function planCatalogInvestigation(
  variables: EarthVariable[],
  selected: string[],
): CatalogInvestigation | null {
  const ids = [...new Set(selected)];
  if (!ids.length || ids.length > 6) return null;
  const byId = new Map(variables.map((variable) => [variable.id, variable]));
  const monthSets = ids.map((id) =>
    byId.has(id)
      ? new Set(validCatalogMonths(byId.get(id)!))
      : new Set<string>(),
  );
  const common = [...monthSets[0]]
    .filter((month) => monthSets.every((months) => months.has(month)))
    .sort();
  return common.length
    ? {
        variables: ids,
        start: common[0],
        end: common.at(-1)!,
        commonMonths: common.length,
      }
    : null;
}
