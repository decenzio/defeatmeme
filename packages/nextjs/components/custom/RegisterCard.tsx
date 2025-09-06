"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Abi, Address } from "viem";
import { formatEther } from "viem";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { useDeployedContractInfo, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const ENV_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31337);

export default function RegisterCard() {
  const { address } = useAccount();
  const activeChainId = useChainId();
  const router = useRouter();

  // Load PlanetNFT contract info
  const { data: planetHook } = useDeployedContractInfo({ contractName: "PlanetNFT" });

  // Make types explicit so wagmi can infer return types
  const planetAbi = planetHook?.abi as Abi | undefined;
  const planetAddress = planetHook?.address as Address | undefined;

  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  // Read user's planet ID (bigint)
  const { data: myPlanetId, refetch } = useReadContract({
    address: planetAddress,
    abi: planetAbi,
    functionName: "getPlanetIdByOwner",
    args: [address],
    query: { enabled: Boolean(address && planetAddress) },
  }) as { data: bigint | undefined; refetch: () => Promise<any> };

  // Check if user has a planet using the dedicated function
  const { data: hasPlanetFromContract } = useReadContract({
    address: planetAddress,
    abi: planetAbi,
    functionName: "hasPlanet",
    args: [address],
    query: { enabled: Boolean(address && planetAddress) },
  }) as { data: boolean | undefined };

  // Read mint price (bigint)
  const { data: mintPrice } = useReadContract({
    address: planetAddress,
    abi: planetAbi,
    functionName: "mintPrice",
    query: { enabled: Boolean(planetAddress) },
  }) as { data: bigint | undefined };

  // Setup write contract for minting
  const { writeContractAsync: writePlanetAsync, isPending: isMinting } = useScaffoldWriteContract({
    contractName: "PlanetNFT",
  });

  // Use the dedicated hasPlanet function first, fallback to ID check
  const hasPlanet = hasPlanetFromContract ?? (!!myPlanetId && myPlanetId !== 0n);
  const wrongChain = activeChainId !== ENV_CHAIN_ID;

  async function mintPlanet() {
    if (!address || !planetAddress) {
      alert("Wallet not connected or contract not loaded");
      return;
    }

    try {
      console.log("Attempting to mint with price:", mintPrice?.toString());

      const tx = await writePlanetAsync({
        functionName: "mint",
        value: mintPrice ?? 0n,
      });

      console.log("Mint transaction successful:", tx);
      alert("🎉 Planet minted successfully! Check your wallet.");

      // Refresh planet data
      setTimeout(() => refetch(), 1000);
      setTimeout(() => refetch(), 3000);
    } catch (error: any) {
      console.error("Mint error:", error);
      alert(`Failed to mint planet: ${error.message ?? "Unknown error"}`);
    }
  }

  async function checkNFTStatus() {
    if (!address || !planetAddress) {
      setCheckResult("❌ Wallet not connected or contract not loaded");
      return;
    }

    setChecking(true);
    setCheckResult(null);

    try {
      await refetch();
      const planetId = myPlanetId;

      if (!planetId || planetId === 0n) {
        setCheckResult("❌ No Planet NFT found. You can mint one below!");
      } else {
        setCheckResult(`✅ You own Planet NFT #${planetId.toString()}!`);
      }
    } catch (error: any) {
      console.error("Check error:", error);
      setCheckResult(`❌ Error: ${error.message ?? "Unknown error"}`);
    } finally {
      setChecking(false);
    }
  }

  console.log("Planet info:", {
    contractAddress: planetAddress,
    hasAbi: !!planetAbi,
    userAddress: address,
    myPlanetId: myPlanetId?.toString(),
    hasPlanetFromContract,
    hasPlanet,
    mintPrice: mintPrice?.toString(),
    wrongChain,
    activeChainId,
    ENV_CHAIN_ID,
  });

  return (
    <div className="max-w-md mx-auto p-6 rounded-2xl shadow bg-base-200">
      <h2 className="text-xl font-bold">🌍 Your Planet NFT</h2>

      {!address && <p className="mt-2">Connect your wallet to get started.</p>}

      {address && myPlanetId === undefined && <p className="mt-2 opacity-70">Checking your planet...</p>}

      {address && hasPlanet && (
        <div className="mt-4 p-4 rounded-lg bg-green-100 dark:bg-green-900">
          <p className="text-green-800 dark:text-green-200">✅ You own Planet NFT #{myPlanetId!.toString()}!</p>
          <button className="btn btn-success w-full mt-3" onClick={() => router.push("/game")}>
            🚀 Go to Game
          </button>
        </div>
      )}

      {address && !hasPlanet && myPlanetId !== undefined && (
        <div className="mt-4">
          <p className="mb-4">You don&#39;t have a Planet NFT yet.</p>
          <button
            className="btn btn-primary w-full"
            onClick={mintPlanet}
            disabled={isMinting || wrongChain}
            title={wrongChain ? `Switch to chain ${ENV_CHAIN_ID}` : ""}
          >
            {isMinting
              ? "Minting..."
              : (mintPrice ?? 0n) > 0n
                ? `Mint Planet (${formatEther(mintPrice!)} ETH)`
                : "Mint Planet (Free)"}
          </button>
        </div>
      )}

      {address && (
        <button className="btn btn-secondary mt-3 w-full" onClick={checkNFTStatus} disabled={checking || wrongChain}>
          {checking ? "Checking..." : "🔍 Check Status"}
        </button>
      )}

      {checkResult && (
        <div className="mt-3 p-3 rounded-lg bg-base-300">
          <p className="text-sm">{checkResult}</p>
        </div>
      )}

      {address && wrongChain && (
        <div className="mt-3 p-3 rounded-lg bg-warning">
          <p className="text-sm">⚠️ Wrong network. Switch to chain {ENV_CHAIN_ID}</p>
        </div>
      )}
    </div>
  );
}
