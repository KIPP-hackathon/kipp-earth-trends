import {
  Droplets, Thermometer, Gauge, Cloud, Sun, Activity, CloudFog, FlaskConical, CloudRain,
  Globe2,
  Leaf,
  Mountain,
  Snowflake,
  Wind,
} from "lucide-react";

const icons = {
  temperature: Thermometer, wind: Wind, humidity: Droplets, pressure: Gauge,
  cloud: Cloud, flux: Sun, variance: Activity, aerosol: CloudFog,
  chemistry: FlaskConical, precipitation: CloudRain, sea_ice: Snowflake,
  atmosphere: Wind,
  hydrosphere: Droplets,
  cryosphere: Snowflake,
  biosphere: Leaf,
  geosphere: Mountain,
};

export function DomainIcon({
  domain,
  size = 11,
}: {
  domain?: string;
  size?: number;
}) {
  const Icon = domain ? icons[domain as keyof typeof icons] ?? Globe2 : Globe2;
  return <Icon size={size} aria-hidden="true" />;
}
