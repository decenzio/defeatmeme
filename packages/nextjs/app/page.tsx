"use client";

import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export default function Home() {
  const router = useRouter();
  const { address } = useAccount();

  // Check if user has a planet NFT
  const { data: hasPlanet } = useScaffoldReadContract({
    contractName: "PlanetNFT",
    functionName: "hasPlanet",
    args: [address],
  });

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-black">
      <div className="text-center max-w-2xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            🌍 DefeatMeme
          </h1>
          <p className="text-xl text-gray-300 mb-8">The ultimate planet defense game on the blockchain</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-2xl bg-base-200/80 backdrop-blur-sm">
            <h3 className="text-2xl font-bold mb-3">🪐 Get Your Planet</h3>
            <p className="text-sm opacity-80 mb-4">Mint a unique Planet NFT to start your journey</p>
            <button className="btn btn-primary w-full" onClick={() => router.push("/home")}>
              Get Started
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-base-200/80 backdrop-blur-sm">
            <h3 className="text-2xl font-bold mb-3">🎮 Play Game</h3>
            <p className="text-sm opacity-80 mb-4">Defend your planet from meme attacks</p>
            <button
              className={`btn w-full ${hasPlanet ? "btn-success" : "btn-disabled"}`}
              onClick={() => (hasPlanet ? router.push("/game") : router.push("/home"))}
              disabled={!hasPlanet}
            >
              {hasPlanet ? "Play Now" : "Need Planet NFT"}
            </button>
          </div>
        </div>

        <div className="text-sm opacity-60">
          <p>Built with 🏗 Scaffold-ETH 2</p>
        </div>
      </div>
    </main>
  );
}
