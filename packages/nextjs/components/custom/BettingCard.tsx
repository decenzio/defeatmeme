"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { EtherInput } from "~~/components/scaffold-eth";
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

export default function BettingCard() {
  const { address } = useAccount();
  const [selectedCoin, setSelectedCoin] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<string>("0.01");
  const [currentDayId, setCurrentDayId] = useState<number>(0);

  // Get current day ID (based on unix time, seconds -> days)
  useEffect(() => {
    const dayId = Math.floor(Date.now() / 1000 / (24 * 60 * 60));
    setCurrentDayId(dayId);
  }, []);

  // Read current day's betting info
  const { data: dayInfo } = useScaffoldReadContract({
    contractName: "GameEngine",
    functionName: "getDayInfo",
    args: [BigInt(currentDayId)],
  });

  // Read user's current stakes for today
  const { data: userStakes, refetch: refetchUserStakes } = useScaffoldReadContract({
    contractName: "GameEngine",
    functionName: "getUserStake",
    args: [BigInt(currentDayId), address as `0x${string}`],
  });

  // Read fee basis points
  const { data: feeBps } = useScaffoldReadContract({
    contractName: "GameEngine",
    functionName: "feeBasisPoints",
  });

  // Read whether the user already claimed today's winnings
  const { data: hasClaimed } = useScaffoldReadContract({
    contractName: "GameEngine",
    functionName: "hasClaimed",
    args: [BigInt(currentDayId), address as `0x${string}`],
    query: { enabled: Boolean(address) },
  });

  // Read the total winners' stake for the day (0 means no winners)
  const { data: winnersStake } = useScaffoldReadContract({
    contractName: "GameEngine",
    functionName: "dayWinnersStake",
    args: [BigInt(currentDayId)],
  });

  const { writeContractAsync: writeGameAsync, isMining } = useScaffoldWriteContract({ contractName: "GameEngine" });

  const placeBet = async () => {
    if (!address || !betAmount || Number(betAmount) <= 0) return;
    try {
      await writeGameAsync({
        functionName: "placeBet",
        args: [Number(selectedCoin)],
        value: parseEther(betAmount),
      });
      refetchUserStakes();
    } catch (error) {
      console.error("Bet placement failed:", error);
    }
  };

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
  const feeBpsTyped = feeBps as any;
  const hasClaimedTyped = hasClaimed as boolean | undefined;
  const winnersStakeTyped = winnersStake as bigint | undefined;

  return (
    <div className="bg-base-100 rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">Daily Meme Betting Pool</h2>

      {/* Day Status */}
      <div className="mb-6 p-4 bg-base-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Day Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            Day ID: <span className="font-mono">{currentDayId}</span>
          </div>
          <div>
            Status:{" "}
            <span className={dayInfoTyped?.[0] ? "text-green-500" : "text-yellow-500"}>
              {dayInfoTyped?.[0] ? "Settled" : "Active"}
            </span>
          </div>
          <div>
            Total Pool: <span className="font-mono">{dayInfoTyped?.[2] ? formatEther(dayInfoTyped[2]) : "0"} ETH</span>
          </div>
          <div>
            Fee: <span className="font-mono">{feeBpsTyped ? Number(feeBpsTyped) / 100 : 0}%</span>
          </div>
        </div>
      </div>

      {/* Winning Coin (if settled) */}
      {dayInfoTyped?.[0] && (
        <div className="mb-6 p-4 bg-green-100 dark:bg-green-900 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">🎉 Winner!</h3>
          <div className="flex items-center gap-3">
            <Image
              src={`/game/memes/${MEME_IMAGES[Number(dayInfoTyped[1])]}`}
              alt="Winning coin"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="text-lg font-bold">Coin #{Number(dayInfoTyped[1])}</span>
          </div>
        </div>
      )}

      {/* Place Bet Section */}
      {!dayInfoTyped?.[0] && (
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Place Your Bet</h3>

          {/* Coin Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Meme Coin:</label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {MEME_IMAGES.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedCoin(index)}
                  className={`p-2 border rounded-lg transition-colors ${
                    selectedCoin === index ? "border-primary bg-primary/10" : "border-base-300 hover:border-primary"
                  }`}
                >
                  <Image
                    src={`/game/memes/${img}`}
                    alt={`Coin ${index}`}
                    width={40}
                    height={40}
                    className="object-contain mx-auto"
                  />
                  <div className="text-xs mt-1">#{index}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Bet Amount */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Bet Amount</label>
            <EtherInput
              name="betAmount"
              value={betAmount}
              onChange={(val: string) => setBetAmount(val)}
              placeholder="0.01"
              usdMode
            />
            <div className="mt-1 text-xs opacity-70">Minimum is 0. Tip: click $/Ξ to toggle units.</div>
          </div>

          {/* Place Bet Button */}
          <button
            onClick={placeBet}
            disabled={!address || isMining || !betAmount || Number(betAmount) <= 0}
            className="btn btn-primary w-full"
          >
            {address
              ? isMining
                ? "Placing..."
                : `Bet Ξ${betAmount || "0"} on #${selectedCoin}`
              : "Connect Wallet to Bet"}
          </button>
        </div>
      )}

      {/* Your Stakes */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Your Stakes Today</h3>
        {userStakesTyped ? (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {userStakesTyped.map((stake: bigint, index: number) => (
              <div key={index} className="text-center p-2 border rounded">
                <Image
                  src={`/game/memes/${MEME_IMAGES[index]}`}
                  alt={`Coin ${index}`}
                  width={30}
                  height={30}
                  className="object-contain mx-auto mb-1"
                />
                <div className="text-xs">#{index}</div>
                <div className="text-sm font-mono">{formatEther(stake)} ETH</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">No stakes yet</p>
        )}
      </div>

      {/* Claim Winnings (if applicable) */}
      {dayInfoTyped?.[0] &&
        userStakesTyped &&
        userStakesTyped[Number(dayInfoTyped[1])] > 0n &&
        (winnersStakeTyped ?? 0n) > 0n &&
        !hasClaimedTyped && (
          <div className="p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">🎊 You Won!</h3>
            <p className="mb-4">You bet on the winning coin. Claim your winnings:</p>
            <button onClick={claimWinnings} className="btn btn-success w-full">
              Claim Winnings
            </button>
          </div>
        )}

      {/* Already claimed */}
      {dayInfoTyped?.[0] && hasClaimedTyped && (
        <div className="p-4 bg-base-200 rounded-lg text-center">
          <span className="text-sm">You have already claimed your winnings for today.</span>
        </div>
      )}

      {/* Current Pool Stats */}
      <div className="mt-6 p-4 bg-base-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Pool Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {dayInfoTyped?.[3]?.map((stake: bigint, index: number) => (
            <div key={index} className="text-center p-2 border rounded">
              <Image
                src={`/game/memes/${MEME_IMAGES[index]}`}
                alt={`Coin ${index}`}
                width={30}
                height={30}
                className="object-contain mx-auto mb-1"
              />
              <div className="text-xs">#{index}</div>
              <div className="text-sm font-mono">{formatEther(stake)} ETH</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
