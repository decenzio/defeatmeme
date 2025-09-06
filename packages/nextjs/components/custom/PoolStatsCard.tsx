"use client";

import { memo, useEffect, useState } from "react";
import Image from "next/image";
import { formatEther } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

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

function PoolStatsCard() {
  const [currentDayId, setCurrentDayId] = useState<number>(0);

  useEffect(() => {
    const dayId = Math.floor(Date.now() / 1000 / (24 * 60 * 60));
    setCurrentDayId(dayId);
  }, []);

  const { data: dayInfo } = useScaffoldReadContract({
    contractName: "GameEngine",
    functionName: "getDayInfo",
    args: [BigInt(currentDayId)],
    watch: false,
  });

  const dayInfoTyped = dayInfo as any;

  return (
    <div className="p-4 md:p-6">
      <h3 className="text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2">
        <span className="text-3xl">📈</span>
        Live Pool Statistics
        <span className="text-3xl">📈</span>
      </h3>

      <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
        {dayInfoTyped?.[3]?.map((stake: bigint, index: number) => {
          const stakeAmount = formatEther(stake);
          const maxStake = dayInfoTyped[3]
            ? Math.max(...dayInfoTyped[3].map((s: bigint) => Number(formatEther(s))))
            : 0;
          const stakePercentage = maxStake > 0 ? (Number(stakeAmount) / maxStake) * 100 : 0;

          return (
            <div
              key={index}
              className="relative text-center p-4 rounded-2xl bg-gradient-to-br from-base-300/30 to-base-300/10 border-2 border-transparent hover:border-primary/50 hover:bg-base-200/80 transition-all duration-300 transform hover:scale-105"
            >
              <div
                className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500`}
                style={{ width: `${stakePercentage}%` }}
              ></div>

              <div className="relative">
                <Image
                  src={`/game/memes/${MEME_IMAGES[index]}`}
                  alt={`Coin ${index}`}
                  width={80}
                  height={80}
                  className="object-contain mx-auto mb-2 rounded-lg"
                />
                {Number(stakeAmount) > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                )}
              </div>
              <div className="text-base font-bold opacity-70">#{index}</div>
              <div className="text-base font-mono font-bold text-primary">
                {Number(stakeAmount) > 0 ? `💰 ${stakeAmount}` : "0"} ETH
              </div>
              {stakePercentage > 0 && (
                <div className="text-sm opacity-60 mt-1">🔥 {stakePercentage.toFixed(1)}% popular</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(PoolStatsCard);
