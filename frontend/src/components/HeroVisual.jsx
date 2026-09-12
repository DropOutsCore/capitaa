import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

// The single 3D "moment" in the site: a glass security shield with a glowing
// checkmark -the same mark as the logo. It slowly rotates, floats, and tilts
// toward the cursor. On-theme for a product whose whole job is protecting money.

// Heraldic shield outline: flat top, straight sides, curving to a point.
function useShieldGeometry() {
  return useMemo(() => {
    const w = 1.15;
    const top = 1.35;
    const bottom = -1.7;

    const shape = new THREE.Shape();
    shape.moveTo(-w, top);
    shape.lineTo(w, top);
    shape.lineTo(w, 0.05);
    shape.quadraticCurveTo(w, bottom + 0.65, 0, bottom);
    shape.quadraticCurveTo(-w, bottom + 0.65, -w, 0.05);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.42,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.1,
      bevelSegments: 6,
      curveSegments: 24,
    });
    geo.center();
    return geo;
  }, []);
}

// A checkmark built as a tube so it reads crisply and can glow.
function useCheckGeometry() {
  return useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.42, 0.02, 0),
      new THREE.Vector3(-0.1, -0.32, 0),
      new THREE.Vector3(0.5, 0.42, 0),
    ]);
    return new THREE.TubeGeometry(curve, 40, 0.075, 12, false);
  }, []);
}

function Shield() {
  const group = useRef();
  const shieldGeo = useShieldGeometry();
  const checkGeo = useCheckGeometry();

  useFrame((state, delta) => {
    if (!group.current) return;
    // slow constant spin...
    group.current.rotation.y += delta * 0.35;
    // ...plus an eased tilt toward the pointer for perspective parallax.
    const px = state.pointer.x * 0.4;
    const py = state.pointer.y * 0.3;
    group.current.rotation.x += (py - group.current.rotation.x) * 0.05;
    group.current.rotation.z += (-px * 0.5 - group.current.rotation.z) * 0.05;
  });

  return (
    <Float speed={1.3} rotationIntensity={0.35} floatIntensity={0.8}>
      <group ref={group} scale={0.8}>
        {/* Glass shield body */}
        <mesh geometry={shieldGeo}>
          <meshStandardMaterial
            color="#4a74e6"
            emissive="#22398a"
            emissiveIntensity={0.55}
            metalness={0.45}
            roughness={0.22}
            transparent
            opacity={0.95}
          />
        </mesh>

        {/* Faint wireframe shell for the engineered-glass read */}
        <mesh geometry={shieldGeo} scale={1.06}>
          <meshBasicMaterial color="#8fbaff" wireframe transparent opacity={0.14} />
        </mesh>

        {/* Glowing checkmark sitting just in front of the shield face */}
        <mesh geometry={checkGeo} position={[0, 0.05, 0.42]}>
          <meshStandardMaterial
            color="#eaf2ff"
            emissive="#8fbaff"
            emissiveIntensity={2.2}
            metalness={0.2}
            roughness={0.3}
            toneMapped={false}
          />
        </mesh>
      </group>
    </Float>
  );
}

export default function HeroVisual() {
  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 0, 6.4], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[4, 4, 4]} intensity={2.6} color="#8fbaff" />
      <pointLight position={[-5, -2, -3]} intensity={2.0} color="#c9b8ff" />
      <pointLight position={[0, -4, 3]} intensity={1.4} color="#6ea8ff" />
      <Suspense fallback={null}>
        <Shield />
      </Suspense>
    </Canvas>
  );
}
