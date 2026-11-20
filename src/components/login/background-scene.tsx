"use client";

import React from "react";
import Image from "next/image";

export function BackgroundScene() {
  return (
    <div className="fixed inset-0 -z-10 select-none overflow-hidden pointer-events-none">
      {/* Layer 1: Photo with Adaptive Light/Dark Filter */}
      <div className="absolute inset-0">
        <Image
          src="/images/hostel-bg.jpg"
          alt="DMI Boys Hostel Campus"
          fill
          priority
          sizes="100vw"
          quality={95}
          className="object-cover object-center transition-all duration-300 filter photo-filter"
        />
      </div>

      {/* Layer 2: Main Elliptical Vintage Vignette (Bright Center, Deep Navy Corners) */}
      <div className="absolute inset-0 vignette transition-all duration-300" />

      {/* Layer 3: Soft Vintage Corner Tint (Stacked Quad-Corner Radials) */}
      <div className="absolute inset-0 vignette-corners transition-all duration-300" />

      {/* Layer 4: Localized Left Scrim for Text Readability Only (Center & Right Remain Clear) */}
      <div className="absolute inset-0 text-scrim-left transition-all duration-300" />

      {/* Layer 5: Film Grain Texture (feTurbulence SVG, static, opacity 0.06) */}
      <div className="absolute inset-0 film-grain" aria-hidden="true" />
    </div>
  );
}
