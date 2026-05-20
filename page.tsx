"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import type { BufferGeometry } from "three";

import {
  tankInfo,
  fillLineInfo,
  outletInfo,
  extraFittingInfo,
  ventInfo,
  levelInfo,
  additionalOptionsInfo,
} from "./configData";

import {
  makeOutletParts,
  makeFillLineParts,
  makeExtraFittingParts,
  makeVentParts,
  makeLevelParts,
} from "./partsCatalog";

import { tankSpecs } from "./tankSpecs";

type MountType = "SIDE" | "TOP";
type RoleType = "BASE" | "CHILD";

type PlacementPart = {
  mark: string;
  category: string;
  role?: RoleType;
  attachedTo?: string | null;
  assemblyId?: string;
  assemblyName?: string;
  size: string;
  itemNumber: string;
  description: string;
  deg?: number;
  elev?: number;
  mount?: MountType;
  mountLocked?: boolean;
  render?: boolean;
  scale?: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  outsideOffset?: number;
  yOffset?: number;
  clearanceRadius?: number;
  hidden?: boolean;
  topCenter?: boolean;
  sourceUrl?: string;
};

const ASSMANN_ACCESSORY_URL = "https://assmann-usa.com/tank-accessories/common-accessories/";

function AtlantisLogo({ dark = true }: { dark?: boolean }) {
  return (
    <div style={dark ? logoBoxDark : logoBoxLight}>
      <img src="/atlantis-logo.png" alt="Atlantis Technologies LLC" style={logoImage} />
    </div>
  );
}

function parseInches(value: unknown, fallback = 2) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function snapTopAngle(value: number) {
  const allowed = [0, 90, 180, 270];
  return allowed.reduce((best, current) => Math.abs(current - value) < Math.abs(best - value) ? current : best);
}

function getAssemblyId(mark: string) {
  const match = String(mark).match(/^[A-Z]+/);
  return match ? match[0] : mark.charAt(0);
}

function getColorFromName(value: string, fallback = "#d1d5db") {
  const map: Record<string, string> = {
    N: "#d1d5db", NATURAL: "#d1d5db", WHITE: "#f8fafc", BLACK: "#111827", BLUE: "#2563eb", GREEN: "#16a34a", YELLOW: "#facc15", ORANGE: "#f97316", RED: "#dc2626", GRAY: "#9ca3af", GREY: "#9ca3af",
    PVC: "#d1d5db", CPVC: "#c08457", PP: "#f8fafc", PE: "#f8fafc", PVDF: "#f1f5f9", SS: "#a3a3a3", STAINLESS: "#a3a3a3", HASTELLOY: "#71717a", TITANIUM: "#94a3b8", EPDM: "#050505", VITON: "#111827",
  };
  return map[String(value || "").toUpperCase()] || fallback;
}

function getTankColor(values: string[]) {
  return getColorFromName(String(values?.[4] || values?.[0] || "Natural"), "#d1d5db");
}

function getPartMaterialColor(part: PlacementPart) {
  const item = `${part.itemNumber || ""} ${part.description || ""}`.toUpperCase();
  if (item.includes("CPVC")) return getColorFromName("CPVC");
  if (item.includes("PVDF")) return getColorFromName("PVDF");
  if (item.includes("PP")) return getColorFromName("PP");
  if (item.includes("PVC")) return getColorFromName("PVC");
  if (item.includes("HASTELLOY")) return getColorFromName("HASTELLOY");
  if (item.includes("TITANIUM")) return getColorFromName("TITANIUM");
  if (item.includes("SS") || item.includes("STAINLESS")) return getColorFromName("SS");
  return "#d1d5db";
}

function getTankModelCandidates(tankValues: string[]) {
  const type = tankValues[0] || "IMT";
  const size = tankValues[1] || "1050";
  const sg = String(tankValues[2] || "1.9").replace(".", "");
  const material = tankValues[3] || "L";
  return [
    `/models/Double Wall Tank_A.${type}${size}${material}${sg}.stl`,
    `/models/Double Wall Tank_A.${type}${size}${material}19.stl`,
    `/models/A.${type}${size}${material}${sg}.stl`,
    `/models/A.${type}${size}${material}19.stl`,
    `/models/${type}${size}.stl`,
    `/models/${type}${size}-.stl`,
    `/models/tank_${type.toLowerCase()}_${size}.stl`,
    "/models/tank.stl",
  ];
}

function getVisualTankDims(tankSpec: any) {
  const diameter = Number(tankSpec?.diameter ?? 72);
  const height = Number(tankSpec?.height ?? 87);
  const radius = 36;
  const totalHeight = Math.max(42, Math.min(170, radius * 2 * (height / Math.max(diameter, 1))));
  const topDome = Math.max(3.5, Math.min(8, totalHeight * 0.08));
  const bottomDome = Math.max(2.5, Math.min(6, totalHeight * 0.055));
  const skirt = Math.max(2, Math.min(4.2, totalHeight * 0.035));
  const straightShellHeight = Math.max(30, totalHeight - topDome - bottomDome - skirt);
  const modelBottomY = -totalHeight / 2;
  const bottomShellY = modelBottomY + bottomDome + skirt;
  const topShellY = bottomShellY + straightShellHeight;
  const topCrownY = topShellY + topDome;
  return { radius, totalHeight, topDome, bottomDome, skirt, straightShellHeight, modelBottomY, bottomShellY, topShellY, topCrownY };
}

function getPlacedPartData(part: PlacementPart, tankSpec: any) {
  const dims = getVisualTankDims(tankSpec);
  const tankRadius = Number(tankSpec?.diameter ?? 72) / 2;
  const fittingSize = parseInches(part.size, 2);
  const clearanceRadius = part.clearanceRadius ?? Math.max(4, fittingSize * 1.35);
  const isBase = part.role === "BASE";

  if ((part.mount || "SIDE") === "TOP") {
    const deg = snapTopAngle(part.deg ?? 0);
    const angle = (deg * Math.PI) / 180;
    const flatOffset = dims.radius * 0.72;
    const x = part.topCenter ? 0 : Math.sin(angle) * flatOffset;
    const z = part.topCenter ? 0 : Math.cos(angle) * flatOffset;

    // top base gasket is raised above top face; spigot points down into tank by local -Y
    const y = dims.topCrownY + (isBase ? 2.8 : 12.5);

    return {
      position: [x, y, z] as [number, number, number],
      rotation: [0, angle, 0] as [number, number, number],
      x, y, z, radius: clearanceRadius,
    };
  }

  const angle = ((part.deg ?? 0) * Math.PI) / 180;
  const outsideOffset = part.outsideOffset ?? (isBase ? 0.25 : Math.max(4, fittingSize * 0.9));
  const y = dims.bottomShellY + (Math.max(0, Math.min(part.elev ?? 0, tankSpec.height)) / tankSpec.height) * dims.straightShellHeight;
  const radius = dims.radius + outsideOffset;
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;

  return {
    position: [x, y, z] as [number, number, number],
    rotation: [((part.rotX ?? 0) * Math.PI) / 180, angle + Math.PI / 2 + ((part.rotY ?? 0) * Math.PI) / 180, ((part.rotZ ?? 0) * Math.PI) / 180] as [number, number, number],
    x, y, z, radius: clearanceRadius,
  };
}

function SafeTankModel({ candidates, color, tankSpec }: { candidates: string[]; color: string; tankSpec: any }) {
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  const [loadedPath, setLoadedPath] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loader = new STLLoader();
    async function loadTank() {
      for (const path of candidates) {
        try {
          const response = await fetch(path, { method: "HEAD" });
          if (!response.ok) continue;
          const loaded = await loader.loadAsync(path);
          loaded.center();
          if (!cancelled) { setGeometry(loaded); setLoadedPath(path); }
          return;
        } catch {}
      }
      if (!cancelled) { setGeometry(null); setLoadedPath(""); }
    }
    loadTank();
    return () => { cancelled = true; };
  }, [candidates.join("|")]);

  if (geometry) {
    return (
      <group>
        <mesh geometry={geometry}>
          <meshStandardMaterial color={color} roughness={0.66} metalness={0.03} />
        </mesh>
        <Text position={[0, -70, 0]} fontSize={3} color="#94a3b8">{loadedPath.replace("/models/", "")}</Text>
      </group>
    );
  }
  return <FallbackTankModel color={color} tankSpec={tankSpec} />;
}

function FallbackTankModel({ color, tankSpec }: { color: string; tankSpec: any }) {
  const dims = getVisualTankDims(tankSpec);
  const r = dims.radius;
  return (
    <group>
      <mesh position={[0, dims.bottomShellY + dims.straightShellHeight / 2, 0]}><cylinderGeometry args={[r, r, dims.straightShellHeight, 128]} /><meshStandardMaterial color={color} roughness={0.68} metalness={0.03} /></mesh>
      <mesh position={[0, dims.topShellY, 0]} scale={[1, dims.topDome / r, 1]}><sphereGeometry args={[r, 128, 20, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={color} roughness={0.68} metalness={0.03} /></mesh>
      <mesh position={[0, dims.bottomShellY, 0]} rotation={[Math.PI, 0, 0]} scale={[1, dims.bottomDome / r, 1]}><sphereGeometry args={[r, 128, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={color} roughness={0.68} metalness={0.03} /></mesh>
      <mesh position={[0, dims.modelBottomY + dims.skirt / 2, 0]}><cylinderGeometry args={[r + 0.5, r - 0.5, dims.skirt, 128]} /><meshStandardMaterial color={color} roughness={0.72} /></mesh>
    </group>
  );
}

function BoltCircle({ radius, count, boltRadius = 0.35, y = 0 }: { radius: number; count: number; boltRadius?: number; y?: number }) {
  return <group>{Array.from({ length: count }).map((_, i) => { const a = (i / count) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * radius, y, Math.sin(a) * radius]}><cylinderGeometry args={[boltRadius, boltRadius, 0.85, 16]} /><meshStandardMaterial color="#374151" metalness={0.45} roughness={0.32} /></mesh>; })}</group>;
}

function ThreadRings({ radius, length, count = 9 }: { radius: number; length: number; count?: number }) {
  return <group>{Array.from({ length: count }).map((_, i) => <mesh key={i} position={[0, -length / 2 + i * (length / Math.max(count - 1, 1)), 0]}><torusGeometry args={[radius, 0.045, 8, 48]} /><meshStandardMaterial color="#64748b" /></mesh>)}</group>;
}

function BulkheadGeometry({ size, mount = "SIDE", color = "#d1d5db" }: { size: number; mount?: MountType; color?: string }) {
  const pipeR = size * 0.62;
  const nutR = Math.max(pipeR * 1.85, 3.4);
  const isTop = mount === "TOP";
  return (
    <group rotation={isTop ? [0, 0, 0] : [0, 0, Math.PI / 2]}>
      <mesh position={[0, -2.8, 0]}><cylinderGeometry args={[pipeR * 0.78, pipeR * 0.78, 5.6, 64]} /><meshStandardMaterial color={color} roughness={0.52} /></mesh>
      <mesh position={[0, 0, 0]}><cylinderGeometry args={[pipeR * 1.48, pipeR * 1.48, 0.5, 72]} /><meshStandardMaterial color="#050505" roughness={0.92} /></mesh>
      <mesh position={[0, 0.65, 0]}><cylinderGeometry args={[pipeR * 1.2, pipeR * 1.2, 0.8, 64]} /><meshStandardMaterial color="#e5e7eb" roughness={0.55} /></mesh>
      <mesh position={[0, 2.5, 0]} rotation={[0, Math.PI / 6, 0]}><cylinderGeometry args={[nutR, nutR, 3.2, 6]} /><meshStandardMaterial color={color} metalness={0.22} roughness={0.45} /></mesh>
      <mesh position={[0, 5.25, 0]}><cylinderGeometry args={[pipeR, pipeR, 4.3, 64]} /><meshStandardMaterial color={color} roughness={0.52} /></mesh>
      <group position={[0, 5.25, 0]}><ThreadRings radius={pipeR * 1.05} length={4.3} count={9} /></group>
    </group>
  );
}

function FlangeGeometry({ size, mount = "SIDE", color = "#d1d5db" }: { size: number; mount?: MountType; color?: string }) {
  const pipeR = size * 0.55;
  const flangeR = Math.max(size * 1.85, 4.8);
  const boltCount = size >= 6 ? 8 : 4;
  const isTop = mount === "TOP";
  return (
    <group rotation={isTop ? [0, 0, 0] : [0, 0, Math.PI / 2]}>
      <mesh position={[0, -2.4, 0]}><cylinderGeometry args={[pipeR * 0.8, pipeR * 0.8, 4.8, 64]} /><meshStandardMaterial color={color} roughness={0.52} /></mesh>
      <mesh position={[0, 0, 0]}><cylinderGeometry args={[flangeR * 0.98, flangeR * 0.98, 0.42, 96]} /><meshStandardMaterial color="#050505" roughness={0.92} /></mesh>
      <mesh position={[0, 0.95, 0]}><cylinderGeometry args={[flangeR, flangeR, 1.7, 96]} /><meshStandardMaterial color={color} roughness={0.48} /></mesh>
      <mesh position={[0, 3.5, 0]}><cylinderGeometry args={[pipeR, pipeR, 5.2, 64]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
      <mesh position={[0, -0.25, 0]}><torusGeometry args={[pipeR * 1.25, 0.16, 16, 64]} /><meshStandardMaterial color="#111827" /></mesh>
      <BoltCircle radius={flangeR * 0.72} count={boltCount} boltRadius={0.34} y={1.75} />
    </group>
  );
}

function UVentGeometry({ size, color = "#d1d5db" }: { size: number; color?: string }) {
  const r = size * 0.45;
  const leg = Math.max(12, size * 3.8);
  const gap = Math.max(8.5, size * 2.9);
  return (
    <group>
      <mesh position={[0, 0, 0]}><cylinderGeometry args={[r, r, leg, 48]} /><meshStandardMaterial color={color} roughness={0.48} /></mesh>
      <mesh position={[gap / 2, leg / 2, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[gap / 2, r, 28, 72, Math.PI]} /><meshStandardMaterial color={color} roughness={0.48} /></mesh>
      <mesh position={[gap, 0, 0]}><cylinderGeometry args={[r, r, leg, 48]} /><meshStandardMaterial color={color} roughness={0.48} /></mesh>
      <mesh position={[0, -leg / 2 - r * 0.7, 0]}><cylinderGeometry args={[r * 1.18, r * 1.18, r * 0.85, 48]} /><meshStandardMaterial color="#111827" /></mesh>
      <mesh position={[gap, -leg / 2 - r * 0.7, 0]}><cylinderGeometry args={[r * 1.18, r * 1.18, r * 0.85, 48]} /><meshStandardMaterial color="#111827" /></mesh>
      <mesh position={[gap / 2, leg / 2 + r * 0.2, 0]}><torusGeometry args={[gap / 2, 0.08, 8, 72, Math.PI]} /><meshStandardMaterial color="#64748b" /></mesh>
      <Text position={[gap / 2, 0, r * 1.35]} fontSize={1.4} color="#334155">U-VENT</Text>
    </group>
  );
}

function MushroomVentGeometry({ size, color = "#d1d5db" }: { size: number; color?: string }) {
  const stemR = size * 0.45; const capR = Math.max(stemR * 2.35, 3.8);
  return <group><mesh position={[0, 2, 0]}><cylinderGeometry args={[stemR, stemR, 6.5, 48]} /><meshStandardMaterial color={color} /></mesh><mesh position={[0, 5.9, 0]} scale={[1, 0.28, 1]}><sphereGeometry args={[capR, 64, 20]} /><meshStandardMaterial color={color} /></mesh><mesh position={[0, 4.4, 0]}><cylinderGeometry args={[capR * 0.82, capR * 0.82, 0.4, 64]} /><meshStandardMaterial color="#111827" /></mesh></group>;
}

function FillLineGeometry({ size, color = "#d1d5db" }: { size: number; color?: string }) {
  const r = size * 0.42;
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r, r, 22, 48]} /><meshStandardMaterial color={color} roughness={0.45} /></mesh>
      <mesh position={[10.1, -3.9, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[3.9, r, 24, 64, Math.PI / 2]} /><meshStandardMaterial color={color} roughness={0.45} /></mesh>
      <mesh position={[13.1, -9.4, 0]}><cylinderGeometry args={[r, r, 12.2, 48]} /><meshStandardMaterial color={color} roughness={0.45} /></mesh>
      <mesh position={[-11.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r * 1.25, r * 1.25, 1.1, 48]} /><meshStandardMaterial color="#94a3b8" /></mesh>
      <mesh position={[13.1, -16.0, 0]}><cylinderGeometry args={[r * 1.2, r * 1.2, 0.8, 48]} /><meshStandardMaterial color="#111827" /></mesh>
      <Text position={[4, -1.6, r * 1.25]} fontSize={1.25} color="#334155">FILL</Text>
    </group>
  );
}

function ExpansionJointGeometry({ size }: { size: number }) {
  const r = Math.max(1.2, size * 0.62);
  const len = Math.max(10, size * 4);
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh><cylinderGeometry args={[r, r, len, 48]} /><meshStandardMaterial color="#111827" roughness={0.75} /></mesh>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[0, -len / 2 + 1.2 + i * ((len - 2.4) / 5), 0]}>
          <torusGeometry args={[r * 1.05, 0.28, 16, 48]} />
          <meshStandardMaterial color="#1f2937" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, -len / 2 - 0.8, 0]}><cylinderGeometry args={[r * 1.35, r * 1.35, 1.2, 48]} /><meshStandardMaterial color="#94a3b8" metalness={0.2} roughness={0.35} /></mesh>
      <mesh position={[0, len / 2 + 0.8, 0]}><cylinderGeometry args={[r * 1.35, r * 1.35, 1.2, 48]} /><meshStandardMaterial color="#94a3b8" metalness={0.2} roughness={0.35} /></mesh>
    </group>
  );
}

function MetallicAdapterGeometry({ size, color = "#a3a3a3" }: { size: number; color?: string }) {
  const r = size * 0.48;
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh><cylinderGeometry args={[r, r, 9, 48]} /><meshStandardMaterial color={color} metalness={0.55} roughness={0.22} /></mesh>
      <mesh position={[0, -4.8, 0]} rotation={[0, Math.PI / 6, 0]}><cylinderGeometry args={[r * 1.45, r * 1.45, 2, 6]} /><meshStandardMaterial color={color} metalness={0.6} roughness={0.2} /></mesh>
      <mesh position={[0, 4.8, 0]} rotation={[0, Math.PI / 6, 0]}><cylinderGeometry args={[r * 1.25, r * 1.25, 1.6, 6]} /><meshStandardMaterial color={color} metalness={0.6} roughness={0.2} /></mesh>
      <group position={[0, 0, 0]}><ThreadRings radius={r * 1.02} length={8} count={12} /></group>
    </group>
  );
}

function AntiFoamElbowGeometry({ size, color = "#d1d5db" }: { size: number; color?: string }) {
  const r = size * 0.42;
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r, r, 8, 48]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[4.2, -3.9, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[3.9, r, 24, 64, Math.PI / 2]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[7.8, -9, 0]}><cylinderGeometry args={[r, r, 11, 48]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[7.8, -15, 0]}><cylinderGeometry args={[r * 1.4, r * 1.1, 1.5, 48]} /><meshStandardMaterial color="#111827" /></mesh>
      <Text position={[2, -2, r * 1.35]} fontSize={1.1} color="#334155">AF</Text>
    </group>
  );
}

function ReverseFloatGeometry({ color = "#d1d5db" }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.42, 0.42, 46, 24]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[23, -7, 0]}><sphereGeometry args={[3.4, 32, 16]} /><meshStandardMaterial color="#f8fafc" roughness={0.5} /></mesh>
      <mesh position={[-23, 2, 0]}><boxGeometry args={[5.5, 4.2, 4.2]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 4.5, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.16, 0.16, 44, 12]} /><meshStandardMaterial color="#111827" /></mesh>
      <Text position={[0, 7, 1.5]} fontSize={1.2} color="#334155">RFL</Text>
    </group>
  );
}

function ValveGeometry({ size, color = "#a3a3a3", mount = "SIDE" }: { size: number; color?: string; mount?: MountType }) {
  const r = size * 0.44;
  const isTop = mount === "TOP";
  return (
    <group rotation={isTop ? [0, 0, 0] : [0, 0, Math.PI / 2]}>
      <mesh><cylinderGeometry args={[r, r, 14, 56]} /><meshStandardMaterial color={color} metalness={0.25} roughness={0.35} /></mesh>
      <mesh><sphereGeometry args={[r * 1.85, 56, 28]} /><meshStandardMaterial color="#94a3b8" metalness={0.25} roughness={0.32} /></mesh>
      <mesh position={[0, -6.3, 0]}><cylinderGeometry args={[r * 1.35, r * 1.35, 1.35, 56]} /><meshStandardMaterial color={color} metalness={0.25} roughness={0.35} /></mesh>
      <mesh position={[0, 6.3, 0]}><cylinderGeometry args={[r * 1.35, r * 1.35, 1.35, 56]} /><meshStandardMaterial color={color} metalness={0.25} roughness={0.35} /></mesh>
      <mesh position={[0, -7.4, 0]}><torusGeometry args={[r * 1.1, 0.08, 8, 48]} /><meshStandardMaterial color="#111827" /></mesh>
      <mesh position={[0, 7.4, 0]}><torusGeometry args={[r * 1.1, 0.08, 8, 48]} /><meshStandardMaterial color="#111827" /></mesh>
      <mesh position={[0, 0, r * 2.1]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.28, 0.28, r * 2.4, 18]} /><meshStandardMaterial color="#111827" /></mesh>
      <mesh position={[0, 0, r * 3.25]}><boxGeometry args={[r * 5.4, 0.42, 0.85]} /><meshStandardMaterial color="#dc2626" /></mesh>
      <mesh position={[r * 2.45, 0, r * 3.25]}><boxGeometry args={[0.45, 0.65, 1.05]} /><meshStandardMaterial color="#991b1b" /></mesh>
      <Text position={[0, 0, r * 4.25]} fontSize={1.2} color="#111827">BALL VALVE</Text>
    </group>
  );
}

function SiphonDrainGeometry({ size, color = "#d1d5db", mount = "SIDE" }: { size: number; color?: string; mount?: MountType }) {
  const r = size * 0.42;
  const isTop = mount === "TOP";
  return (
    <group rotation={isTop ? [0, 0, 0] : [0, 0, Math.PI / 2]}>
      {/* base connection */}
      <mesh>
        <cylinderGeometry args={[r, r, 8, 40]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>

      {/* down tube */}
      <mesh position={[0, -6.5, 0]}>
        <cylinderGeometry args={[r * 0.82, r * 0.82, 10, 40]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>

      {/* elbow / siphon sweep */}
      <mesh position={[3.2, -11.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.2, r * 0.82, 18, 48, Math.PI / 2]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>

      {/* outlet leg */}
      <mesh position={[7.2, -14.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 0.82, r * 0.82, 9, 40]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>

      {/* outlet lip */}
      <mesh position={[12.1, -14.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r, r, 0.8, 40]} />
        <meshStandardMaterial color="#111827" roughness={0.75} />
      </mesh>
    </group>
  );
}

function SightGaugeGeometry() {
  return <group><mesh><cylinderGeometry args={[0.45, 0.45, 36, 24]} /><meshStandardMaterial color="#93c5fd" transparent opacity={0.55} /></mesh><mesh position={[0, 18.5, 0]}><sphereGeometry args={[1.5, 24, 12]} /><meshStandardMaterial color="#d1d5db" /></mesh><mesh position={[0, -18.5, 0]}><sphereGeometry args={[1.5, 24, 12]} /><meshStandardMaterial color="#d1d5db" /></mesh></group>;
}

function ProceduralShape({ part }: { part: PlacementPart }) {
  const category = (part.category || "").toLowerCase(); const item = (part.itemNumber || "").toLowerCase(); const desc = (part.description || "").toLowerCase(); const size = parseInches(part.size, 2); const partColor = getPartMaterialColor(part);
  if (category.includes("flange")) return <FlangeGeometry size={size} mount={part.mount || "SIDE"} color={partColor} />;
  if (category.includes("bulkhead")) return <BulkheadGeometry size={size} mount={part.mount || "SIDE"} color={partColor} />;
  if (category.includes("mushroom") || item.includes("mv")) return <MushroomVentGeometry size={size} color={partColor} />;
  if (category.includes("vent")) return <UVentGeometry size={size} color={partColor} />;
  if (category.includes("anti") || item.includes("af")) return <AntiFoamElbowGeometry size={size} color={partColor} />;
  if (category.includes("fill")) return <FillLineGeometry size={size} color={partColor} />;
  if (category.includes("siphon") || category.includes("drain") || item.includes("sd")) return <SiphonDrainGeometry size={size} color={partColor} mount={part.mount || "SIDE"} />;
  if (category.includes("reverse") || category.includes("float") || item.includes("rfl")) return <ReverseFloatGeometry color={partColor} />;
  if (category.includes("expansion") || category.includes("joint") || item.includes("proco")) return <ExpansionJointGeometry size={size} />;
  if (category.includes("metallic") || item.includes("sdm") || item.includes("sf001") || desc.includes("metallic")) return <MetallicAdapterGeometry size={size} color={partColor} />;
  if (category.includes("sight") || category.includes("manual level") || category.includes("gauge")) return <SightGaugeGeometry />;
  if (category.includes("valve")) return <ValveGeometry size={size} color={partColor} mount={part.mount || "SIDE"} />;
  if (category.includes("plug")) return <BulkheadGeometry size={size * 0.7} mount={part.mount || "SIDE"} color={partColor} />;
  return <BulkheadGeometry size={size} mount={part.mount || "SIDE"} color={partColor} />;
}

function ProceduralFitting({ part, tankSpec, selectedPartMark, setSelectedPartMark }: any) {
  const placed = getPlacedPartData(part, tankSpec); const isSelected = selectedPartMark === part.mark; const s = part.scale ?? 1;
  return <group position={placed.position} rotation={placed.rotation} scale={[s, s, s]} onClick={(e) => { e.stopPropagation(); setSelectedPartMark(part.mark); }}><ProceduralShape part={part} /><mesh visible={isSelected}><sphereGeometry args={[placed.radius, 24, 12]} /><meshStandardMaterial color="#22d3ee" transparent opacity={0.12} /></mesh><Text position={[0, placed.radius + 4, 0]} fontSize={4} color={isSelected ? "#67e8f9" : "white"}>{part.mark}</Text></group>;
}

function placementDistance(a: PlacementPart, b: PlacementPart, tankSpec: any) { const da = getPlacedPartData(a, tankSpec); const db = getPlacedPartData(b, tankSpec); if ((a.mount || "SIDE") !== (b.mount || "SIDE")) return 999; const dx = da.x - db.x; const dy = da.y - db.y; const dz = da.z - db.z; return Math.sqrt(dx * dx + dy * dy + dz * dz); }
function hasCollision(part: PlacementPart, parts: PlacementPart[], tankSpec: any) { if (part.render === false || part.category === "Tank") return false; return parts.some((other) => { if (other.mark === part.mark || other.assemblyId === part.assemblyId || other.render === false || other.category === "Tank") return false; const distance = placementDistance(part, other, tankSpec); const a = getPlacedPartData(part, tankSpec).radius; const b = getPlacedPartData(other, tankSpec).radius; return distance < (a + b) * 0.7; }); }

function ControlSlider({ label, value, min, max, step, suffix = "", onChange }: any) { return <div style={controlBlock}><div style={controlRow}><label style={controlLabel}>{label}</label><span style={controlValue}>{value}{suffix}</span></div><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={slider} /></div>; }

export default function Home() {
  const defaultTank = ["IMT", "1050", "1.9", "L", "Natural"];
  const defaultFillLine = ["F", "PVC", "SS", "EPDM", "1.00"];
  const defaultOutlet = ["F", "PVC", "SS", "EPDM", "2.00", "PVC-TU", "N", "N"];
  const defaultExtra1 = ["F", "PVC", "SS", "EPDM", "2.00", "N"];
  const defaultExtra2 = ["B", "PP", "SS", "VITON", "1.00", "N"];
  const defaultVent = ["UVB", "PVC40", "SS", "EPDM", "4.00", "N"];
  const defaultLevel = ["SG", "PVC", "SS", "EPDM"];
  const defaultAdditional = ["N", "N", "N", "N", "Natural"];

  const [step, setStep] = useState("SELECT");
  const [openSections, setOpenSections] = useState(["Tank"]);
  const [chatText, setChatText] = useState("");
  const [selectedPartMark, setSelectedPartMark] = useState("");
  const [placementCode, setPlacementCode] = useState("");
  const [tankValues, setTankValues] = useState(defaultTank);
  const [fillLineValues, setFillLineValues] = useState(defaultFillLine);
  const [outletValues, setOutletValues] = useState(defaultOutlet);
  const [extra1Values, setExtra1Values] = useState(defaultExtra1);
  const [extra2Values, setExtra2Values] = useState(defaultExtra2);
  const [ventValues, setVentValues] = useState(defaultVent);
  const [levelValues, setLevelValues] = useState(defaultLevel);
  const [additionalValues, setAdditionalValues] = useState(defaultAdditional);
  const [partsList, setPartsList] = useState<PlacementPart[]>([]);

  const tankSpec = tankSpecs[tankValues[0]]?.[tankValues[1]] || { diameter: 72, height: 87 };
  const tankColor = getTankColor(additionalValues);
  const tankCandidates = useMemo(() => getTankModelCandidates(tankValues), [tankValues.join("|")]);
  const selectedPart = partsList.find((p) => p.mark === selectedPartMark);
  const selectedAssemblyId = selectedPart?.assemblyId || (selectedPart ? getAssemblyId(selectedPart.mark) : "");
  const selectedAssemblyParts = partsList.filter((p) => p.assemblyId === selectedAssemblyId);
  const assemblyController = selectedAssemblyParts.find((p) => p.role === "BASE") || selectedPart;
  const collisions = useMemo(() => { const result: Record<string, boolean> = {}; for (const part of partsList) result[part.mark] = hasCollision(part, partsList, tankSpec); return result; }, [partsList, tankSpec]);

  function normalizeParts(parts: any[]): PlacementPart[] {
    return parts.map((part) => {
      const id = getAssemblyId(part.mark); const category = String(part.category || "").toLowerCase(); const isVentAssembly = id === "F" || category.includes("vent"); const isFillAssembly = id === "C" || category.includes("fill"); const isTopAssembly = isVentAssembly || isFillAssembly || category.includes("anti-foam"); const isLevel = category.includes("level") || category.includes("gauge") || category.includes("float"); const base = String(part.mark).endsWith("1") || part.role === "BASE";
      return { ...part, assemblyId: id, assemblyName: id === "B" ? "Outlet Assembly" : id === "C" ? "Fill Line Assembly" : id === "F" ? "Vent Assembly" : id === "D" ? "Extra Fitting 1" : id === "E" ? "Extra Fitting 2" : id === "G" ? "Level Assembly" : "Assembly", role: base ? "BASE" : "CHILD", attachedTo: base ? null : `${id}1`, mount: part.mount ?? (isTopAssembly ? "TOP" : "SIDE"), mountLocked: isTopAssembly, deg: isTopAssembly ? snapTopAngle(part.deg ?? 0) : part.deg ?? 0, topCenter: part.topCenter ?? false, elev: part.elev ?? (isTopAssembly ? 0 : 12), scale: part.scale ?? (isVentAssembly ? 0.52 : isFillAssembly ? 0.42 : isLevel ? 0.7 : 0.82), rotX: part.rotX ?? 0, rotY: part.rotY ?? 0, rotZ: part.rotZ ?? 0, yOffset: part.yOffset ?? (isTopAssembly ? (base ? 0 : 12.5) : 0), outsideOffset: part.outsideOffset ?? (base ? 0.25 : 4), render: part.render ?? true, hidden: part.hidden ?? false, sourceUrl: part.sourceUrl ?? ASSMANN_ACCESSORY_URL, clearanceRadius: part.clearanceRadius ?? Math.max(4, parseInches(part.size, 2) * 1.35) };
    });
  }

  function resetConfigurator() { setStep("SELECT"); setOpenSections(["Tank"]); setChatText(""); setSelectedPartMark(""); setPlacementCode(""); setTankValues([...defaultTank]); setFillLineValues([...defaultFillLine]); setOutletValues([...defaultOutlet]); setExtra1Values([...defaultExtra1]); setExtra2Values([...defaultExtra2]); setVentValues([...defaultVent]); setLevelValues([...defaultLevel]); setAdditionalValues([...defaultAdditional]); setPartsList([]); }

  function generateParts(customOverrides?: any) {
    const rawParts = [
      { mark: "A", category: "Tank", role: "BASE", size: `${tankValues[1]} GAL`, itemNumber: `TANK-${tankValues[0]}-${tankValues[1]}-${tankValues[2]}-${tankValues[3]}`, description: `${tankValues[1]} gallon ${tankValues[0]} tank`, deg: 0, elev: 0, render: true, scale: 1 },
      ...makeOutletParts(outletValues, customOverrides?.outletDeg ?? 0, customOverrides?.outletElev ?? 6),
      ...makeFillLineParts(fillLineValues, customOverrides?.fillDeg ?? 0, customOverrides?.fillElev ?? 0),
      ...makeExtraFittingParts(extra1Values, "D1", customOverrides?.extra1Deg ?? 180, customOverrides?.extra1Elev ?? Math.min(30, tankSpec.height - 6)),
      ...makeExtraFittingParts(extra2Values, "E1", customOverrides?.extra2Deg ?? 0, customOverrides?.extra2Elev ?? Math.min(30, tankSpec.height - 6)),
      ...makeVentParts(ventValues, customOverrides?.ventDeg ?? 270, customOverrides?.ventElev ?? 0),
      ...makeLevelParts(levelValues, customOverrides?.levelDeg ?? 270, customOverrides?.levelElev ?? Math.min(50, tankSpec.height - 6)),
    ];
    setPartsList(normalizeParts(rawParts)); setSelectedPartMark(""); setPlacementCode(""); setStep("PLACE");
  }

  function applyChatCommand() { generateParts(); }
  function updateAssembly(assemblyId: string, field: string, value: any) { setPartsList((current) => current.map((part) => { if (part.assemblyId !== assemblyId) return part; const isTop = (field === "mount" ? value : part.mount) === "TOP"; const updated: PlacementPart = { ...part, [field]: field === "deg" && isTop ? snapTopAngle(Number(value)) : value }; if (field === "topCenter") updated.elev = 0; return updated; })); }
  function deleteAssembly(assemblyId: string) { setPartsList((current) => current.filter((part) => part.assemblyId !== assemblyId)); setSelectedPartMark(""); }
  function toggleAssemblyHidden(assemblyId: string) { const group = partsList.filter((part) => part.assemblyId === assemblyId); const shouldHide = group.some((part) => !part.hidden); setPartsList((current) => current.map((part) => part.assemblyId === assemblyId ? { ...part, hidden: shouldHide } : part)); }
  function showAllAssemblies() { setPartsList((current) => current.map((part) => ({ ...part, hidden: false }))); }
  function generatePlacementCode(part: PlacementPart) { const code = `// ${part.assemblyId} - ${part.assemblyName}
mount: "${part.mount ?? "SIDE"}",
deg: ${part.deg ?? 0},
elev: ${part.elev ?? 0},
topCenter: ${!!part.topCenter},`; setPlacementCode(code); navigator.clipboard?.writeText(code); }

  return (
    <div style={page}>
      {step === "SELECT" && <div style={selectPage}><div style={topBar}><AtlantisLogo /><h1>Tank Configurator</h1><button type="button" onClick={resetConfigurator} style={dangerButton}>Reset Everything</button></div><div style={chatBox}><h2>Chat Configurator Assistant</h2><textarea value={chatText} onChange={(e) => setChatText(e.target.value)} style={chatInput} placeholder="Example: IMT 1050 with 2 inch outlet, 1 inch fill line, and 4 inch U-vent" /><button type="button" onClick={applyChatCommand} style={primaryButton}>Build From Text</button></div><Section title="Tank" openSections={openSections} setOpenSections={setOpenSections}><ConfigGroup info={tankInfo} values={tankValues} setValues={setTankValues} /></Section><Section title="Fill Line" openSections={openSections} setOpenSections={setOpenSections}><ConfigGroup info={fillLineInfo} values={fillLineValues} setValues={setFillLineValues} /></Section><Section title="Outlet" openSections={openSections} setOpenSections={setOpenSections}><ConfigGroup info={outletInfo} values={outletValues} setValues={setOutletValues} /></Section><Section title="Extra Fitting 1" openSections={openSections} setOpenSections={setOpenSections}><ConfigGroup info={extraFittingInfo} values={extra1Values} setValues={setExtra1Values} /></Section><Section title="Extra Fitting 2" openSections={openSections} setOpenSections={setOpenSections}><ConfigGroup info={extraFittingInfo} values={extra2Values} setValues={setExtra2Values} /></Section><Section title="Vent" openSections={openSections} setOpenSections={setOpenSections}><ConfigGroup info={ventInfo} values={ventValues} setValues={setVentValues} /></Section><Section title="Manual Level" openSections={openSections} setOpenSections={setOpenSections}><ConfigGroup info={levelInfo} values={levelValues} setValues={setLevelValues} /></Section><Section title="Additional Options" openSections={openSections} setOpenSections={setOpenSections}><ConfigGroup info={additionalOptionsInfo} values={additionalValues} setValues={setAdditionalValues} /></Section><button type="button" onClick={() => generateParts()} style={primaryButton}>Next: Generate 3D Drawing</button></div>}

      {step === "PLACE" && <><div style={viewerColumn}><div style={viewerToolbar}><AtlantisLogo /><div style={stepPill}>1. Configure</div><div style={activeStepPill}>2. Place Assemblies</div><div style={stepPill}>3. Drawing</div></div><div style={viewer}><Canvas camera={{ position: [75, 45, 85], fov: 45 }}><ambientLight intensity={1.1} /><directionalLight position={[10, 20, 10]} intensity={1.3} /><directionalLight position={[-10, 12, -10]} intensity={0.55} /><SafeTankModel candidates={tankCandidates} color={tankColor} tankSpec={tankSpec} />{partsList.filter((part) => part.category !== "Tank" && part.render !== false && !part.hidden).map((part, index) => <ProceduralFitting key={`${part.mark}-${index}`} part={part} tankSpec={tankSpec} selectedPartMark={selectedPartMark} setSelectedPartMark={setSelectedPartMark} />)}<OrbitControls /></Canvas></div><PartsSchedule partsList={partsList} collisions={collisions} /><div style={bottomButtons}><button type="button" onClick={() => setStep("SELECT")} style={secondaryButton}>Back</button><button type="button" onClick={resetConfigurator} style={dangerButton}>Reset Everything</button><button type="button" onClick={showAllAssemblies} style={secondaryButton}>Show All</button><button type="button" onClick={() => setStep("DRAWING")} style={primaryButton}>Generate Drawing</button></div></div><div style={rightPanel}><h2>Assembly Controls</h2>{assemblyController ? <><div style={selectedHeader}><div><b>{assemblyController.assemblyName}</b><div style={mutedText}>{selectedAssemblyParts.map((p) => p.mark).join(" + ")}</div></div><button type="button" onClick={() => toggleAssemblyHidden(selectedAssemblyId)} style={secondaryButton}>{selectedAssemblyParts.some((p) => !p.hidden) ? "Hide" : "Show"}</button><button type="button" onClick={() => deleteAssembly(selectedAssemblyId)} style={dangerButton}>Delete</button></div><label>Mount Location</label><select value={assemblyController.mount ?? "SIDE"} disabled={assemblyController.mountLocked} onChange={(e) => updateAssembly(selectedAssemblyId, "mount", e.target.value)} style={selectStyle}><option value="SIDE">Side Wall</option><option value="TOP">Top of Tank</option></select>{assemblyController.mountLocked && <div style={lockedText}>Locked by assembly rule</div>}{(assemblyController.mount || "SIDE") === "TOP" ? <><div style={controlBlock}><div style={controlRow}><label style={controlLabel}>Top Flat Position</label><span style={controlValue}>{assemblyController.deg ?? 0}°</span></div><select value={assemblyController.deg ?? 0} onChange={(e) => updateAssembly(selectedAssemblyId, "deg", Number(e.target.value))} style={selectStyle}><option value={0}>0°</option><option value={90}>90°</option><option value={180}>180°</option><option value={270}>270°</option></select></div><label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "14px" }}><input type="checkbox" checked={!!assemblyController.topCenter} onChange={(e) => updateAssembly(selectedAssemblyId, "topCenter", e.target.checked)} />Top center instead of top flat</label></> : <>
                  <div style={controlBlock}>
                    <div style={controlRow}>
                      <label style={controlLabel}>Side Angle Presets</label>
                      <span style={controlValue}>{Math.round(assemblyController.deg ?? 0)}°</span>
                    </div>
                    <div style={anglePresetGrid}>
                      {[0, 90, 180, 270].map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          onClick={() => updateAssembly(selectedAssemblyId, "deg", deg)}
                          style={(assemblyController.deg ?? 0) === deg ? anglePresetActive : anglePresetButton}
                        >
                          {deg}°
                        </button>
                      ))}
                    </div>
                  </div>
                  <ControlSlider
                    label="Fine Side Angle"
                    value={assemblyController.deg ?? 0}
                    min={0}
                    max={359}
                    step={1}
                    suffix="°"
                    onChange={(v: number) => updateAssembly(selectedAssemblyId, "deg", v)}
                  />
                  <ControlSlider
                    label="Elevation from Bottom"
                    value={assemblyController.elev ?? 0}
                    min={0}
                    max={tankSpec.height}
                    step={0.5}
                    suffix='"'
                    onChange={(v: number) => updateAssembly(selectedAssemblyId, "elev", v)}
                  />
                </>}<div style={statusBox}>{selectedAssemblyParts.some((p) => collisions[p.mark]) ? "⚠ Assembly too close to another assembly" : "✅ Assembly position valid"}</div><button type="button" onClick={() => generatePlacementCode(assemblyController)} style={primaryButton}>Copy Assembly Code</button>{placementCode && <pre style={codeBox}>{placementCode}</pre>}</> : <p style={mutedText}>Click any part of an assembly to edit the whole assembly.</p>}<h2>Assemblies</h2><div style={fittingList}>{Object.values(partsList.filter((p) => p.category !== "Tank").reduce((acc: Record<string, PlacementPart[]>, part) => { const id = part.assemblyId || getAssemblyId(part.mark); acc[id] = acc[id] || []; acc[id].push(part); return acc; }, {})).map((group) => { const first = group[0]; return <div key={first.assemblyId} style={{ ...fittingListItem, opacity: group.every((p) => p.hidden) ? 0.45 : 1, borderLeft: group.every((p) => p.hidden) ? "4px solid #64748b" : "4px solid #22d3ee" }} onClick={() => setSelectedPartMark(first.mark)}><b>{first.assemblyName}</b><div>{group.map((p) => p.mark).join(" + ")}</div><div style={first.mount === "TOP" ? topTag : sideTag}>{first.mount || "SIDE"}{group.every((p) => p.hidden) ? " / HIDDEN" : ""}</div></div>; })}</div></div></>}

      {step === "DRAWING" && <DrawingPage partsList={partsList} tankValues={tankValues} tankSpec={tankSpec} tankColor={tankColor} setStep={setStep} />}
    </div>
  );
}

function PartsSchedule({ partsList, collisions }: any) { return <div style={scheduleBox}><h3>Parts List / Nozzle Schedule</h3><table style={table}><thead><tr><th style={cell}>MK</th><th style={cell}>Assembly</th><th style={cell}>Description</th><th style={cell}>Size</th><th style={cell}>Mount</th><th style={cell}>Angle</th><th style={cell}>Elev/Offset</th><th style={cell}>Status</th></tr></thead><tbody>{partsList.map((part: PlacementPart) => <tr key={part.mark}><td style={cell}>{part.mark}</td><td style={cell}>{part.assemblyName}</td><td style={cell}>{part.description}</td><td style={cell}>{part.size}</td><td style={cell}>{part.mount || "SIDE"}</td><td style={cell}>{part.category === "Tank" ? "-" : `${part.deg ?? 0}°`}</td><td style={cell}>{part.category === "Tank" ? "-" : `${part.elev ?? 0}"`}</td><td style={cell}>{part.hidden ? "Hidden" : collisions[part.mark] ? "Too Close" : "OK"}</td></tr>)}</tbody></table></div>; }

function DrawingPage({ partsList, tankValues, tankSpec, tankColor, setStep }: any) { const visibleParts = partsList.filter((p: PlacementPart) => p.category !== "Tank" && p.render !== false && !p.hidden); const topParts = visibleParts.filter((p: PlacementPart) => p.mount === "TOP"); const sideParts = visibleParts.filter((p: PlacementPart) => p.mount !== "TOP"); return <div style={drawingPage}><div style={drawingSheet}><div style={drawingHeader}><AtlantisLogo dark={false} /><div><h2 style={{ color: "black", margin: 0 }}>ATLANTIS / ASSMANN TANK CONFIGURATION DRAWING</h2><p style={{ color: "black", margin: "6px 0 0" }}>{tankValues[0]} {tankValues[1]} GAL | Diameter {tankSpec.diameter}" | Overall Height {tankSpec.height}"</p></div></div><div style={drawingGrid}><TopView partsList={partsList} tankSpec={tankSpec} /><FrontView partsList={partsList} tankSpec={tankSpec} /><AssemblyDetailView partsList={partsList} /></div><div style={drawingNotesBox}><b>DRAWING NOTES</b><ol style={{ marginTop: "6px" }}><li>All fittings are shown outside tank wall/roof surface.</li><li>Top-mounted fill lines and vents are restricted to 0°, 90°, 180°, or 270°.</li><li>Gasket side of base fitting is coincident with tank face; the small spigot projects into tank.</li><li>BASE = tank penetration. CHILD = accessory mounted to the base.</li></ol></div><h3 style={{ color: "black", marginBottom: "6px" }}>NOZZLE / ACCESSORY SCHEDULE</h3><table style={drawingTableStrong}><thead><tr><th style={drawingCellStrong}>MK</th><th style={drawingCellStrong}>Assembly</th><th style={drawingCellStrong}>Role</th><th style={drawingCellStrong}>Size</th><th style={drawingCellStrong}>Mount</th><th style={drawingCellStrong}>Angle</th><th style={drawingCellStrong}>Elev / Offset</th><th style={drawingCellStrong}>Item Number</th><th style={drawingCellStrong}>Description</th></tr></thead><tbody>{visibleParts.map((part: PlacementPart) => <tr key={part.mark}><td style={drawingCellStrong}><b>{part.mark}</b></td><td style={drawingCellStrong}>{part.assemblyName || "-"}</td><td style={drawingCellStrong}>{part.role || "-"}</td><td style={drawingCellStrong}>{part.size}</td><td style={drawingCellStrong}>{part.mount || "SIDE"}</td><td style={drawingCellStrong}>{part.deg ?? 0}°</td><td style={drawingCellStrong}>{part.topCenter ? "TOP CENTER" : `${part.elev ?? 0}"`}</td><td style={drawingCellStrong}>{part.itemNumber}</td><td style={drawingCellStrong}>{part.description}</td></tr>)}</tbody></table><div style={titleBlockLarge}><div style={titleCell}>DRAWN BY<br /><b>CR</b></div><div style={titleCell}>REVISION<br /><b>00</b></div><div style={titleCell}>SHEET<br /><b>1 OF 1</b></div><div style={titleCell}>SCALE<br /><b>NTS</b></div><div style={titleCell}>TOP ITEMS<br /><b>{topParts.length}</b></div><div style={titleCell}>SIDE ITEMS<br /><b>{sideParts.length}</b></div><div style={wideTitleCell}>TANK COLOR<br /><b>{tankColor}</b></div><div style={wideTitleCell}>DESCRIPTION<br /><b>{tankValues[0]} {tankValues[1]} GAL CONFIGURED TANK</b></div></div></div><button type="button" onClick={() => window.print()} style={primaryButton}>Print / Save PDF</button><button type="button" onClick={() => setStep("PLACE")} style={secondaryButton}>Back to 3D</button><button type="button" onClick={() => setStep("SELECT")} style={secondaryButton}>Back to Configure</button></div>; }

function TopView({ partsList, tankSpec }: any) { const center = 185; const radius = 132; const visible = partsList.filter((p: PlacementPart) => p.category !== "Tank" && p.render !== false && !p.hidden); return <svg width="390" height="390" style={svgBoxLarge}><text x="195" y="24" textAnchor="middle" fontSize="18" fontWeight="bold" fill="black">TOP VIEW / PLAN</text><circle cx={center} cy={center} r={radius} fill="#f8fafc" stroke="black" strokeWidth="3" /><circle cx={center} cy={center} r={34} fill="none" stroke="#111827" strokeWidth="2" /><circle cx={center} cy={center} r={radius * 0.72} fill="none" stroke="#94a3b8" strokeDasharray="5 5" /><line x1={center - radius - 16} y1={center} x2={center + radius + 16} y2={center} stroke="#111827" /><line x1={center} y1={center - radius - 16} x2={center} y2={center + radius + 16} stroke="#111827" /><text x={center} y={center - radius - 18} textAnchor="middle" fontSize="11" fill="black">0°</text><text x={center + radius + 24} y={center + 4} textAnchor="middle" fontSize="11" fill="black">90°</text><text x={center} y={center + radius + 30} textAnchor="middle" fontSize="11" fill="black">180°</text><text x={center - radius - 26} y={center + 4} textAnchor="middle" fontSize="11" fill="black">270°</text>{visible.map((part: PlacementPart) => { const angle = (snapTopAngle(part.deg ?? 0) * Math.PI) / 180; const radial = part.mount === "TOP" ? (part.topCenter ? 0 : radius * 0.72) : radius; const x = center + Math.sin(angle) * radial; const y = center - Math.cos(angle) * radial; return <g key={part.mark}><circle cx={x} cy={y} r="14" fill={part.mount === "TOP" ? "#dcfce7" : "#dbeafe"} stroke="black" strokeWidth="2" /><text x={x} y={y + 5} textAnchor="middle" fontSize="13" fontWeight="bold" fill="black">{part.mark}</text><text x={x} y={y + 25} textAnchor="middle" fontSize="9" fill="black">{part.size}</text></g>; })}</svg>; }

function FrontView({ partsList, tankSpec }: any) { const x = 115; const y = 35; const w = 150; const h = 290; const sideItems = partsList.filter((p: PlacementPart) => p.category !== "Tank" && p.render !== false && !p.hidden && p.mount !== "TOP"); const topItems = partsList.filter((p: PlacementPart) => p.category !== "Tank" && p.render !== false && !p.hidden && p.mount === "TOP"); return <svg width="390" height="390" style={svgBoxLarge}><text x="195" y="24" textAnchor="middle" fontSize="18" fontWeight="bold" fill="black">SIDE ELEVATION</text><path d={`M ${x} ${y + 26} Q ${x + w / 2} ${y - 10} ${x + w} ${y + 26} L ${x + w} ${y + h - 26} Q ${x + w / 2} ${y + h + 10} ${x} ${y + h - 26} Z`} fill="#f8fafc" stroke="black" strokeWidth="3" /><text x="195" y="352" textAnchor="middle" fontSize="11" fill="black">Ø {tankSpec.diameter}" × {tankSpec.height}" OAH</text>{sideItems.map((part: PlacementPart) => { const py = y + h - ((part.elev ?? 0) / tankSpec.height) * h; const isRight = part.deg === 90 || (part.deg !== 270 && part.deg !== 180); const px = isRight ? x + w : x; const labelX = isRight ? px + 56 : px - 56; return <g key={part.mark}><circle cx={px} cy={py} r="9" fill="white" stroke="black" strokeWidth="2" /><line x1={px} y1={py} x2={labelX} y2={py - 18} stroke="black" /><text x={labelX} y={py - 21} textAnchor="middle" fontSize="12" fontWeight="bold" fill="black">{part.mark}</text></g>; })}{topItems.map((part: PlacementPart, index: number) => { const angle = (snapTopAngle(part.deg ?? 0) * Math.PI) / 180; const px = part.topCenter ? x + w / 2 : x + w / 2 + Math.sin(angle) * (w / 2) * 0.72; const py = y + 13 - index * 2; return <g key={part.mark}><circle cx={px} cy={py} r="8" fill="#dcfce7" stroke="black" strokeWidth="2" /><text x={px + 26} y={py - 13} fontSize="12" fontWeight="bold" fill="black">{part.mark}</text></g>; })}</svg>; }

function AssemblyDetailView({ partsList }: any) { const assemblies = Object.values(partsList.filter((p: PlacementPart) => p.category !== "Tank" && !p.hidden).reduce((acc: Record<string, PlacementPart[]>, part: PlacementPart) => { const id = part.assemblyId || getAssemblyId(part.mark); acc[id] = acc[id] || []; acc[id].push(part); return acc; }, {})) as PlacementPart[][]; return <svg width="390" height="390" style={svgBoxLarge}><text x="195" y="24" textAnchor="middle" fontSize="18" fontWeight="bold" fill="black">ASSEMBLY DETAILS</text>{assemblies.slice(0, 7).map((group, index) => { const y = 58 + index * 42; const base = group.find((p) => p.role === "BASE") || group[0]; const children = group.filter((p) => p.mark !== base.mark); return <g key={base.assemblyId || base.mark}><rect x="22" y={y - 20} width="340" height="34" fill="white" stroke="black" /><circle cx="42" cy={y - 3} r="11" fill={base.mount === "TOP" ? "#dcfce7" : "#dbeafe"} stroke="black" /><text x="42" y={y + 1} textAnchor="middle" fontSize="10" fontWeight="bold" fill="black">{base.assemblyId}</text><text x="62" y={y - 7} fontSize="11" fontWeight="bold" fill="black">{base.assemblyName}</text><text x="62" y={y + 8} fontSize="9" fill="black">{base.mount} | {base.deg}° | {base.topCenter ? "TOP CENTER" : `${base.elev}"`} | {group.map((p) => p.mark).join(" + ")}</text><text x="285" y={y + 2} fontSize="9" fill="black">{children.length} child item(s)</text></g>; })}</svg>; }

function ConfigGroup({ info, values, setValues }: any) { return <>{info.labels.map((label: string, index: number) => <LabelSelect key={label} label={label} value={values[index]} setValue={(value: any) => { const updated = [...values]; updated[index] = value; setValues(updated); }} options={info.values[index]} />)}</>; }
function Section({ title, openSections, setOpenSections, children }: any) { const isOpen = openSections.includes(title); return <div style={{ marginBottom: "12px" }}><button type="button" onClick={() => setOpenSections(isOpen ? openSections.filter((section: string) => section !== title) : [...openSections, title])} style={sectionButton}><span>{title}</span><span>{isOpen ? "⌃" : "⌄"}</span></button>{isOpen && <div style={sectionBody}>{children}</div>}</div>; }
function LabelSelect({ label, value, setValue, options }: any) { return <div style={row}><label style={labelStyle}>{label}</label><select value={value} onChange={(e) => setValue(e.target.value)} style={selectStyle}>{options.map((option: any) => { const optionValue = typeof option === "object" ? option.value : option; const optionText = typeof option === "object" ? `${option.value} - ${option.label}` : option; return <option key={optionValue} value={optionValue}>{optionText}</option>; })}</select></div>; }

const page = { width: "100vw", height: "100vh", background: "#0f172a", display: "flex", color: "white", fontFamily: "Arial" };
const selectPage = { width: "100%", padding: "24px", overflowY: "auto" as const };
const topBar = { display: "flex", alignItems: "center", gap: "24px", marginBottom: "18px" };
const viewerColumn = { width: "68%", height: "100%", display: "flex", flexDirection: "column" as const };
const viewerToolbar = { height: "64px", display: "flex", alignItems: "center", gap: "20px", padding: "0 16px", borderBottom: "1px solid #334155", background: "#111827" };
const viewer = { flex: 1, minHeight: 0, background: "radial-gradient(circle at center, #1e293b, #020617)" };
const rightPanel = { width: "32%", background: "#111827", padding: "16px", overflowY: "auto" as const, borderLeft: "1px solid #334155" };
const stepPill = { color: "#94a3b8", fontWeight: 700 };
const activeStepPill = { color: "#22d3ee", borderBottom: "2px solid #22d3ee", paddingBottom: "6px", fontWeight: 800 };
const logoBoxDark = { background: "transparent", padding: "4px", display: "inline-block" };
const logoBoxLight = { background: "white", padding: "4px", display: "inline-block", marginBottom: "16px" };
const logoImage = { width: "180px", height: "auto", display: "block" };
const chatBox = { background: "#0f172a", border: "1px solid #334155", padding: "16px", marginBottom: "18px", borderRadius: "10px" };
const chatInput = { width: "100%", minHeight: "90px", padding: "12px", fontSize: "16px", color: "black", background: "white", borderRadius: "6px" };
const sectionButton = { width: "100%", background: "#1f2937", color: "white", border: "1px solid #334155", padding: "10px 14px", fontSize: "22px", fontWeight: "bold", textAlign: "left" as const, display: "flex", justifyContent: "space-between", cursor: "pointer", borderRadius: "8px" };
const sectionBody = { padding: "18px 24px", background: "#0f172a", border: "1px solid #334155", borderTop: "none" };
const row = { display: "grid", gridTemplateColumns: "1fr 260px", gap: "16px", marginBottom: "14px", alignItems: "center" };
const labelStyle = { fontSize: "18px", fontWeight: "bold" };
const selectStyle = { padding: "10px", fontSize: "16px", background: "white", color: "black", borderRadius: "4px", width: "100%" };
const primaryButton = { padding: "12px 18px", fontSize: "16px", background: "#0f766e", color: "white", border: "none", borderRadius: "6px", marginTop: "12px", marginRight: "12px", cursor: "pointer", fontWeight: 800 };
const secondaryButton = { padding: "12px 18px", fontSize: "16px", background: "#334155", color: "white", border: "none", borderRadius: "6px", marginTop: "12px", marginRight: "12px", cursor: "pointer", fontWeight: 800 };
const dangerButton = { padding: "12px 18px", fontSize: "16px", background: "#991b1b", color: "white", border: "none", borderRadius: "6px", marginTop: "12px", marginRight: "12px", cursor: "pointer", fontWeight: 800 };
const controlBlock = { marginTop: "14px" };
const controlRow = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const controlLabel = { fontSize: "13px", color: "#cbd5e1", fontWeight: 700 };
const controlValue = { background: "#1e293b", border: "1px solid #334155", borderRadius: "4px", padding: "4px 8px", minWidth: "52px", textAlign: "right" as const };
const slider = { width: "100%", marginTop: "6px", accentColor: "#22d3ee" };
const selectedHeader = { display: "flex", justifyContent: "space-between", gap: "12px", background: "#0f172a", border: "1px solid #334155", padding: "12px", borderRadius: "8px" };
const mutedText = { color: "#94a3b8", fontSize: "13px" };
const lockedText = { color: "#fbbf24", fontSize: "12px", fontWeight: "bold", marginTop: "6px", marginBottom: "10px" };
const statusBox = { border: "1px solid #166534", background: "#052e16", color: "#bbf7d0", padding: "10px", marginTop: "12px", borderRadius: "8px", fontSize: "13px" };
const codeBox = { background: "#020617", color: "#22c55e", border: "1px solid #334155", padding: "12px", fontSize: "13px", whiteSpace: "pre-wrap" as const, borderRadius: "8px" };
const fittingList = { display: "grid", gap: "10px" };
const fittingListItem = { background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", padding: "12px", cursor: "pointer" };
const topTag = { color: "#22d3ee", fontWeight: 800, marginTop: "4px" };
const sideTag = { color: "#38bdf8", fontWeight: 800, marginTop: "4px" };
const scheduleBox = { background: "#0f172a", borderTop: "1px solid #334155", padding: "12px 16px", maxHeight: "220px", overflowY: "auto" as const };
const table = { width: "100%", borderCollapse: "collapse" as const, fontSize: "12px" };
const cell = { border: "1px solid #334155", padding: "6px", textAlign: "left" as const };
const bottomButtons = { padding: "12px 16px", display: "flex", justifyContent: "space-between", borderTop: "1px solid #334155", background: "#111827" };
const drawingPage = { width: "100%", background: "#6b7280", padding: "24px", overflowY: "auto" as const };
const drawingSheet = { width: "1220px", minHeight: "860px", background: "white", color: "black", padding: "28px", margin: "0 auto", border: "3px solid black" };
const drawingHeader = { display: "flex", alignItems: "center", gap: "24px", borderBottom: "2px solid black", paddingBottom: "12px", marginBottom: "16px" };
const drawingGrid = { display: "grid", gridTemplateColumns: "390px 390px 390px", gap: "16px", marginBottom: "18px" };
const drawingNotesBox = { border: "1px solid black", padding: "10px", color: "black", marginBottom: "12px", fontSize: "12px" };
const svgBoxLarge = { background: "white", border: "1px solid black" };
const drawingTableStrong = { width: "100%", borderCollapse: "collapse" as const, fontSize: "10px", color: "black" };
const drawingCellStrong = { border: "1px solid black", padding: "5px", textAlign: "left" as const, verticalAlign: "top" as const };
const titleBlockLarge = { marginTop: "20px", border: "2px solid black", display: "grid", gridTemplateColumns: "repeat(6, 1fr)", color: "black", fontSize: "12px" };
const anglePresetGrid = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginTop: "8px" };
const anglePresetButton = { background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155", borderRadius: "6px", padding: "9px 8px", cursor: "pointer", fontWeight: 800 };
const anglePresetActive = { ...anglePresetButton, background: "linear-gradient(135deg, #0f766e, #0284c7)", border: "1px solid #7dd3fc", color: "white" };
const titleCell = { border: "1px solid black", padding: "8px" };
const wideTitleCell = { border: "1px solid black", padding: "8px", gridColumn: "span 3" };
