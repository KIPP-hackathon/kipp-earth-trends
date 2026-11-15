import type { EarthColorRange, EarthFrame } from "./earthApi";

export type LayerSetting = {
  variable: string;
  visible: boolean;
  /** Visual opacity from zero to one; never changes observations. */
  opacity: number;
};
export type MapLayer = {
  id: string;
  frame?: EarthFrame;
  visible: boolean;
  opacity: number;
  colorRange?: EarthColorRange;
};

/** Retain active precipitation views when the separate Late choices are retired. */
export function combinedImergLayers(settings: LayerSetting[]): LayerSetting[] {
  const aliases: Record<string,string> = {rainfall_late:"rainfall",rainfall_rate_late:"rainfall_rate"};
  const merged = new Map<string,LayerSetting>();
  for (const setting of settings) {
    const variable = aliases[setting.variable] ?? setting.variable;
    const old = merged.get(variable);
    merged.set(variable, old ? {...old, visible:old.visible || setting.visible,
      opacity:Math.max(old.opacity,setting.opacity)} : {...setting,variable});
  }
  return [...merged.values()];
}
