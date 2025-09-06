"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

interface Projectile {
  id: number;
  x: number; // Position from left in pixels
  y: number; // Position from top in pixels
}

export default function GamePage() {
  const [catPosition, setCatPosition] = useState(50); // Position as percentage from top
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [nextProjectileId, setNextProjectileId] = useState(0);
  const [keys, setKeys] = useState<{ up?: boolean; down?: boolean }>({});

  const shoot = useCallback(() => {
    setProjectiles(prev => [
      ...prev,
      {
        id: nextProjectileId,
        x: 100, // Start closer to the cat's head
        y: (catPosition / 100) * window.innerHeight - 50, // Position much higher at cat's head (larger negative offset)
      },
    ]);
    setNextProjectileId(prev => prev + 1);
  }, [catPosition, nextProjectileId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowUp":
        case "w":
        case "W":
          setKeys(prev => ({ ...prev, up: true }));
          break;
        case "ArrowDown":
        case "s":
        case "S":
          setKeys(prev => ({ ...prev, down: true }));
          break;
        case " ": // Space key
          event.preventDefault();
          shoot();
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowUp":
        case "w":
        case "W":
          setKeys(prev => ({ ...prev, up: false }));
          break;
        case "ArrowDown":
        case "s":
        case "S":
          setKeys(prev => ({ ...prev, down: false }));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [shoot]);

  // Smooth movement based on held keys
  useEffect(() => {
    const gameLoop = setInterval(() => {
      setCatPosition(prev => {
        let newPosition = prev;

        if (keys.up) {
          newPosition = Math.max(0, newPosition - 1);
        }
        if (keys.down) {
          newPosition = Math.min(90, newPosition + 1);
        }

        return newPosition;
      });
    }, 16); // ~60fps

    return () => clearInterval(gameLoop);
  }, [keys]);

  // Animation loop for projectiles
  useEffect(() => {
    let animationId: number;

    const animate = () => {
      setProjectiles(prev => {
        const updated = prev
          .map(projectile => ({
            ...projectile,
            x: projectile.x + 3, // Move 3 pixels to the right each frame (slower)
          }))
          .filter(projectile => projectile.x < window.innerWidth + 50); // Remove off-screen projectiles

        return updated;
      });

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
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
        className="absolute left-8"
        style={{
          top: `${catPosition}%`,
        }}
      >
        <Image src="/cat/cat1.png" alt="Player Cat" width={80} height={80} className="object-contain" />
      </div>

      {/* Projectiles */}
      {projectiles.map(projectile => (
        <div
          key={projectile.id}
          className="absolute"
          style={{
            left: `${projectile.x}px`,
            top: `${projectile.y}px`,
          }}
        >
          <Image
            src="/game/shoot.png"
            alt="Projectile"
            width={100}
            height={100}
            className="object-contain"
            style={{ transform: "rotate(90deg)" }}
          />
        </div>
      ))}

      {/* Game content */}
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-4">Hello World</h1>
          <p className="text-white drop-shadow-lg">
            Use Arrow Keys or WASD to move the cat up and down!
            <br />
            Press SPACE to shoot!
          </p>
        </div>
      </div>
    </div>
  );
}
