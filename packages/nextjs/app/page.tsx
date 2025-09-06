"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "~~/styles/Landing.module.css";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Static Planet Background */}
      <div className="absolute inset-0">
        <Image src="/planet/planet2.png" alt="Zircuit Planet" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="mb-12">
            <h1 className="text-7xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-2xl">
              DefeatTheMeme
            </h1>
            <p className="text-2xl md:text-3xl text-white font-semibold mb-8 drop-shadow-lg">
              🐱 Play as the legendary Zircuit Cat
            </p>
          </div>

          {/* Cat Character Preview */}
          <div className="mb-12 flex justify-center">
            <div className="relative">
              <Image
                src="/cat/cat1.png"
                alt="Zircuit Cat Hero"
                width={200}
                height={200}
                className="object-contain drop-shadow-2xl hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-400/20 to-purple-500/20 rounded-full blur-xl" />
            </div>
          </div>

          {/* Description */}
          <div className="mb-12 space-y-6">
            <p className="text-xl md:text-2xl text-white/90 leading-relaxed max-w-3xl mx-auto drop-shadow-lg">
              <strong>Blast through waves of memes</strong> in this epic blockchain shooter!
            </p>
            <p className="text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl mx-auto drop-shadow-lg">
              Battle across alien worlds, climb the leaderboards, and prove you&apos;re the ultimate meme slayer.
            </p>
            <div className="flex items-center justify-center gap-2 text-cyan-400 font-semibold">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              <span>Powered by GolemDB</span>
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-4">
            <button
              className="btn btn-primary btn-lg text-xl px-12 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 border-0 hover:from-cyan-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-2xl"
              onClick={() => router.push("/home")}
            >
              🚀 START BLASTING
            </button>
            <div className="text-white/70 text-sm">Connect your wallet to save high scores</div>
          </div>

          {/* Features */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-white">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-lg font-bold mb-2">Lightning Fast</h3>
              <p className="text-sm text-white/80">Smooth 60fps gameplay with instant blockchain transactions</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="text-3xl mb-3">🏆</div>
              <h3 className="text-lg font-bold mb-2">Global Leaderboards</h3>
              <p className="text-sm text-white/80">Compete with players worldwide and climb the ranks</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="text-3xl mb-3">🌌</div>
              <h3 className="text-lg font-bold mb-2">Epic Battles</h3>
              <p className="text-sm text-white/80">30 waves of meme mayhem across stunning alien worlds</p>
            </div>
          </div>

          {/* Additional spacing to push content below the fold */}
          <div className="mt-32 mb-16">
            <div className="text-center space-y-8">
              <h2 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">Ready for Battle?</h2>
              <p className="text-lg text-white/80 max-w-2xl mx-auto">
                Join thousands of players in the ultimate meme-fighting experience. Connect your wallet and start your
                journey to become the galaxy&apos;s greatest defender.
              </p>
              <button
                className="btn btn-secondary btn-lg text-xl px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-600 border-0 hover:from-purple-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200"
                onClick={() => router.push("/leaderboard")}
              >
                🏆 View Leaderboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div key={i} className={`${styles.particle} absolute`} />
        ))}
      </div>
    </main>
  );
}
