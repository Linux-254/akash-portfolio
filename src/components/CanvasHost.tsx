"use client";

import { useEffect, useRef } from "react";
import { Engine } from "@/engine/Engine";
import { useApp } from "./AppContext";

export function CanvasHost() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const { engineRef } = useApp();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const engine = new Engine();
    host.appendChild(engine.domElement);
    engineRef.current = engine;

    const onPointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      engine.setPointer(nx, ny);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      engine.dispose();
      engineRef.current = null;
    };
  }, [engineRef]);

  return <div ref={hostRef} className="engine-host" aria-hidden="true" />;
}
