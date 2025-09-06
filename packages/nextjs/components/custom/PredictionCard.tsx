"use client";

import { memo, useEffect, useState } from "react";
import Image from "next/image";
import { parseEther } from "viem";
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

function PredictionCard() {
  const { address } = useAccount();
  const [selectedCoin, setSelectedCoin] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<string>("0.01");
  const [currentDayId, setCurrentDayId] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

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
    } catch (error) {
      console.error("Bet placement failed:", error);
    } finally {
      setTimeout(() => setIsAnimating(false), 1000);
    }
  };

  return (
    <div className="p-3 md:p-4">
      <h3 className="text-xl md:text-2xl font-bold mb-3 text-center flex items-center justify-center gap-2">
        <span className="text-3xl">📊</span>
        Make Your Prediction
        <span className="text-3xl">📊</span>
      </h3>

      {/* Coin Selection */}
      <div className="mb-4">
        <label className="block text-base md:text-lg font-bold mb-2 text-center">Choose Your Meme Option:</label>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
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
              <div className="relative mx-auto mb-2 rounded-lg w-16 h-16 md:w-20 md:h-20">
                <Image
                  src={`/game/memes/${img}`}
                  alt={`Coin ${index}`}
                  fill
                  sizes="(min-width: 768px) 80px, 64px"
                  className="object-contain rounded-lg transition-transform group-hover:rotate-12"
                />
                {selectedCoin === index && (
                  <div className="absolute -top-2 -right-2 bg-primary text-primary-content text-sm px-2 py-1 rounded-full font-bold animate-pulse">
                    ✓
                  </div>
                )}
              </div>
              <div
                className={`text-sm md:text-base font-bold ${selectedCoin === index ? "text-primary" : "text-base-content"}`}
              >
                #{index}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Stake Amount */}
      <div className="mb-4">
        <label className="block text-base md:text-lg font-bold mb-2 text-center">💰 Stake Amount 💰</label>
        <div className="max-w-md mx-auto">
          <EtherInput
            name="betAmount"
            value={betAmount}
            onChange={(val: string) => setBetAmount(val)}
            placeholder="0.01"
            usdMode
          />
          <div className="mt-2 text-center text-xs md:text-sm opacity-70 hidden md:block">
            💡 Tip: Click $/Ξ to toggle between USD and ETH
          </div>
        </div>
      </div>

      {/* Submit Prediction Button */}
      <div className="text-center">
        <button
          onClick={placeBet}
          disabled={!address || isMining || !betAmount || Number(betAmount) <= 0 || Boolean(dayInfoTyped?.[0])}
          className={`btn px-6 py-3 text-base md:text-lg font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 ${
            !address || isMining || !betAmount || Number(betAmount) <= 0 || Boolean(dayInfoTyped?.[0])
              ? "btn-disabled"
              : "btn-primary bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/50"
          } ${isAnimating ? "animate-pulse" : ""}`}
        >
          {address
            ? isMining || isAnimating
              ? "Submitting Prediction..."
              : `📊 Stake Ξ${betAmount || "0"} on Option #${selectedCoin}`
            : "🔗 Connect Wallet to Predict 🔗"}
        </button>
        {Boolean(dayInfoTyped?.[0]) && (
          <div className="text-xs opacity-70 mt-2">Round settled. Come back tomorrow.</div>
        )}
      </div>
    </div>
  );
}

export default memo(PredictionCard);
