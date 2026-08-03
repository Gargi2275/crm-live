import * as THREE from "three";

export type HeroCity = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  hub?: boolean;
};

export type HeroRoute = {
  id: string;
  from: string;
  to: string;
  color?: string;
};

/** Key FlyOCI corridors: UK / US ↔ India and supporting hubs. */
export const HERO_CITIES: HeroCity[] = [
  { id: "london", name: "London", lat: 51.5, lon: -0.12, hub: true },
  { id: "manchester", name: "Manchester", lat: 53.48, lon: -2.24 },
  { id: "newyork", name: "New York", lat: 40.71, lon: -74.0, hub: true },
  { id: "sf", name: "San Francisco", lat: 37.77, lon: -122.42 },
  { id: "toronto", name: "Toronto", lat: 43.65, lon: -79.38 },
  { id: "delhi", name: "Delhi", lat: 28.61, lon: 77.21, hub: true },
  { id: "mumbai", name: "Mumbai", lat: 19.08, lon: 72.88, hub: true },
  { id: "bangalore", name: "Bengaluru", lat: 12.97, lon: 77.59 },
  { id: "dubai", name: "Dubai", lat: 25.2, lon: 55.27 },
  { id: "singapore", name: "Singapore", lat: 1.35, lon: 103.82 },
];

export const HERO_ROUTES: HeroRoute[] = [
  { id: "lon-del", from: "london", to: "delhi" },
  { id: "lon-bom", from: "london", to: "mumbai" },
  { id: "nyc-del", from: "newyork", to: "delhi" },
  { id: "nyc-bom", from: "newyork", to: "mumbai" },
  { id: "sf-blr", from: "sf", to: "bangalore" },
  { id: "tor-del", from: "toronto", to: "delhi" },
  { id: "man-bom", from: "manchester", to: "mumbai" },
  { id: "dxb-del", from: "dubai", to: "delhi" },
  { id: "sin-bom", from: "singapore", to: "mumbai" },
];

export const GLOBE_RADIUS = 1.65;

export function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export function cityById(id: string): HeroCity | undefined {
  return HERO_CITIES.find((c) => c.id === id);
}

/** Elevated great-circle-ish arc between two surface points. */
export function buildFlightCurve(
  from: HeroCity,
  to: HeroCity,
  radius = GLOBE_RADIUS,
  lift = 0.42,
): THREE.QuadraticBezierCurve3 {
  const start = latLonToVector3(from.lat, from.lon, radius);
  const end = latLonToVector3(to.lat, to.lon, radius);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const dist = start.distanceTo(end);
  mid.normalize().multiplyScalar(radius + lift + dist * 0.18);
  return new THREE.QuadraticBezierCurve3(start, mid, end);
}
