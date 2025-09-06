"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function GamePage() {
  const [catPosition, setCatPosition] = useState(50); // Position as percentage from top

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowUp":
        case "w":
        case "W":
          setCatPosition(prev => Math.max(0, prev - 5));
          break;
        case "ArrowDown":
        case "s":
        case "S":
          setCatPosition(prev => Math.min(90, prev + 5));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className="h-full w-full relative bg-cover bg-center bg-no-repeat overflow-hidden"
      style={{
        backgroundImage: "url('/game/main-bg.jpg')",
      }}
    >
      {/* Cat on the left side */}
      <div
        className="absolute left-8 transition-all duration-150 ease-out"
        style={{
          top: `${catPosition}%`,
        }}
      >
        <Image src="/cat/cat1.png" alt="Player Cat" width={80} height={80} className="object-contain" />
      </div>

      {/* Game content */}
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-4">Hello World</h1>
          <p className="text-white drop-shadow-lg">Use Arrow Keys or WASD to move the cat up and down!</p>
        </div>
      </div>
    </div>
  );
}
