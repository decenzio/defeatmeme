"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-black">
      <div className="text-center max-w-2xl mx-auto p-8">
        <h1 className="text-6xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          🌍 DefeatMeme
        </h1>
        <button className="btn btn-primary btn-lg" onClick={() => router.push("/home")}>
          PLAY
        </button>
      </div>
    </main>
  );
}
