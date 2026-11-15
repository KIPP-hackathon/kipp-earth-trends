import {
  Droplets,
  Globe2,
  Leaf,
  Mountain,
  Snowflake,
  Wind,
} from "lucide-react";

const icons = {
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
