function hue(id: string) {
  let hash = 0;
  for (const character of id)
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % 360;
}
export function comparisonColor(id: string) {
  return `hsl(${hue(id)} 78% 72%)`;
}
// Same hue as the chart line, a darker tone for the dashed trend line.
export function comparisonTrendColor(id: string) {
  return `hsl(${hue(id)} 78% 48%)`;
}
