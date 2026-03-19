'use client';

import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, useAnimations } from '@react-three/drei';
import { AnimationState } from '@/lib/types';
import { Group } from 'three';

interface ModelViewerProps {
  modelUrl: string;
  animationState: AnimationState;
}

interface ModelProps {
  modelUrl: string;
  animationState: AnimationState;
}

function Model({ modelUrl, animationState }: ModelProps) {
  const groupRef = useRef<Group>(null);
  const proxiedModelUrl = `/api/model?url=${encodeURIComponent(modelUrl)}`;
  const { scene, animations } = useGLTF(proxiedModelUrl);
  const { actions, names } = useAnimations(animations, groupRef);

  useEffect(() => {
    if (!actions || names.length === 0) return;

    // Stop all currently playing actions
    Object.values(actions).forEach(action => action?.stop());

    // Try to find the matching animation by name (case-insensitive)
    const matchingName = names.find(
      name => name.toLowerCase() === animationState.toLowerCase()
    );

    if (matchingName && actions[matchingName]) {
      actions[matchingName]!.reset().fadeIn(0.3).play();
    } else if (names.length > 0) {
      // Fallback: play the first available animation
      const fallbackName = names[0];
      actions[fallbackName]?.reset().fadeIn(0.3).play();
    }

    return () => {
      Object.values(actions).forEach(action => action?.fadeOut(0.3));
    };
  }, [animationState, actions, names]);

  return <primitive ref={groupRef} object={scene} />;
}

function LoadingSpinner() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-orange-50 to-pink-50 rounded-2xl">
      <svg
        className="animate-spin h-10 w-10 text-orange-400 mb-3"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      <p className="text-orange-500 text-sm font-medium">加载3D模型中...</p>
    </div>
  );
}

export default function ModelViewer({ modelUrl, animationState }: ModelViewerProps) {
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-gradient-to-b from-orange-50 to-pink-50">
      <Suspense fallback={<LoadingSpinner />}>
        <Canvas
          camera={{ position: [0, 1, 3], fov: 45 }}
          style={{ width: '100%', height: '100%' }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <Environment preset="sunset" />
          <Model modelUrl={modelUrl} animationState={animationState} />
          <OrbitControls
            enablePan={false}
            minDistance={1}
            maxDistance={6}
            target={[0, 0.5, 0]}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
