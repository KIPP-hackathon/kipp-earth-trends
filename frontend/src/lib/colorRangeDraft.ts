import { validColorDomain } from "./earthApi";
import type { EarthColorRange } from "./earthApi";

export function colorRangeDraft(
  minimum: string,
  maximum: string,
  hideOutside: boolean,
): EarthColorRange | undefined {
  if (!minimum.trim() || !maximum.trim()) return undefined;
  const domain: [number, number] = [Number(minimum), Number(maximum)];
  return validColorDomain(domain) ? { domain, hideOutside } : undefined;
}
