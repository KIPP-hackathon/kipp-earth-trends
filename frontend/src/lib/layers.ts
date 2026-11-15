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
