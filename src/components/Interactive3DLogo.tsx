import React, { useCallback, useRef, useState } from "react";
import "@google/model-viewer";

const Interactive3DLogo: React.FC<{ className?: string }> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  // Mouse tracking
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Set CSS custom properties for parallax
    const mx = ((x / rect.width) - 0.5) * 2; // -1 to 1
    const my = ((y / rect.height) - 0.5) * 2;
    containerRef.current?.style.setProperty("--mx", `${mx * 12}px`);
    containerRef.current?.style.setProperty("--my", `${my * 8}px`);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    containerRef.current?.style.setProperty("--mx", "0px");
    containerRef.current?.style.setProperty("--my", "0px");
  }, []);

  return (
    <div
      ref={containerRef}
      className={`i3d-container ${hovered ? "i3d-hovered" : ""} ${className ?? ""}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{ "--mx": "0px", "--my": "0px" } as React.CSSProperties}
    >
      {/* Ambient grid background */}
      <div className="i3d-grid" />

      {/* Data streams */}
      {[
        { left: "12%", height: 70, duration: "3.5s", delay: "0s" },
        { left: "30%", height: 90, duration: "4s", delay: "1.2s" },
        { left: "70%", height: 60, duration: "3s", delay: "0.6s" },
        { left: "88%", height: 80, duration: "4.5s", delay: "2s" },
      ].map((s, i) => (
        <div
          key={i}
          className="i3d-stream"
          style={{
            left: s.left,
            height: `${s.height}px`,
            animationDuration: s.duration,
            animationDelay: s.delay,
          }}
        />
      ))}

      {/* Glow base */}
      <div className="i3d-glow-base" />

      {/* Orbit rings */}
      <div className="i3d-orbit-a" />
      <div className="i3d-orbit-b" />

      {/* 3D Model with parallax */}
      <div className="i3d-model-wrapper">
        {/* @ts-expect-error model-viewer is a web component */}
        <model-viewer
          src="/logo3d.glb"
          environment-image="/logo3d-env.hdr"
          auto-rotate
          auto-rotate-delay="0"
          rotation-per-second="30deg"
          interaction-prompt="none"
          disable-zoom
          tone-mapping="neutral"
          shadow-intensity="0"
          exposure="1.2"
          loading="eager"
          reveal="auto"
          camera-orbit="0deg 75deg 105%"
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "transparent",
            "--poster-color": "transparent",
            "--progress-bar-color": "transparent",
            "--progress-bar-height": "0px",
            pointerEvents: "none",
          } as React.CSSProperties}
        />
      </div>

      {/* Portal glow under logo */}
      <div className="i3d-portal" />
    </div>
  );
};

export default Interactive3DLogo;
