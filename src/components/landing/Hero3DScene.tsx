import { Canvas } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";

function FloatingSphere() {
  return (
    <Float speed={3} rotationIntensity={2} floatIntensity={2}>
      <mesh>
        <icosahedronGeometry args={[2, 1]} />
        <meshStandardMaterial
          color="#7c3aed"
          emissive="#7c3aed"
          emissiveIntensity={2}
          wireframe
        />
      </mesh>
    </Float>
  );
}

export function Hero3DScene() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 opacity-70">
      <Canvas camera={{ position: [0, 0, 6] }}>
        <ambientLight intensity={1.5} />

        <directionalLight position={[3, 3, 3]} intensity={3} />

        <FloatingSphere />

        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2} />
      </Canvas>
    </div>
  );
}
