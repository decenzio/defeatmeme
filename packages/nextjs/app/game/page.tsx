"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

interface Projectile {
  id: number;
  x: number; // Position from left in pixels
  y: number; // Position from top in pixels
}

interface Enemy {
  id: number;
  x: number; // Position from left in pixels
  y: number; // Position from top in pixels
  image: string; // Meme image filename
}

const MEME_IMAGES = [
  "babydoge.jpg",
  "bome.webp",
  "bonk.jpg",
  "coingeckoupdate.webp",
  "DOGGOTOTHEMOON.webp",
  "dogwifhat.jpg",
  "MEW.webp",
  "PUDGY_PENGUINS_PENGU_PFP.webp",
  "trolllogo.webp",
];

export default function GamePage() {
  const [catPosition, setCatPosition] = useState(50); // Position as percentage from top
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [nextProjectileId, setNextProjectileId] = useState(0);
  const [keys, setKeys] = useState<{ up?: boolean; down?: boolean }>({});
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [nextEnemyId, setNextEnemyId] = useState(0);
  const projectilesRef = useRef<Projectile[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);

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

  const spawnWave = useCallback(() => {
    const rows = 5;
    const screenHeight = window.innerHeight;
    const rowHeight = screenHeight / rows;

    // Create 5 enemies, one for each row
    const newEnemies: Enemy[] = [];
    for (let row = 0; row < rows; row++) {
      const randomImage = MEME_IMAGES[Math.floor(Math.random() * MEME_IMAGES.length)];
      newEnemies.push({
        id: nextEnemyId + row,
        x: window.innerWidth + 50, // Start off-screen to the right
        y: row * rowHeight + rowHeight / 2 - 40, // Center in each row
        image: randomImage,
      });
    }

    setEnemies(prev => [...prev, ...newEnemies]);
    setNextEnemyId(prev => prev + 5); // Increment by 5 since we added 5 enemies
  }, [nextEnemyId]);

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

  // Enemy wave spawning timer
  useEffect(() => {
    const waveTimer = setInterval(() => {
      spawnWave(); // Spawn 5 enemies (one per row) every interval
    }, 3500); // Every 3.5 seconds

    return () => clearInterval(waveTimer);
  }, [spawnWave]);

  // Animation loop for projectiles and enemies
  useEffect(() => {
    let animationId: number;

    const animate = () => {
      setProjectiles(prev => {
        // Move projectiles
        const movedProjectiles = prev
          .map(projectile => ({
            ...projectile,
            x: projectile.x + 3, // Move 3 pixels to the right each frame
          }))
          .filter(projectile => projectile.x < window.innerWidth + 50);

        projectilesRef.current = movedProjectiles;
        return movedProjectiles;
      });

      setEnemies(prev => {
        // Move enemies
        const movedEnemies = prev
          .map(enemy => ({
            ...enemy,
            x: enemy.x - 2, // Move 2 pixels to the left each frame
          }))
          .filter(enemy => enemy.x > -100);

        enemiesRef.current = movedEnemies;

        // Check for collisions
        const hitProjectileIds = new Set<number>();
        const hitEnemyIds = new Set<number>();

        projectilesRef.current.forEach(projectile => {
          movedEnemies.forEach(enemy => {
            // Simple collision detection (rectangular overlap)
            const projectileLeft = projectile.x;
            const projectileRight = projectile.x + 100; // projectile width
            const projectileTop = projectile.y;
            const projectileBottom = projectile.y + 100; // projectile height

            const enemyLeft = enemy.x;
            const enemyRight = enemy.x + 80; // enemy width
            const enemyTop = enemy.y;
            const enemyBottom = enemy.y + 80; // enemy height

            // Check if rectangles overlap
            if (
              projectileLeft < enemyRight &&
              projectileRight > enemyLeft &&
              projectileTop < enemyBottom &&
              projectileBottom > enemyTop
            ) {
              hitProjectileIds.add(projectile.id);
              hitEnemyIds.add(enemy.id);
            }
          });
        });

        // Remove hit projectiles
        if (hitProjectileIds.size > 0) {
          setProjectiles(prevProjectiles => prevProjectiles.filter(projectile => !hitProjectileIds.has(projectile.id)));
        }

        // Remove hit enemies
        return movedEnemies.filter(enemy => !hitEnemyIds.has(enemy.id));
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
        <Image src="/cat/cat1.png" alt="Player Cat" width={120} height={120} className="object-contain" />
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

      {/* Enemies */}
      {enemies.map(enemy => (
        <div
          key={enemy.id}
          className="absolute"
          style={{
            left: `${enemy.x}px`,
            top: `${enemy.y}px`,
          }}
        >
          <Image
            src={`/game/memes/${enemy.image}`}
            alt="Enemy Meme"
            width={80}
            height={80}
            className="object-contain"
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
