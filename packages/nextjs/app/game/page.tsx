"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useAccount, usePublicClient } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface Projectile {
  id: number;
  x: number;
  y: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  typeIdx: number;
  image: string;
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

const WAVE_INTERVAL_MS = 3500;

export default function GamePage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const { data: enemyTypesCount } = useScaffoldReadContract({
    contractName: "GameEngine",
    functionName: "enemyTypesCount",
  });

  const { refetch: refetchSession } = useScaffoldReadContract({
    contractName: "GameEngine",
    functionName: "getActiveSession",
    args: [address as `0x${string}`],
    query: { enabled: Boolean(address) },
  });

  const [gameActive, setGameActive] = useState(false);

  const { data: schedule, refetch: refetchSchedule } = useScaffoldReadContract({
    contractName: "GameEngine",
    functionName: "getScheduleFor",
    args: [address as `0x${string}`],
    query: { enabled: Boolean(address) },
  });

  const { writeContractAsync: writeGameAsync } = useScaffoldWriteContract({ contractName: "GameEngine" });

  const [catPosition, setCatPosition] = useState(50);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [nextProjectileId, setNextProjectileId] = useState(0);
  const [keys, setKeys] = useState<{ up?: boolean; down?: boolean }>({});
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [nextEnemyId, setNextEnemyId] = useState(0);
  const [spawnPtr, setSpawnPtr] = useState(0);
  const [counts, setCounts] = useState<number[]>(() => new Array(MEME_IMAGES.length).fill(0));
  const [submitting, setSubmitting] = useState(false);

  const projectilesRef = useRef<Projectile[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);

  const totalScheduled = useMemo(() => (Array.isArray(schedule) ? schedule.length : 0), [schedule]);
  const totalKilled = useMemo(() => counts.reduce((a, b) => a + b, 0), [counts]);
  const wavesTotal = 30;
  const waveSize = 5;
  const currentWave = useMemo(() => Math.min(wavesTotal, Math.floor(spawnPtr / waveSize)), [spawnPtr]);
  const progressPct = useMemo(
    () => (totalScheduled > 0 ? Math.min(100, Math.floor((totalKilled / totalScheduled) * 100)) : 0),
    [totalKilled, totalScheduled],
  );

  const shoot = useCallback(() => {
    setProjectiles(prev => [
      ...prev,
      {
        id: nextProjectileId,
        x: 100,
        y: (catPosition / 100) * window.innerHeight - 50,
      },
    ]);
    setNextProjectileId(prev => prev + 1);
  }, [catPosition, nextProjectileId]);

  const spawnWave = useCallback(() => {
    if (!Array.isArray(schedule) || schedule.length === 0) return;
    const rows = 5;
    const screenHeight = window.innerHeight;
    const rowHeight = screenHeight / rows;

    const newEnemies: Enemy[] = [];
    for (let row = 0; row < rows; row++) {
      const idx = spawnPtr + row;
      if (idx >= schedule.length) break;
      const typeIdx = Number(schedule[idx]);
      const image = MEME_IMAGES[typeIdx % MEME_IMAGES.length];
      newEnemies.push({
        id: nextEnemyId + row,
        x: window.innerWidth + 50,
        y: row * rowHeight + rowHeight / 2 - 40,
        typeIdx,
        image,
      });
    }
    if (newEnemies.length > 0) {
      setEnemies(prev => [...prev, ...newEnemies]);
      setNextEnemyId(prev => prev + newEnemies.length);
      setSpawnPtr(prev => prev + newEnemies.length);
    }
  }, [nextEnemyId, schedule, spawnPtr]);

  const startGame = useCallback(async () => {
    if (!address) return;
    setCounts(new Array(MEME_IMAGES.length).fill(0));
    setEnemies([]);
    setProjectiles([]);
    setNextProjectileId(0);
    setNextEnemyId(0);
    setSpawnPtr(0);
    setGameActive(false);
    const txHash = await writeGameAsync({ functionName: "startGame" });
    if (!publicClient || !txHash) {
      // Unable to confirm tx; bail out early
      setGameActive(true);
      return;
    }
    try {
      // Ensure tx is mined before reading
      await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
    } catch {}
    // Wait for session to report active
    try {
      for (let i = 0; i < 12; i++) {
        const res = await refetchSession();
        const tuple = res.data as unknown as [string, bigint, bigint, boolean] | undefined;
        if (Array.isArray(tuple) && tuple[3]) break;
        await new Promise(r => setTimeout(r, 300));
      }
    } catch {}
    // Wait for schedule to be available to avoid race conditions
    try {
      for (let i = 0; i < 12; i++) {
        const res = await refetchSchedule();
        const arr = res.data as unknown as number[] | undefined;
        if (Array.isArray(arr) && arr.length > 0) break;
        await new Promise(r => setTimeout(r, 500));
      }
    } catch {}
    setGameActive(true);
    // Kick off first wave immediately if schedule already loaded
    try {
      const res = await refetchSchedule();
      const arr = res.data as unknown as number[] | undefined;
      if (Array.isArray(arr) && arr.length > 0) {
        spawnWave();
      }
    } catch {}
  }, [address, publicClient, refetchSchedule, refetchSession, spawnWave, writeGameAsync]);

  const submit = useCallback(async () => {
    if (!address) return;
    if (!Array.isArray(schedule) || schedule.length === 0) return;
    setSubmitting(true);
    try {
      const len = enemyTypesCount ? Number(enemyTypesCount) : MEME_IMAGES.length;
      const arr = new Array(len).fill(0).map((_, i) => Number(counts[i] || 0));
      await writeGameAsync({ functionName: "submitResults", args: [arr] });
      setGameActive(false);
    } finally {
      setSubmitting(false);
    }
  }, [address, counts, enemyTypesCount, schedule, writeGameAsync]);

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
        case " ":
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

  useEffect(() => {
    const gameLoop = setInterval(() => {
      setCatPosition(prev => {
        let np = prev;
        if (keys.up) np = Math.max(0, np - 1);
        if (keys.down) np = Math.min(90, np + 1);
        return np;
      });
    }, 16);
    return () => clearInterval(gameLoop);
  }, [keys]);

  useEffect(() => {
    if (!gameActive || !Array.isArray(schedule) || schedule.length === 0) return;
    const timer = setInterval(() => {
      spawnWave();
    }, WAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [gameActive, schedule, spawnWave]);

  // Spawn the very first wave immediately when schedule arrives
  useEffect(() => {
    if (gameActive && Array.isArray(schedule) && schedule.length > 0 && spawnPtr === 0) {
      spawnWave();
    }
  }, [gameActive, schedule, spawnPtr, spawnWave]);

  useEffect(() => {
    let animationId: number;
    const animate = () => {
      setProjectiles(prev => {
        const moved = prev.map(p => ({ ...p, x: p.x + 3 })).filter(p => p.x < window.innerWidth + 50);
        projectilesRef.current = moved;
        return moved;
      });

      setEnemies(prev => {
        const movedEnemies = prev.map(e => ({ ...e, x: e.x - 2 })).filter(e => e.x > -100);

        enemiesRef.current = movedEnemies;

        const hitProjectileIds = new Set<number>();
        const hitEnemyIds = new Set<number>();

        projectilesRef.current.forEach(projectile => {
          movedEnemies.forEach(enemy => {
            const projectileLeft = projectile.x;
            const projectileRight = projectile.x + 100;
            const projectileTop = projectile.y;
            const projectileBottom = projectile.y + 100;

            const enemyLeft = enemy.x;
            const enemyRight = enemy.x + 80;
            const enemyTop = enemy.y;
            const enemyBottom = enemy.y + 80;

            if (
              projectileLeft < enemyRight &&
              projectileRight > enemyLeft &&
              projectileTop < enemyBottom &&
              projectileBottom > enemyTop
            ) {
              hitProjectileIds.add(projectile.id);
              hitEnemyIds.add(enemy.id);
              setCounts(prev => {
                const next = [...prev];
                const idx = enemy.typeIdx % next.length;
                next[idx] = (next[idx] || 0) + 1;
                return next;
              });
            }
          });
        });

        if (hitProjectileIds.size > 0) {
          setProjectiles(prevProjectiles => prevProjectiles.filter(p => !hitProjectileIds.has(p.id)));
        }
        return movedEnemies.filter(e => !hitEnemyIds.has(e.id));
      });

      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const canSubmit = useMemo(() => {
    if (!gameActive) return false;
    if (!Array.isArray(schedule) || schedule.length === 0) return false;
    const allSpawned = spawnPtr >= schedule.length;
    const noEnemiesOnScreen = enemies.length === 0;
    return allSpawned && noEnemiesOnScreen;
  }, [enemies.length, gameActive, schedule, spawnPtr]);

  return (
    <div
      className="h-full w-full relative bg-cover bg-center bg-no-repeat overflow-hidden"
      style={{ backgroundImage: "url('/game/main-bg.jpg')" }}
    >
      {/* Top HUD */}
      <div className="absolute top-2 left-2 right-2 flex items-center gap-4 z-20">
        <button
          className="px-3 py-1 rounded bg-blue-500 text-white disabled:opacity-50"
          onClick={startGame}
          disabled={!address || submitting}
        >
          {address ? "Start Game" : "Connect Wallet"}
        </button>
        <div className="flex-1">
          <div className="h-2 bg-gray-700 rounded">
            <div className="h-2 bg-green-500 rounded" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="text-white text-xs mt-1">
            Wave {currentWave}/{wavesTotal} • Kills {totalKilled}/{totalScheduled || 150}
          </div>
        </div>
        <button
          className="px-3 py-1 rounded bg-emerald-500 text-white disabled:opacity-50"
          onClick={submit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? "Submitting..." : "Submit Results"}
        </button>
      </div>

      {/* Per-enemy counters */}
      <div className="absolute top-14 left-2 bg-black/50 p-2 rounded text-white z-20 text-xs space-y-1">
        <div className="opacity-70">
          Schedule: {totalScheduled} • Spawned: {spawnPtr}
        </div>
        {MEME_IMAGES.map((img, i) => (
          <div key={img} className="flex items-center gap-2">
            <Image src={`/game/memes/${img}`} alt={img} width={20} height={20} className="object-contain" />
            <span>x {counts[i] || 0}</span>
          </div>
        ))}
      </div>

      {/* Cat */}
      <div className="absolute left-8" style={{ top: `${catPosition}%` }}>
        <Image src="/cat/cat1.png" alt="Player Cat" width={120} height={120} className="object-contain" />
      </div>

      {/* Projectiles */}
      {projectiles.map(projectile => (
        <div key={projectile.id} className="absolute" style={{ left: `${projectile.x}px`, top: `${projectile.y}px` }}>
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
        <div key={enemy.id} className="absolute" style={{ left: `${enemy.x}px`, top: `${enemy.y}px` }}>
          <Image
            src={`/game/memes/${enemy.image}`}
            alt="Enemy Meme"
            width={80}
            height={80}
            className="object-contain"
          />
        </div>
      ))}

      {/* Helper text */}
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">Defeat Meme</h1>
          <p className="text-white drop-shadow-lg">Use Arrow Keys or WASD to move! Press SPACE to shoot.</p>
        </div>
      </div>
    </div>
  );
}
