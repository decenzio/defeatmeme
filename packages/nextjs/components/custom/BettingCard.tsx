"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { EtherInput } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import styles from "~~/styles/BettingCard.module.css";

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
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // Get current day ID (based on unix time, seconds -> days)
  useEffect(() => {
    const dayId = Math.floor(Date.now() / 1000 / (24 * 60 * 60));
    setCurrentDayId(dayId);
  }, []);

  // Format day ID as readable date
  const formatDayId = (dayId: number) => {
    const date = new Date(dayId * 24 * 60 * 60 * 1000);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

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
  // const { data: feeBps } = useScaffoldReadContract({
  //   contractName: "GameEngine",
  //   functionName: "feeBasisPoints",
  // });

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
      setIsAnimating(true);
      await writeGameAsync({
        functionName: "placeBet",
        args: [Number(selectedCoin)],
        value: parseEther(betAmount),
      });
      refetchUserStakes();
    } catch (error) {
      console.error("Bet placement failed:", error);
    } finally {
      setTimeout(() => setIsAnimating(false), 1000);
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
  const hasClaimedTyped = hasClaimed as boolean | undefined;
  const winnersStakeTyped = winnersStake as bigint | undefined;

  return (
    <div className="relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20 animate-pulse"></div>

      {/* Main container */}
      <div className="relative bg-gradient-to-br from-base-100 via-base-100 to-base-200 rounded-3xl shadow-2xl p-8 max-w-6xl mx-auto border border-primary/20">
        {/* Header with glowing effect */}
        <div className="text-center mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent blur-xl"></div>
          <h2 className="relative text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            🎰 Daily Meme Casino 🎰
          </h2>
          <p className="text-lg opacity-80 mt-2">Place your bets on today&apos;s hottest meme coins!</p>
        </div>

        {/* Day Status - Enhanced */}
        <div className="mb-8 p-6 bg-gradient-to-r from-base-200 to-base-300 rounded-2xl border border-primary/10">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Casino Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-sm opacity-70">Date</div>
              <div className="text-lg font-semibold text-primary">{formatDayId(currentDayId)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm opacity-70">Status</div>
              <div className={`text-xl font-bold ${dayInfoTyped?.[0] ? "text-green-400" : "text-yellow-400"}`}>
                {dayInfoTyped?.[0] ? "🔒 Settled" : "🔥 LIVE"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm opacity-70">Total Jackpot</div>
              <div className="text-xl font-mono text-warning">
                💰 {dayInfoTyped?.[2] ? formatEther(dayInfoTyped[2]) : "0"} ETH
              </div>
            </div>
          </div>
        </div>

        {/* Winning Coin (if settled) - Enhanced */}
        {dayInfoTyped?.[0] && (
          <div className="mb-8 p-6 bg-gradient-to-r from-green-900/30 to-emerald-800/30 rounded-2xl border-2 border-green-400/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-400"></div>
            <div className="flex items-center justify-center gap-4">
              <span className="text-6xl animate-bounce">🏆</span>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-green-300 mb-2">WINNER!</h3>
                <div className="flex items-center gap-3 justify-center">
                  <div className="relative">
                    <Image
                      src={`/game/memes/${MEME_IMAGES[Number(dayInfoTyped[1])]}`}
                      alt="Winning coin"
                      width={60}
                      height={60}
                      className="object-contain rounded-full border-4 border-yellow-400 shadow-lg"
                    />
                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-bold">
                      WIN
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-yellow-300">Coin #{Number(dayInfoTyped[1])}</span>
                </div>
              </div>
              <span className={`text-6xl animate-bounce ${styles.animationDelay500}`}>🎉</span>
            </div>
          </div>
        )}

        {/* Place Bet Section - Enhanced */}
        {!dayInfoTyped?.[0] && (
          <div className="mb-8 p-6 bg-gradient-to-br from-base-200/50 to-base-300/50 rounded-2xl border border-primary/20 backdrop-blur-sm">
            <h3 className="text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2">
              <span className="text-3xl">🎲</span>
              Place Your Bet
              <span className="text-3xl">🎲</span>
            </h3>

            {/* Coin Selection - Enhanced */}
            <div className="mb-6">
              <label className="block text-lg font-bold mb-4 text-center">Choose Your Meme Champion:</label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                {MEME_IMAGES.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedCoin(index)}
                    className={`group relative p-4 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                      selectedCoin === index
                        ? "bg-gradient-to-br from-primary/30 to-secondary/30 border-2 border-primary shadow-lg shadow-primary/50 scale-105"
                        : "bg-base-300/50 border-2 border-transparent hover:border-primary/50 hover:bg-base-200/80"
                    }`}
                  >
                    <div className="relative">
                      <Image
                        src={`/game/memes/${img}`}
                        alt={`Coin ${index}`}
                        width={50}
                        height={50}
                        className="object-contain mx-auto mb-2 rounded-lg transition-transform group-hover:rotate-12"
                      />
                      {selectedCoin === index && (
                        <div className="absolute -top-2 -right-2 bg-primary text-primary-content text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                          ✓
                        </div>
                      )}
                    </div>
                    <div
                      className={`text-sm font-bold ${selectedCoin === index ? "text-primary" : "text-base-content"}`}
                    >
                      #{index}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Bet Amount - Enhanced */}
            <div className="mb-6">
              <label className="block text-lg font-bold mb-4 text-center">💰 Bet Amount 💰</label>
              <div className="max-w-md mx-auto">
                <EtherInput
                  name="betAmount"
                  value={betAmount}
                  onChange={(val: string) => setBetAmount(val)}
                  placeholder="0.01"
                  usdMode
                />
                <div className="mt-2 text-center text-sm opacity-70">
                  💡 Tip: Click $/Ξ to toggle between USD and ETH
                </div>
              </div>
            </div>

            {/* Place Bet Button - Enhanced */}
            <div className="text-center">
              <button
                onClick={placeBet}
                disabled={!address || isMining || !betAmount || Number(betAmount) <= 0}
                className={`btn btn-lg px-8 py-4 text-lg font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                  !address || isMining || !betAmount || Number(betAmount) <= 0
                    ? "btn-disabled"
                    : "btn-primary bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/50"
                } ${isAnimating ? "animate-pulse" : ""}`}
              >
                {address ? (
                  isMining || isAnimating ? (
                    <span className="flex items-center gap-2">
                      <span className="loading loading-spinner loading-sm"></span>
                      Placing Bet...
                    </span>
                  ) : (
                    `🎰 Bet Ξ${betAmount || "0"} on Coin #${selectedCoin} 🎰`
                  )
                ) : (
                  "🔗 Connect Wallet to Start Gambling 🔗"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Your Stakes - Enhanced */}
        <div className="mb-8 p-6 bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl border border-accent/20">
          <h3 className="text-xl font-bold mb-6 text-center flex items-center justify-center gap-2">
            <span className="text-2xl">💎</span>
            Your Current Stakes
            <span className="text-2xl">💎</span>
          </h3>
          {userStakesTyped ? (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
              {userStakesTyped.map((stake: bigint, index: number) => (
                <div
                  key={index}
                  className={`text-center p-4 rounded-xl transition-all duration-300 ${
                    stake > 0n
                      ? "bg-gradient-to-br from-success/20 to-success/10 border-2 border-success/50 shadow-lg"
                      : "bg-base-300/30 border border-base-300"
                  }`}
                >
                  <div className="relative">
                    <Image
                      src={`/game/memes/${MEME_IMAGES[index]}`}
                      alt={`Coin ${index}`}
                      width={40}
                      height={40}
                      className="object-contain mx-auto mb-2 rounded-lg"
                    />
                    {stake > 0n && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <div className="text-xs font-bold opacity-70">#{index}</div>
                  <div
                    className={`text-sm font-mono font-bold ${stake > 0n ? "text-success" : "text-base-content/50"}`}
                  >
                    {stake > 0n ? `💰 ${formatEther(stake)}` : "0"} ETH
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎲</div>
              <p className="text-lg opacity-70">No stakes yet - time to make your first bet!</p>
            </div>
          )}
        </div>

        {/* Claim Winnings (if applicable) - Enhanced */}
        {dayInfoTyped?.[0] &&
          userStakesTyped &&
          userStakesTyped[Number(dayInfoTyped[1])] > 0n &&
          (winnersStakeTyped ?? 0n) > 0n &&
          !hasClaimedTyped && (
            <div className="mb-8 p-6 bg-gradient-to-r from-yellow-900/30 to-amber-800/30 rounded-2xl border-2 border-yellow-400/50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-amber-400 animate-pulse"></div>
              <div className="text-center">
                <div className="text-6xl mb-4 animate-bounce">🎊</div>
                <h3 className="text-3xl font-bold text-yellow-300 mb-4">CONGRATULATIONS!</h3>
                <p className="text-lg mb-6 text-yellow-100">You picked the winning meme! Time to claim your rewards!</p>
                <button
                  onClick={claimWinnings}
                  className="btn btn-warning btn-lg px-8 py-4 text-lg font-bold rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-400 text-black hover:scale-105 transition-transform duration-300"
                >
                  🏆 Claim Your Winnings! 🏆
                </button>
              </div>
            </div>
          )}

        {/* Already claimed - Enhanced */}
        {dayInfoTyped?.[0] && hasClaimedTyped && (
          <div className="mb-8 p-6 bg-gradient-to-r from-info/20 to-info/10 rounded-2xl border border-info/30 text-center">
            <div className="text-4xl mb-2">✅</div>
            <span className="text-lg">You have already claimed your winnings for today.</span>
            <div className="text-sm opacity-70 mt-2">Come back tomorrow for another chance to win!</div>
          </div>
        )}

        {/* Current Pool Stats - Enhanced */}
        <div className="p-6 bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-2xl border border-secondary/20">
          <h3 className="text-xl font-bold mb-6 text-center flex items-center justify-center gap-2">
            <span className="text-2xl">📈</span>
            Live Pool Statistics
            <span className="text-2xl">📈</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {dayInfoTyped?.[3]?.map((stake: bigint, index: number) => {
              const stakeAmount = formatEther(stake);
              const maxStake = dayInfoTyped[3]
                ? Math.max(...dayInfoTyped[3].map((s: bigint) => Number(formatEther(s))))
                : 0;
              const stakePercentage = maxStake > 0 ? (Number(stakeAmount) / maxStake) * 100 : 0;

              return (
                <div
                  key={index}
                  className="relative text-center p-4 rounded-xl bg-gradient-to-br from-base-300/30 to-base-300/10 border border-base-300/50 hover:scale-105 transition-transform duration-300"
                >
                  {/* Popularity bar */}
                  <div
                    className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500 ${styles.popularityBar}`}
                    style={{ width: `${stakePercentage}%` }}
                  ></div>

                  <div className="relative">
                    <Image
                      src={`/game/memes/${MEME_IMAGES[index]}`}
                      alt={`Coin ${index}`}
                      width={40}
                      height={40}
                      className="object-contain mx-auto mb-2 rounded-lg"
                    />
                    {Number(stakeAmount) > 0 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <div className="text-xs font-bold opacity-70">#{index}</div>
                  <div className="text-sm font-mono font-bold text-primary">
                    {Number(stakeAmount) > 0 ? `💰 ${stakeAmount}` : "0"} ETH
                  </div>
                  {stakePercentage > 0 && (
                    <div className="text-xs opacity-60 mt-1">🔥 {stakePercentage.toFixed(1)}% popular</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Decorative footer */}
        <div className="text-center mt-8 opacity-50">
          <div className="text-sm">🎰 Good luck, and may the memes be with you! 🎰</div>
        </div>
      </div>
    </div>
  );
}
