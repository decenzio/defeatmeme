"use client";

import { useEffect, useState } from "react";
import { TrophyIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { type LeaderboardEntry, golemDBService } from "~~/services/golemdb/leaderboard";
import styles from "~~/styles/Leaderboard.module.css";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await golemDBService.getLeaderboard(10);

      if (response.success) {
        setLeaderboard(response.data);
      } else {
        setError(response.error || "Failed to fetch leaderboard data from GolemDB");
      }
    } catch (err) {
      setError("Failed to fetch leaderboard data from GolemDB");
      console.error("Error fetching leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return rank.toString();
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatScore = (score: number) => {
    return score.toLocaleString();
  };

  return (
    <div className={styles.leaderboardBackground}>
      {/* Dark overlay for better text readability */}
      <div className={styles.overlay}></div>
      <div className={styles.content}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <TrophyIcon className="h-12 w-12 text-yellow-400" />
            <h1 className="text-5xl font-bold text-white">Leaderboard</h1>
            <TrophyIcon className="h-12 w-12 text-yellow-400" />
          </div>
          <p className="text-xl text-gray-300">Top defenders of the planet! Compete and climb the ranks!</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="loading loading-spinner loading-lg text-primary"></div>
              <p className="text-white text-lg">Loading leaderboard from GolemDB...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="alert alert-error mb-8">
            <div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
            <button className="btn btn-sm btn-outline" onClick={fetchLeaderboard}>
              Retry
            </button>
          </div>
        )}

        {/* Leaderboard Table */}
        {!loading && !error && (
          <div className={`bg-base-100/10 backdrop-blur-sm rounded-2xl shadow-2xl p-6 mb-8 ${styles.leaderboardCard}`}>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-white text-lg">Rank</th>
                    <th className="text-white text-lg">Player</th>
                    <th className="text-white text-lg">Score</th>
                    <th className="text-white text-lg">Address</th>
                    <th className="text-white text-lg">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map(entry => (
                    <tr key={entry.id} className="hover:bg-white/5 border-b border-white/10 transition-colors">
                      <td>
                        <div className="flex items-center justify-center">
                          <span className="text-2xl font-bold text-yellow-400">{getRankIcon(entry.rank)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-bold text-white text-lg">
                              {entry.ensName || formatAddress(entry.playerAddress)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-2xl font-bold text-green-400">{formatScore(entry.score)}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <Address address={entry.playerAddress as `0x${string}`} size="sm" onlyEnsOrAddress={true} />
                        </div>
                      </td>
                      <td>
                        <span className="text-gray-300">{entry.date}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Powered by GolemDB Banner */}
        <div className="flex items-center justify-center mb-8">
          <div className={`rounded-xl p-6 shadow-lg ${styles.golemBanner}`}>
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 flex items-center justify-center bg-white/20 rounded-lg">
                <span className="text-2xl font-bold text-white">G</span>
              </div>
              <div>
                <p className="text-white font-bold text-xl">Powered by GolemDB</p>
                <p className="text-blue-100 text-sm">Decentralized database powering the leaderboard</p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`bg-base-100/10 backdrop-blur-sm rounded-xl p-6 text-center ${styles.statsCard}`}>
            <div className="text-3xl font-bold text-yellow-400 mb-2">{leaderboard.length}</div>
            <div className="text-white">Total Players</div>
          </div>
          <div className={`bg-base-100/10 backdrop-blur-sm rounded-xl p-6 text-center ${styles.statsCard}`}>
            <div className="text-3xl font-bold text-green-400 mb-2">
              {leaderboard.length > 0 ? formatScore(leaderboard[0].score) : "0"}
            </div>
            <div className="text-white">Highest Score</div>
          </div>
          <div className={`bg-base-100/10 backdrop-blur-sm rounded-xl p-6 text-center ${styles.statsCard}`}>
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {leaderboard.reduce((sum, entry) => sum + entry.score, 0).toLocaleString()}
            </div>
            <div className="text-white">Total Points</div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className={`bg-base-100/10 backdrop-blur-sm rounded-xl p-8 ${styles.ctaCard}`}>
            <h3 className="text-2xl font-bold text-white mb-4">Think you can do better?</h3>
            <p className="text-gray-300 mb-6">Join the battle and defend the planet from meme attacks!</p>
            <a href="/game" className="btn btn-primary btn-lg">
              Play Now
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
