"use client";

import { memo, useEffect, useState } from "react";
import Image from "next/image";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

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

function StakesCard() {
  const { address } = useAccount();
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
  const { data: userStakes, refetch: refetchUserStakes } = useScaffoldReadContract({
    contractName: "GameEngine",
    functionName: "getUserStake",
    args: [BigInt(currentDayId), address as `0x${string}`],
    watch: false,
  });
  const { data: hasClaimed } = useScaffoldReadContract({
    contractName: "GameEngine",
    functionName: "hasClaimed",
    args: [BigInt(currentDayId), address as `0x${string}`],
    query: { enabled: Boolean(address) },
    watch: false,
  });
  const { data: winnersStake } = useScaffoldReadContract({
    contractName: "GameEngine",
    functionName: "dayWinnersStake",
    args: [BigInt(currentDayId)],
    watch: false,
  });

  const { writeContractAsync: writeGameAsync } = useScaffoldWriteContract({ contractName: "GameEngine" });

  const claimWinnings = async () => {
    if (!address) return;
    try {
      await writeGameAsync({
        functionName: "claim",
        args: [BigInt(currentDayId)],
      });
      refetchUserStakes();
    } catch (error) {
      console.error("Claim failed:", error);
    }
  };

  const dayInfoTyped = dayInfo as any;
  const userStakesTyped = userStakes as any;
  const hasClaimedTyped = hasClaimed as boolean | undefined;
  const winnersStakeTyped = winnersStake as bigint | undefined;

  return (
    <div className="p-4 md:p-6">
      <h3 className="text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2">
        <span className="text-3xl">💎</span>
        Your Current Stakes
        <span className="text-3xl">💎</span>
      </h3>

      {userStakesTyped ? (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
          {userStakesTyped.map((stake: bigint, index: number) => (
            <div
              key={index}
              className={`text-center p-4 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                stake > 0n
                  ? "bg-gradient-to-br from-success/20 to-success/10 border-2 border-success/50 shadow-lg"
                  : "bg-base-300/50 border-2 border-transparent hover:border-primary/50 hover:bg-base-200/80"
              }`}
            >
              <div className="relative">
                <Image
                  src={`/game/memes/${MEME_IMAGES[index]}`}
                  alt={`Coin ${index}`}
                  width={80}
                  height={80}
                  className="object-contain mx-auto mb-2 rounded-lg"
                />
                {stake > 0n && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full animate-pulse"></div>
                )}
              </div>
              <div className="text-base font-bold opacity-70">#{index}</div>
              <div className={`text-base font-mono font-bold ${stake > 0n ? "text-success" : "text-base-content/50"}`}>
                {stake > 0n ? `💰 ${formatEther(stake)}` : "0"} ETH
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🎲</div>
          <p className="text-lg opacity-70">No stake yet - make your first prediction!</p>
        </div>
      )}

      {dayInfoTyped?.[0] &&
        userStakesTyped &&
        userStakesTyped[Number(dayInfoTyped[1])] > 0n &&
        (winnersStakeTyped ?? 0n) > 0n &&
        !hasClaimedTyped && (
          <div className="mt-6 p-6 bg-gradient-to-r from-yellow-900/30 to-amber-800/30 rounded-2xl border-2 border-yellow-400/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-amber-400 animate-pulse"></div>
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">🎊</div>
              <h3 className="text-3xl font-bold text-yellow-300 mb-4">CONGRATULATIONS!</h3>
              <p className="text-lg mb-6 text-yellow-100">You predicted correctly! Time to claim your reward!</p>
              <button
                onClick={claimWinnings}
                className="btn btn-warning btn-lg px-8 py-4 text-lg font-bold rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-400 text-black hover:scale-105 transition-transform duration-300"
              >
                🏆 Claim Your Winnings! 🏆
              </button>
            </div>
          </div>
        )}

      {dayInfoTyped?.[0] && hasClaimedTyped && (
        <div className="mt-6 p-6 bg-gradient-to-r from-info/20 to-info/10 rounded-2xl border border-info/30 text-center">
          <div className="text-4xl mb-2">✅</div>
          <span className="text-lg">You have already claimed your winnings for today.</span>
          <div className="text-sm opacity-70 mt-2">Come back tomorrow for another chance to win!</div>
        </div>
      )}
    </div>
  );
}

export default memo(StakesCard);
