import PoolStatsCard from "~~/components/custom/PoolStatsCard";
import PredictionCard from "~~/components/custom/PredictionCard";
import RegisterCard from "~~/components/custom/RegisterCard";
import StakesCard from "~~/components/custom/StakesCard";

export default function Home() {
  return (
    <main className="h-full relative z-10 p-4 md:p-6 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-4 md:gap-6 h-full">
        {/* Tile 1: Your Planet NFT (Mint / Status) */}
        <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm overflow-hidden">
          <div className="h-full overflow-auto p-4 md:p-6">
            <h2 className="text-2xl font-bold mb-4">🌍 Your Planet NFT</h2>
            <RegisterCard />
          </div>
        </div>

        {/* Tile 2: Make Your Prediction */}
        <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm overflow-hidden">
          <div className="h-full overflow-auto">
            <PredictionCard />
          </div>
        </div>

        {/* Tile 3: Your Stakes */}
        <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm overflow-hidden">
          <div className="h-full overflow-auto">
            <StakesCard />
          </div>
        </div>

        {/* Tile 4: Live Pool Statistics */}
        <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm overflow-hidden">
          <div className="h-full overflow-auto">
            <PoolStatsCard />
          </div>
        </div>
      </div>
    </main>
  );
}
