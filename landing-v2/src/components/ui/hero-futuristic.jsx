'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

/* ── Animated Torus Knot (centerpiece) ── */
const TorusKnot = () => {
  const meshRef = useRef(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = clock.getElapsedTime() * 0.15;
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.1;
    }
  });

  return (
    <mesh ref={meshRef}>
      <torusKnotGeometry args={[1.8, 0.5, 128, 32]} />
      <meshStandardMaterial
        color="#818cf8"
        metalness={0.9}
        roughness={0.15}
        wireframe
        transparent
        opacity={0.5}
      />
    </mesh>
  );
};

/* ── Inner solid glow ── */
const InnerGlow = () => {
  const meshRef = useRef(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = clock.getElapsedTime() * 0.15;
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.1;
      const s = 0.95 + Math.sin(clock.getElapsedTime() * 0.8) * 0.05;
      meshRef.current.scale.set(s, s, s);
    }
  });

  return (
    <mesh ref={meshRef}>
      <torusKnotGeometry args={[1.8, 0.5, 128, 32]} />
      <meshStandardMaterial
        color="#6366f1"
        emissive="#6366f1"
        emissiveIntensity={0.5}
        metalness={0.8}
        roughness={0.2}
        transparent
        opacity={0.2}
      />
    </mesh>
  );
};

/* ── Particle Field ── */
const ParticleField = () => {
  const count = 500;
  const meshRef = useRef(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;

      const t = Math.random();
      colors[i * 3] = 0.39 * t + 0.55 * (1 - t);
      colors[i * 3 + 1] = 0.4 * t + 0.35 * (1 - t);
      colors[i * 3 + 2] = 0.95 * t + 0.97 * (1 - t);
    }
    return { pos, colors };
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.015;
      meshRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.008) * 0.05;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions.pos}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={positions.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={0.7}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

/* ── Grid Floor ── */
const GridFloor = () => {
  const gridRef = useRef(null);

  useFrame(({ clock }) => {
    if (gridRef.current) {
      gridRef.current.position.y = -4 + Math.sin(clock.getElapsedTime() * 0.3) * 0.15;
    }
  });

  return (
    <mesh ref={gridRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, -2]}>
      <planeGeometry args={[40, 40, 40, 40]} />
      <meshBasicMaterial
        color="#818cf8"
        wireframe
        transparent
        opacity={0.08}
      />
    </mesh>
  );
};

/* ── Orbit Rings ── */
const OrbitRing = ({ radius, color, speed, tilt, opacity = 0.3 }) => {
  const ref = useRef(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.getElapsedTime() * speed;
    }
  });

  return (
    <mesh ref={ref} rotation={[tilt, 0, 0]}>
      <torusGeometry args={[radius, 0.008, 8, 120]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} />
    </mesh>
  );
};

/* ── Floating Hexagons ── */
const FloatingHex = ({ position, speed, scale }) => {
  const ref = useRef(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.getElapsedTime() * speed;
      ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * speed * 2) * 0.3;
    }
  });

  return (
    <mesh ref={ref} position={position} scale={scale}>
      <ringGeometry args={[0.3, 0.35, 6]} />
      <meshBasicMaterial color="#a78bfa" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
    </mesh>
  );
};

/* ── Central Sphere Pulse ── */
const PulseSphere = () => {
  const ref = useRef(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 0.5 + Math.sin(clock.getElapsedTime() * 1.5) * 0.1;
      ref.current.scale.set(s, s, s);
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        color="#6366f1"
        transparent
        opacity={0.08}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

const HeroScene = () => {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={2} color="#8b5cf6" />
      <pointLight position={[-5, -3, 5]} intensity={1} color="#6366f1" />
      <pointLight position={[0, 0, -5]} intensity={0.8} color="#a78bfa" />

      <PulseSphere />
      <TorusKnot />
      <InnerGlow />
      <ParticleField />
      <GridFloor />
      <OrbitRing radius={3.5} color="#6366f1" speed={0.08} tilt={0.3} />
      <OrbitRing radius={5} color="#8b5cf6" speed={-0.06} tilt={-0.5} opacity={0.25} />
      <OrbitRing radius={6.5} color="#a78bfa" speed={0.04} tilt={0.8} opacity={0.2} />
      <FloatingHex position={[-3, 2, -2]} speed={0.3} scale={1.5} />
      <FloatingHex position={[4, -1.5, -3]} speed={-0.2} scale={2} />
      <FloatingHex position={[-2, -3, -1]} speed={0.25} scale={1} />
      <FloatingHex position={[3, 3, -4]} speed={-0.35} scale={1.2} />
    </>
  );
};

export const HeroFuturistic = () => {
  const titleWords = 'SmartChat X'.split(' ');
  const subtitle = 'AI-powered communication at the speed of thought.';
  const [visibleWords, setVisibleWords] = useState(0);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [delays, setDelays] = useState([]);
  const [subtitleDelay, setSubtitleDelay] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDelays(titleWords.map(() => Math.random() * 0.07));
    setSubtitleDelay(Math.random() * 0.1);
  }, [titleWords.length]);

  useEffect(() => {
    if (!mounted) return;
    if (visibleWords < titleWords.length) {
      const timeout = setTimeout(() => setVisibleWords(visibleWords + 1), 600);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => setSubtitleVisible(true), 800);
      return () => clearTimeout(timeout);
    }
  }, [visibleWords, titleWords.length, mounted]);

  return (
    <section className="relative w-full" style={{ minHeight: '100vh', background: '#000' }}>
      {/* 3D Canvas Container */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Canvas
          camera={{ position: [0, 0, 8], fov: 60 }}
          style={{ width: '100%', height: '100%', display: 'block' }}
          gl={{
            antialias: true,
            alpha: false,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
        >
          <color attach="background" args={['#000000']} />
          <HeroScene />
        </Canvas>
      </div>

      {/* Overlay Content */}
      <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', pointerEvents: 'none' }}>
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', marginBottom: '40px', borderRadius: '9999px',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
            animation: 'fadeInDown 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff', boxShadow: '0 0 8px #fff', display: 'inline-block' }} />
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.01em' }}>
            Now in beta — <span style={{ color: '#fff', fontWeight: 600 }}>Join 500+ early builders</span>
          </span>
        </div>

        {/* Title */}
        <div style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 800, marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: 'clamp(12px, 2vw, 24px)', overflow: 'hidden', color: '#fff' }}>
            {titleWords.map((word, index) => (
              <div
                key={index}
                style={{
                  opacity: index < visibleWords ? 1 : 0,
                  transform: index < visibleWords ? 'translateY(0)' : 'translateY(30px)',
                  transitionDelay: `${index * 0.13 + (delays[index] || 0)}s`,
                  textShadow: '0 0 30px rgba(99, 102, 241, 0.5)',
                  transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {word}
              </div>
            ))}
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 'clamp(14px, 2vw, 24px)', color: 'rgba(255,255,255,0.8)', fontWeight: 500, maxWidth: '640px', textAlign: 'center', marginBottom: '40px',
            opacity: subtitleVisible ? 1 : 0,
            transform: subtitleVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.7s ease',
            transitionDelay: `${titleWords.length * 0.13 + 0.2 + subtitleDelay}s`,
          }}
        >
          {subtitle}
        </div>

        {/* CTA Buttons */}
        <div
          style={{
            display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', pointerEvents: 'auto',
            opacity: subtitleVisible ? 1 : 0,
            transition: 'opacity 0.7s ease',
            transitionDelay: `${titleWords.length * 0.13 + 0.5}s`,
          }}
        >
          <button
            onClick={() => window.open('https://smartx.alokkumarsahu.in', '_blank')}
            style={{
              padding: '12px 32px', borderRadius: '9999px', fontWeight: 600, fontSize: '14px', color: '#000',
              background: 'linear-gradient(135deg, #fff, rgba(255,255,255,0.9))',
              boxShadow: '0 0 25px rgba(255, 255, 255, 0.3)',
              border: 'none', cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Launch App →
          </button>
          <button
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              padding: '12px 32px', borderRadius: '9999px', fontWeight: 500, fontSize: '14px', color: '#fff',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          >
            Explore Features
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        style={{
          position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
          color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 500, letterSpacing: '0.1em',
          opacity: subtitleVisible ? 1 : 0,
          transition: 'opacity 0.7s ease',
          transitionDelay: '2s',
        }}
      >
        <span>SCROLL TO EXPLORE</span>
        <div style={{ width: '20px', height: '32px', borderRadius: '9999px', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4px' }}>
          <div
            style={{
              width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.7)',
              animation: 'scrollDot 1.5s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      {/* Gradient overlays */}
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '128px', zIndex: 5, pointerEvents: 'none',
          background: 'linear-gradient(to top, #000, transparent)',
        }}
      />
    </section>
  );
};

export default HeroFuturistic;
