"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line, OrbitControls, Stars } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  buildFlightCurve,
  cityById,
  GLOBE_RADIUS,
  HERO_CITIES,
  HERO_ROUTES,
  latLonToVector3,
  type HeroCity,
  type HeroRoute,
} from "@/components/hero/worldData";

const BRAND = {
  primary: "#33A1FD",
  accent: "#0F7EE8",
  dark: "#0D1F2D",
  soft: "#9fd0ff",
  land: "#1a3a52",
  ocean: "#0a1c2e",
};

function Atmosphere() {
  return (
    <mesh scale={1.08}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <meshBasicMaterial
        color={BRAND.primary}
        transparent
        opacity={0.07}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function GlobeCore() {
  const landDots = useMemo(() => {
    const positions: number[] = [];
    // Stylized “land” scatter — denser near temperate belts, not a real GIS map.
    for (let i = 0; i < 1400; i++) {
      const lat = (Math.random() * 140 - 70) * (0.55 + Math.random() * 0.45);
      const lon = Math.random() * 360 - 180;
      // Bias away from pure ocean bands a bit by skipping some longitudes.
      if (Math.abs(lat) < 8 && Math.random() > 0.35) continue;
      const v = latLonToVector3(lat, lon, GLOBE_RADIUS + 0.004);
      positions.push(v.x, v.y, v.z);
    }
    return new Float32Array(positions);
  }, []);

  return (
    <group>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 72, 72]} />
        <meshStandardMaterial
          color={BRAND.ocean}
          roughness={0.55}
          metalness={0.35}
          emissive={BRAND.dark}
          emissiveIntensity={0.35}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.002, 48, 48]} />
        <meshBasicMaterial
          color={BRAND.primary}
          wireframe
          transparent
          opacity={0.06}
        />
      </mesh>

      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[landDots, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={BRAND.land}
          size={0.018}
          sizeAttenuation
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </points>

      <Atmosphere />
    </group>
  );
}

function CityMarker({
  city,
  active,
  onHover,
}: {
  city: HeroCity;
  active: boolean;
  onHover: (id: string | null) => void;
}) {
  const pos = useMemo(
    () => latLonToVector3(city.lat, city.lon, GLOBE_RADIUS + 0.02),
    [city],
  );
  const pulse = useRef(0);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    pulse.current += dt;
    if (ringRef.current) {
      const s = 1 + Math.sin(pulse.current * 2.2) * 0.35;
      ringRef.current.scale.setScalar(city.hub || active ? s : 1);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (city.hub || active ? 0.55 : 0.22) * (0.65 + Math.sin(pulse.current * 2.2) * 0.35);
    }
  });

  return (
    <group position={pos}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(city.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[city.hub ? 0.035 : 0.022, 16, 16]} />
        <meshStandardMaterial
          color={active || city.hub ? BRAND.primary : BRAND.soft}
          emissive={BRAND.primary}
          emissiveIntensity={active || city.hub ? 1.1 : 0.45}
          roughness={0.25}
          metalness={0.2}
        />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.045, 0.065, 24]} />
        <meshBasicMaterial
          color={BRAND.primary}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function FlightArc({ route, highlighted }: { route: HeroRoute; highlighted: boolean }) {
  const from = cityById(route.from);
  const to = cityById(route.to);
  const points = useMemo(() => {
    if (!from || !to) return [] as THREE.Vector3[];
    return buildFlightCurve(from, to).getPoints(48);
  }, [from, to]);

  if (!points.length) return null;

  return (
    <Line
      points={points}
      color={highlighted ? BRAND.primary : "#6a93b8"}
      lineWidth={highlighted ? 1.7 : 0.85}
      transparent
      opacity={highlighted ? 0.88 : 0.18}
      dashed={!highlighted}
      dashSize={0.05}
      gapSize={0.04}
    />
  );
}

function PlaneAlongRoute({
  route,
  speed = 0.12,
  phase = 0,
}: {
  route: HeroRoute;
  speed?: number;
  phase?: number;
}) {
  const from = cityById(route.from);
  const to = cityById(route.to);
  const curve = useMemo(() => {
    if (!from || !to) return null;
    return buildFlightCurve(from, to);
  }, [from, to]);

  const group = useRef<THREE.Group>(null);
  const tRef = useRef(phase);

  useFrame((_, dt) => {
    if (!curve || !group.current) return;
    tRef.current = (tRef.current + dt * speed) % 1;
    const t = tRef.current;
    const pos = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    group.current.position.copy(pos);
    const look = pos.clone().add(tangent);
    group.current.lookAt(look);
    group.current.rotateY(Math.PI / 2);
  });

  if (!curve) return null;

  return (
    <group ref={group}>
      <mesh castShadow>
        <coneGeometry args={[0.028, 0.09, 4]} />
        <meshStandardMaterial
          color={BRAND.dark}
          emissive={BRAND.primary}
          emissiveIntensity={0.35}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.09, 0.01, 0.018]} />
        <meshStandardMaterial color={BRAND.primary} emissive={BRAND.primary} emissiveIntensity={0.5} />
      </mesh>
      <pointLight color={BRAND.primary} intensity={0.55} distance={0.55} />
    </group>
  );
}

function SceneContent({
  reduceMotion,
  allowRotate,
}: {
  reduceMotion: boolean;
  allowRotate: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const dragging = useRef(false);

  const highlightedRoutes = useMemo(() => {
    if (!hovered) return null;
    return new Set(
      HERO_ROUTES.filter((r) => r.from === hovered || r.to === hovered).map((r) => r.id),
    );
  }, [hovered]);

  useFrame((_, dt) => {
    if (reduceMotion || !root.current || dragging.current) return;
    root.current.rotation.y += dt * 0.08;
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 3, 5]} intensity={1.15} color="#e8f4ff" />
      <directionalLight position={[-3, -1, -2]} intensity={0.35} color="#33A1FD" />
      <pointLight position={[2.5, 1.5, 2]} intensity={0.8} color="#33A1FD" />

      <Stars
        radius={40}
        depth={30}
        count={1200}
        factor={2.2}
        saturation={0}
        fade
        speed={reduceMotion ? 0 : 0.4}
      />

      <Float speed={reduceMotion ? 0 : 1.1} rotationIntensity={0.08} floatIntensity={0.15}>
        <group ref={root} rotation={[0.15, -0.55, 0.05]}>
          <GlobeCore />

          {HERO_ROUTES.map((route) => {
            const focused = !highlightedRoutes || highlightedRoutes.has(route.id);
            return (
              <FlightArc key={route.id} route={route} highlighted={focused} />
            );
          })}

          {!reduceMotion
            ? HERO_ROUTES.slice(0, 5).map((route, i) => (
                <PlaneAlongRoute
                  key={`plane-${route.id}`}
                  route={route}
                  speed={0.08 + (i % 3) * 0.025}
                  phase={i * 0.17}
                />
              ))
            : null}

          {HERO_CITIES.map((city) => (
            <CityMarker
              key={city.id}
              city={city}
              active={hovered === city.id}
              onHover={setHovered}
            />
          ))}
        </group>
      </Float>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableRotate={allowRotate && !reduceMotion}
        autoRotate={false}
        rotateSpeed={0.55}
        minPolarAngle={Math.PI * 0.28}
        maxPolarAngle={Math.PI * 0.72}
        dampingFactor={0.08}
        enableDamping
        onStart={() => {
          dragging.current = true;
        }}
        onEnd={() => {
          dragging.current = false;
        }}
      />
    </>
  );
}

export type HeroWorldCanvasProps = {
  reduceMotion?: boolean;
  className?: string;
};

export default function HeroWorldCanvas({
  reduceMotion = false,
  className,
}: HeroWorldCanvasProps) {
  const [allowRotate, setAllowRotate] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (min-width: 768px)");
    const apply = () => setAllowRotate(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <div className={className}>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.35, 5.1], fov: 38, near: 0.1, far: 80 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <Suspense fallback={null}>
          <SceneContent reduceMotion={reduceMotion} allowRotate={allowRotate} />
        </Suspense>
      </Canvas>
    </div>
  );
}
