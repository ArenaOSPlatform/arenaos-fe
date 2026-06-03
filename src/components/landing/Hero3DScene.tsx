import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Points, PointMaterial, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Group, Points as ThreePoints } from "three";
import * as THREE from "three";

const SCENE = {
  particles: 420,
  particleRadius: 7,
  cameraPosition: [0, 0, 7] as [number, number, number],
} as const;

function createSeededRandom(seed: number) {
  let value = seed;

  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);

    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function ParticleField() {
  const positions = useMemo(() => {
    const points = new Float32Array(SCENE.particles * 3);
    const random = createSeededRandom(42);

    for (let i = 0; i < SCENE.particles; i += 1) {
      const index = i * 3;
      const radius = SCENE.particleRadius * Math.cbrt(random());
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);

      points[index] = radius * Math.sin(phi) * Math.cos(theta);
      points[index + 1] = radius * Math.sin(phi) * Math.sin(theta);
      points[index + 2] = radius * Math.cos(phi);
    }

    return points;
  }, []);

  const ref = useRef<ThreePoints>(null);

  useFrame((_, delta) => {
    if (!ref.current) return;

    ref.current.rotation.y += delta * 0.035;
    ref.current.rotation.x += delta * 0.012;
  });

  return (
    <Points ref={ref} positions={positions} stride={3}>
      <PointMaterial
        transparent
        color="#67e8f9"
        size={0.028}
        sizeAttenuation
        depthWrite={false}
        opacity={0.7}
      />
    </Points>
  );
}

function EnergyRing({
  rotation,
  color,
  scale = 1,
}: {
  rotation: [number, number, number];
  color: string;
  scale?: number;
}) {
  const ref = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!ref.current) return;

    ref.current.rotation.z += delta * 0.18;
  });

  return (
    <group ref={ref} rotation={rotation} scale={scale}>
      <mesh>
        <torusGeometry args={[2.15, 0.018, 16, 160]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.8}
          roughness={0.25}
          metalness={0.7}
        />
      </mesh>

      <mesh>
        <torusGeometry args={[2.55, 0.006, 12, 160]} />
        <meshBasicMaterial color={color} transparent opacity={0.32} />
      </mesh>
    </group>
  );
}

function ArenaCore() {
  const ref = useRef<Group>(null);

  useFrame((state, delta) => {
    if (!ref.current) return;

    ref.current.rotation.y += delta * 0.22;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.35) * 0.12;
  });

  return (
    <Float speed={1.8} rotationIntensity={0.45} floatIntensity={0.8}>
      <group ref={ref}>
        <mesh>
          <icosahedronGeometry args={[1.15, 2]} />
          <meshPhysicalMaterial
            color="#0f172a"
            emissive="#22d3ee"
            emissiveIntensity={0.75}
            roughness={0.16}
            metalness={0.55}
            transmission={0.2}
            thickness={0.75}
            clearcoat={1}
            clearcoatRoughness={0.12}
          />
        </mesh>

        <mesh scale={1.04}>
          <icosahedronGeometry args={[1.15, 1]} />
          <meshBasicMaterial
            color="#67e8f9"
            wireframe
            transparent
            opacity={0.22}
          />
        </mesh>

        <mesh scale={1.28}>
          <sphereGeometry args={[1, 48, 48]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.055} />
        </mesh>
      </group>
    </Float>
  );
}

function FloatingShard({
  position,
  rotation,
  scale,
  color,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  color: string;
}) {
  const ref = useRef<Group>(null);

  useFrame((state, delta) => {
    if (!ref.current) return;

    ref.current.rotation.x += delta * 0.18;
    ref.current.rotation.y += delta * 0.14;
    ref.current.position.y =
      position[1] +
      Math.sin(state.clock.elapsedTime * 0.9 + position[0]) * 0.08;
  });

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <mesh>
        <tetrahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.9}
          roughness={0.28}
          metalness={0.55}
          transparent
          opacity={0.82}
        />
      </mesh>
    </group>
  );
}

function FloatingShards() {
  const shards = useMemo(
    () => [
      {
        position: [-3.1, 1.4, -0.8],
        rotation: [0.4, 0.2, 0.8],
        scale: 0.22,
        color: "#22d3ee",
      },
      {
        position: [3.2, 1.1, -1.1],
        rotation: [0.2, 0.9, 0.1],
        scale: 0.28,
        color: "#8b5cf6",
      },
      {
        position: [-2.5, -1.2, -0.4],
        rotation: [0.8, 0.1, 0.4],
        scale: 0.18,
        color: "#67e8f9",
      },
      {
        position: [2.6, -1.4, -0.6],
        rotation: [0.1, 0.7, 0.9],
        scale: 0.2,
        color: "#a78bfa",
      },
      {
        position: [0.2, 2.5, -1.2],
        rotation: [0.5, 0.3, 0.2],
        scale: 0.16,
        color: "#22d3ee",
      },
    ],
    [],
  );

  return (
    <>
      {shards.map((shard) => (
        <FloatingShard
          key={`${shard.position.join("-")}-${shard.color}`}
          position={shard.position as [number, number, number]}
          rotation={shard.rotation as [number, number, number]}
          scale={shard.scale}
          color={shard.color}
        />
      ))}
    </>
  );
}

function MouseRig() {
  useFrame((state) => {
    state.camera.position.x = THREE.MathUtils.lerp(
      state.camera.position.x,
      state.pointer.x * 0.45,
      0.035,
    );

    state.camera.position.y = THREE.MathUtils.lerp(
      state.camera.position.y,
      state.pointer.y * 0.25,
      0.035,
    );

    state.camera.lookAt(0, 0, 0);
  });

  return null;
}

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[3.5, 2.5, 4]} intensity={7} color="#22d3ee" />
      <pointLight position={[-4, -2, 3]} intensity={5} color="#8b5cf6" />
      <spotLight
        position={[0, 5, 5]}
        angle={0.45}
        penumbra={0.9}
        intensity={4}
        color="#ffffff"
      />
    </>
  );
}

function ArenaScene() {
  return (
    <>
      <SceneLights />
      <MouseRig />

      <Stars
        radius={40}
        depth={16}
        count={900}
        factor={3}
        saturation={0}
        fade
        speed={0.35}
      />

      <ParticleField />

      <group position={[1.7, 0.05, 0]} rotation={[0.08, -0.35, 0]}>
        <ArenaCore />

        <EnergyRing rotation={[Math.PI / 2.35, 0, 0]} color="#22d3ee" />
        <EnergyRing
          rotation={[Math.PI / 2.6, Math.PI / 3.2, 0]}
          color="#8b5cf6"
          scale={0.92}
        />
        <EnergyRing
          rotation={[Math.PI / 2.1, -Math.PI / 4, 0]}
          color="#67e8f9"
          scale={0.72}
        />

        <FloatingShards />
      </group>
    </>
  );
}

export function Hero3DScene() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 opacity-80"
    >
      <Canvas
        camera={{
          position: SCENE.cameraPosition,
          fov: 45,
          near: 0.1,
          far: 100,
        }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
      >
        <ArenaScene />
      </Canvas>
    </div>
  );
}
