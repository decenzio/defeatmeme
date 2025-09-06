"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { encodeFunctionData } from "viem";
import { useAccount, usePublicClient, useSignTypedData } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const BettingCard = dynamic(() => import("~~/components/custom/BettingCard"), {
  ssr: false,
  loading: () => <div className="py-8 px-4">Loading...</div>,
});

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
const SHOOT_COOLDOWN_MS = 250;
const MAX_ACTIVE_PROJECTILES = 8;

// --- Chain/Contracts setup (typed, no .default) ---
const RAW_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337);
type DeployedContracts = typeof deployedContracts;
type DeployedChainId = keyof DeployedContracts;
const CHAIN_ID = (RAW_CHAIN_ID in deployedContracts ? RAW_CHAIN_ID : 31337) as DeployedChainId;
const CHAIN_ID_NUM = Number(CHAIN_ID);
const gameEngine = deployedContracts[CHAIN_ID].GameEngine;

export default function GamePage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { signTypedDataAsync } = useSignTypedData();

  const { data: enemyTypesCount } = useScaffoldReadContract({
    contractName: "GameEngine",
    functionName: "enemyTypesCount",
    watch: false,
  });

  const { refetch: refetchSession } = useScaffoldReadContract({
    contractName: "GameEngine",
    functionName: "getActiveSession",
    args: [address as `0x${string}`],
    query: { enabled: Boolean(address) },
    watch: false,
  });

  const [gameActive, setGameActive] = useState(false);

  const { data: schedule, refetch: refetchSchedule } = useScaffoldReadContract({
    contractName: "GameEngine",
    functionName: "getScheduleFor",
    args: [address as `0x${string}`],
    query: { enabled: Boolean(address) },
    watch: false,
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
  const killedEnemyIdsRef = useRef<Set<number>>(new Set());
  const frameIndexRef = useRef(0);
  const lastShotAtRef = useRef<number>(0);

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
    const now = Date.now();
    if (now - lastShotAtRef.current < SHOOT_COOLDOWN_MS) return;
    if (projectilesRef.current.length >= MAX_ACTIVE_PROJECTILES) return;
    lastShotAtRef.current = now;
    const newProjectile = {
      id: nextProjectileId,
      x: 100,
      y: (catPosition / 100) * window.innerHeight + 40,
    };
    setProjectiles(prev => [...prev, newProjectile]);
    // Keep ref in sync to avoid waiting for commit frame
    projectilesRef.current = [...projectilesRef.current, newProjectile];
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
      const typeIdx = Number(schedule[idx] as any);
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
      // Keep ref in sync to avoid waiting for commit frame
      enemiesRef.current = [...enemiesRef.current, ...newEnemies];
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
    killedEnemyIdsRef.current.clear();
    lastShotAtRef.current = 0;
    // Reset in-memory refs and cat position to avoid stale state
    projectilesRef.current = [];
    enemiesRef.current = [];
    setCatPosition(50);
    setGameActive(false);

    // Prepare meta-tx for startGame()
    try {
      const data = encodeFunctionData({
        abi: gameEngine.abi as any,
        functionName: "startGame",
        args: [],
      });
      const engine = gameEngine.address as `0x${string}`;

      // fetch forwarder and nonce
      const fw = await fetch(`/api/relay/forwarder?chainId=${CHAIN_ID_NUM}`);
      const { address: forwarder } = await fw.json();
      if (!forwarder) throw new Error("Forwarder not found");
      const nonce = await publicClient!.readContract({
        address: forwarder as `0x${string}`,
        abi: [
          {
            inputs: [{ name: "from", type: "address" }],
            name: "getNonce",
            outputs: [{ name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        ] as const,
        functionName: "getNonce",
        args: [address as `0x${string}`],
      });

      const req = {
        from: address as `0x${string}`,
        to: engine,
        value: 0n,
        gas: 500_000n,
        nonce: nonce as bigint,
        data: data as `0x${string}`,
      } as const;

      const domain = {
        name: "MinimalForwarder",
        version: "0.0.1",
        chainId: BigInt(CHAIN_ID_NUM),
        verifyingContract: forwarder as `0x${string}`,
      } as const;
      const types = {
        ForwardRequest: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
      } as const;
      const signature = await signTypedDataAsync({ domain, types, primaryType: "ForwardRequest", message: req as any });

      const res = await fetch(`/api/relay/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainId: CHAIN_ID_NUM,
          request: {
            from: req.from,
            to: req.to,
            value: req.value.toString(),
            gas: req.gas.toString(),
            nonce: req.nonce.toString(),
            data: req.data,
          },
          signature,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Relay failed");
    } catch {
      // fallback to direct tx if relay fails
      const txHash = await writeGameAsync({ functionName: "startGame" });
      if (publicClient && txHash) {
        try {
          await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
        } catch {}
      }
    }

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
  }, [address, publicClient, refetchSchedule, refetchSession, signTypedDataAsync, spawnWave, writeGameAsync]);

  const submit = useCallback(async () => {
    if (!address) return;
    if (!Array.isArray(schedule) || schedule.length === 0) return;
    setSubmitting(true);
    try {
      const len = enemyTypesCount ? Number(enemyTypesCount) : MEME_IMAGES.length;
      const arr = new Array(len).fill(0).map((_, i) => Number(counts[i] || 0));
      try {
        const data = encodeFunctionData({
          abi: gameEngine.abi as any,
          functionName: "submitResults",
          args: [arr],
        });
        const engine = gameEngine.address as `0x${string}`;

        const fw = await fetch(`/api/relay/forwarder?chainId=${CHAIN_ID_NUM}`);
        const { address: forwarder } = await fw.json();
        if (!forwarder) throw new Error("Forwarder not found");
        const nonce = await publicClient!.readContract({
          address: forwarder as `0x${string}`,
          abi: [
            {
              inputs: [{ name: "from", type: "address" }],
              name: "getNonce",
              outputs: [{ name: "", type: "uint256" }],
              stateMutability: "view",
              type: "function",
            },
          ] as const,
          functionName: "getNonce",
          args: [address as `0x${string}`],
        });
        const req = {
          from: address as `0x${string}`,
          to: engine,
          value: 0n,
          gas: 800_000n,
          nonce: nonce as bigint,
          data: data as `0x${string}`,
        } as const;
        const domain = {
          name: "MinimalForwarder",
          version: "0.0.1",
          chainId: BigInt(CHAIN_ID_NUM),
          verifyingContract: forwarder as `0x${string}`,
        } as const;
        const types = {
          ForwardRequest: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "gas", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "data", type: "bytes" },
          ],
        } as const;
        const signature = await signTypedDataAsync({
          domain,
          types,
          primaryType: "ForwardRequest",
          message: req as any,
        });

        const res = await fetch(`/api/relay/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chainId: CHAIN_ID_NUM,
            request: {
              from: req.from,
              to: req.to,
              value: req.value.toString(),
              gas: req.gas.toString(),
              nonce: req.nonce.toString(),
              data: req.data,
            },
            signature,
          }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Relay failed");
      } catch {
        await writeGameAsync({ functionName: "submitResults", args: [arr] });
      }
      setGameActive(false);
    } finally {
      setSubmitting(false);
    }
  }, [address, counts, enemyTypesCount, schedule, writeGameAsync, publicClient, signTypedDataAsync]);

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

  // Preload frequently used images to avoid decode jank during gameplay
  useEffect(() => {
    try {
      const sources = [
        ...MEME_IMAGES.map(img => `/game/memes/${img}`),
        "/cat/cat1.png",
        "/game/shoot2.webp",
        "/game/main-bg.jpg",
      ];
      sources.forEach(src => {
        const i = new window.Image();
        i.decoding = "async";
        i.loading = "eager" as any;
        i.src = src;
      });
    } catch {}
  }, []);

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
      // Update cat movement in the same frame loop to avoid a separate interval
      setCatPosition(prev => {
        let np = prev;
        if (keys.up) np = Math.max(0, np - 1);
        if (keys.down) np = Math.min(90, np + 1);
        return np;
      });

      // Move entities based on refs to avoid forcing a re-render every frame
      const movedProjectiles = projectilesRef.current
        .map(p => ({ ...p, x: p.x + 3 }))
        .filter(p => p.x < window.innerWidth + 50);

      const movedEnemies = enemiesRef.current.map(e => ({ ...e, x: e.x - 2 })).filter(e => e.x > -100);

      const hitProjectileIds = new Set<number>();
      const hitEnemyIds = new Set<number>();

      movedProjectiles.forEach(projectile => {
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
          }
        });
      });

      // Collect count updates for newly killed enemies
      const countUpdates: { [key: number]: number } = {};
      const newlyKilledIds: number[] = [];
      hitEnemyIds.forEach(enemyId => {
        if (killedEnemyIdsRef.current.has(enemyId)) return;
        const enemy = movedEnemies.find(e => e.id === enemyId);
        if (enemy) {
          const idx = enemy.typeIdx % MEME_IMAGES.length;
          countUpdates[idx] = (countUpdates[idx] || 0) + 1;
          newlyKilledIds.push(enemyId);
        }
      });

      // Update refs after filtering out hits
      projectilesRef.current = movedProjectiles.filter(p => !hitProjectileIds.has(p.id));
      enemiesRef.current = movedEnemies.filter(e => !hitEnemyIds.has(e.id));

      // Mark newly killed
      if (newlyKilledIds.length > 0) {
        newlyKilledIds.forEach(id => killedEnemyIdsRef.current.add(id));
      }

      // Commit visual state every other frame to reduce render work
      frameIndexRef.current = (frameIndexRef.current + 1) % 2;
      const shouldCommit = frameIndexRef.current === 0;
      if (shouldCommit) {
        setProjectiles(projectilesRef.current);
        setEnemies(enemiesRef.current);
        if (Object.keys(countUpdates).length > 0) {
          setCounts(prev => {
            const next = [...prev];
            Object.entries(countUpdates).forEach(([idx, increment]) => {
              next[parseInt(idx)] = (next[parseInt(idx)] || 0) + (increment as number);
            });
            return next;
          });
        }
      }

      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [keys]);

  const canSubmit = useMemo(() => {
    if (!gameActive) return false;
    if (!Array.isArray(schedule) || schedule.length === 0) return false;
    const allSpawned = spawnPtr >= schedule.length;
    const noEnemiesOnScreen = enemies.length === 0;
    return allSpawned && noEnemiesOnScreen;
  }, [enemies.length, gameActive, schedule, spawnPtr]);

  return (
    <div className="min-h-screen">
      {/* Game Area */}
      <div
        className="h-screen w-full relative bg-cover bg-center bg-no-repeat overflow-hidden"
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
          <img src="/cat/cat1.png" alt="Player Cat" width={120} height={120} draggable={false} />
        </div>

        {/* Projectiles */}
        {projectiles.map(projectile => (
          <div
            key={projectile.id}
            className="absolute"
            style={{ transform: `translate3d(${projectile.x}px, ${projectile.y}px, 0)`, willChange: "transform" }}
          >
            <img src="/game/shoot2.webp" alt="Projectile" width={40} height={40} draggable={false} />
          </div>
        ))}

        {/* Enemies */}
        {enemies.map(enemy => (
          <div
            key={enemy.id}
            className="absolute"
            style={{ transform: `translate3d(${enemy.x}px, ${enemy.y}px, 0)`, willChange: "transform" }}
          >
            <img src={`/game/memes/${enemy.image}`} alt="Enemy Meme" width={80} height={80} draggable={false} />
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

      {/* Betting Section */}
      <div className="py-8 px-4 bg-base-100">
        <BettingCard />
      </div>
    </div>
  );
}
