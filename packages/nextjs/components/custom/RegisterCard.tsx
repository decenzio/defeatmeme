"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Abi, Address } from "viem";
import { formatEther } from "viem";
import { encodeFunctionData, zeroAddress } from "viem";
import { useAccount, useChainId, usePublicClient, useReadContract, useSignTypedData } from "wagmi";
import { useDeployedContractInfo, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const ENV_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31337);

export default function RegisterCard() {
  const { address } = useAccount();
  const activeChainId = useChainId();
  const publicClient = usePublicClient();
  const { signTypedDataAsync } = useSignTypedData();
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
  const { data: hasPlanetFromContract, refetch: refetchHasPlanet } = useReadContract({
    address: planetAddress,
    abi: planetAbi,
    functionName: "hasPlanet",
    args: [address],
    query: { enabled: Boolean(address && planetAddress) },
  }) as { data: boolean | undefined; refetch: () => Promise<any> };

  // Read mint price (bigint)
  const { data: mintPrice } = useReadContract({
    address: planetAddress,
    abi: planetAbi,
    functionName: "mintPrice",
    query: { enabled: Boolean(planetAddress) },
  }) as { data: bigint | undefined };

  // Setup write contract for minting
  const { isPending: isMinting } = useScaffoldWriteContract({
    contractName: "PlanetNFT",
  });

  // Use the dedicated hasPlanet function first, fallback to ID check
  const hasPlanet = Boolean(hasPlanetFromContract || (myPlanetId && myPlanetId !== 0n));
  const wrongChain = activeChainId !== ENV_CHAIN_ID;

  async function mintPlanet() {
    if (!address || !planetAddress) {
      alert("Wallet not connected or contract not loaded");
      return;
    }

    try {
      // Build meta-tx call data for PlanetNFT.mint()
      const data = encodeFunctionData({
        abi: planetAbi!,
        functionName: "mint",
        args: [],
      });

      // Fetch forwarder
      const res = await fetch(`/api/relay/forwarder?chainId=${ENV_CHAIN_ID}`);
      const { address: forwarder } = await res.json();
      if (!forwarder || forwarder === zeroAddress) throw new Error("Forwarder not found");

      // Get forwarder nonce for this sender
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
        to: planetAddress as `0x${string}`,
        value: mintPrice ?? 0n,
        gas: 500_000n,
        nonce: nonce as bigint,
        data: data as `0x${string}`,
      };

      // Sign EIP-712 ForwardRequest
      const domain = {
        name: "MinimalForwarder",
        version: "0.0.1",
        chainId: BigInt(ENV_CHAIN_ID),
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

      const exec = await fetch(`/api/relay/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainId: ENV_CHAIN_ID,
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
      const j = await exec.json();
      if (!exec.ok) throw new Error(j.error || "Relay failed");

      alert("🎉 Meta-transaction sent by relayer! Hash: " + j.hash);
      setTimeout(() => {
        refetch();
        refetchHasPlanet();
      }, 1200);
      setTimeout(() => {
        refetch();
        refetchHasPlanet();
      }, 3000);
    } catch (error: any) {
      // Do NOT fallback to a direct on-chain tx (would require gas).
      // Handle common user rejection and meta-tx failures gracefully.
      const msg = String(error?.message || "Unknown error");
      const code = (error?.code ?? error?.cause?.code) as number | undefined;

      if (code === 4001 || /User rejected/i.test(msg)) {
        alert("Signature was rejected. Please approve the meta-transaction to mint gaslessly.");
        return;
      }

      alert(`Meta-transaction failed: ${msg}`);
      console.error("Meta-tx mint failed:", error);
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

  try {
    console.log("Planet info:", {
      contractAddress: planetAddress,
      hasAbi: !!planetAbi,
      userAddress: address,
      myPlanetId: myPlanetId ? myPlanetId.toString() : undefined,
      hasPlanetFromContract,
      hasPlanet,
      mintPrice: mintPrice ? mintPrice.toString() : undefined,
      wrongChain,
      activeChainId,
      ENV_CHAIN_ID,
    });
  } catch {}

  return (
    <div className="max-w-md mx-auto p-6 rounded-2xl shadow bg-white/10 backdrop-blur-sm border border-white/20">
      <h2 className="text-xl font-bold">🌍 Your Planet NFT</h2>

      {!address && <p className="mt-2">Connect your wallet to get started.</p>}

      {address && myPlanetId === undefined && <p className="mt-2 opacity-70">Checking your planet...</p>}

      {address && hasPlanet && (
        <div className="mt-4 p-4 rounded-lg bg-green-100 dark:bg-green-900">
          <p className="text-green-800 dark:text-green-200">
            ✅ You own Planet NFT #{myPlanetId ? myPlanetId.toString() : "?"}!
          </p>
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
