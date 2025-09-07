"use client";

import { useEffect, useState } from "react";
import { TrophyIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useGolemDB } from "~~/hooks/scaffold-eth/useGolemDB";
import type { GameResultResponse } from "~~/services/golemdb/GolemGameService";
import styles from "~~/styles/Leaderboard.module.css";

export default function LeaderboardPage() {
  const { getLeaderboard, getGlobalStats, loading } = useGolemDB();
  const [leaderboard, setLeaderboard] = useState<GameResultResponse[]>([]);
  const [globalStats, setGlobalStats] = useState<{
    totalGames: number;
    totalKills: number;
    averageScore: number;
    topScore: number;
    killsByMemeType: number[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<number>(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        console.log("🔄 Loading leaderboard data from GolemDB...");

        const [leaderboardData, statsData] = await Promise.all([getLeaderboard(10), getGlobalStats()]);

        console.log("✅ Leaderboard data loaded:", {
          leaderboardEntries: leaderboardData?.length || 0,
          hasStats: !!statsData,
        });

        setLeaderboard(leaderboardData || []);
        setGlobalStats(statsData);
        setHasData((leaderboardData && leaderboardData.length > 0) || (statsData && statsData.totalGames > 0));
      } catch (err) {
        console.error("❌ Error fetching leaderboard:", err);
        setError("Unable to connect to GolemDB. Please try again later.");
        setLeaderboard([]);
        setGlobalStats(null);
        setHasData(false);
      } finally {
        setIsInitialLoad(false);
      }
    };

    loadData();
  }, [getLeaderboard, getGlobalStats]); // Now safe because functions are memoized with useCallback

  const fetchLeaderboard = async () => {
    // Rate limiting: prevent calls within 2 seconds
    const now = Date.now();
    if (now - lastRefresh < 2000) {
      console.log("🚫 Rate limited: Too many refresh attempts");
      return;
    }

    try {
      setError(null);
      setLastRefresh(now);
      console.log("🔄 Refreshing leaderboard data...");

      const [leaderboardData, statsData] = await Promise.all([getLeaderboard(10), getGlobalStats()]);

      setLeaderboard(leaderboardData || []);
      setGlobalStats(statsData);
      setHasData((leaderboardData && leaderboardData.length > 0) || (statsData && statsData.totalGames > 0));

      console.log("✅ Leaderboard refreshed successfully");
    } catch (err) {
      console.error("❌ Error refreshing leaderboard:", err);
      setError("Unable to refresh leaderboard data. Please try again.");
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
        {loading && isInitialLoad && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="loading loading-spinner loading-lg text-primary"></div>
              <p className="text-white text-lg">Connecting to GolemDB...</p>
              <p className="text-gray-400 text-sm">Loading decentralized leaderboard data</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="alert alert-error mb-8">
            <div className="flex items-center gap-3">
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <div>
                <h3 className="font-bold">Connection Error</h3>
                <div className="text-xs">{error}</div>
              </div>
            </div>
            <button className="btn btn-sm btn-outline" onClick={fetchLeaderboard} disabled={loading}>
              {loading ? "Retrying..." : "Try Again"}
            </button>
          </div>
        )}

        {/* No Data State */}
        {!loading && !error && !hasData && (
          <div className="text-center py-16">
            <div className={`bg-base-100/10 backdrop-blur-sm rounded-2xl shadow-2xl p-12 ${styles.leaderboardCard}`}>
              <div className="text-6xl mb-6">🏆</div>
              <h2 className="text-3xl font-bold text-white mb-4">No Games Yet!</h2>
              <p className="text-gray-300 text-lg mb-6">Be the first player to set a score on the leaderboard!</p>
              <p className="text-gray-400 text-sm mb-8">
                Play the game, defeat some memes, and submit your results to appear here.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/game" className="btn btn-primary btn-lg">
                  🎮 Play Your First Game
                </a>
                <button className="btn btn-outline btn-lg" onClick={fetchLeaderboard} disabled={loading}>
                  🔄 Check Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        {!loading && !error && hasData && leaderboard.length > 0 && (
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
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12">
                        <div className="text-gray-400">
                          <div className="text-4xl mb-4">🎯</div>
                          <p className="text-lg">No players yet!</p>
                          <p className="text-sm">Be the first to claim the top spot</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    leaderboard.map((entry, index) => (
                      <tr key={entry.entityKey} className="hover:bg-white/5 border-b border-white/10 transition-colors">
                        <td>
                          <div className="flex items-center justify-center">
                            <span className="text-2xl font-bold text-yellow-400">{getRankIcon(index + 1)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-bold text-white text-lg">{formatAddress(entry.playerAddress)}</div>
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
                          <span className="text-gray-300">{new Date(entry.timestamp).toLocaleDateString()}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Powered by GolemDB Banner */}
        <div className="flex items-center justify-center mb-8">
          <div className={`rounded-xl p-6 shadow-lg ${styles.golemBanner}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 flex items-center justify-center bg-white/20 rounded-lg">
                  <span className="text-2xl font-bold text-white">G</span>
                  {!error && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"></div>}
                  {error && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full"></div>}
                </div>
                <div>
                  <p className="text-white font-bold text-xl">Powered by GolemDB</p>
                  <p className="text-blue-100 text-sm">
                    {error
                      ? "Connection issues"
                      : hasData
                        ? "Decentralized leaderboard active"
                        : "Ready for first players"}
                  </p>
                </div>
              </div>
              <button
                className="btn btn-sm btn-outline btn-ghost text-white"
                onClick={fetchLeaderboard}
                disabled={loading}
              >
                {loading ? <span className="loading loading-spinner loading-xs"></span> : "🔄"}
              </button>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        {hasData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className={`bg-base-100/10 backdrop-blur-sm rounded-xl p-6 text-center ${styles.statsCard}`}>
              <div className="text-3xl font-bold text-yellow-400 mb-2">{globalStats?.totalGames || 0}</div>
              <div className="text-white">Total Games</div>
            </div>
            <div className={`bg-base-100/10 backdrop-blur-sm rounded-xl p-6 text-center ${styles.statsCard}`}>
              <div className="text-3xl font-bold text-green-400 mb-2">
                {globalStats?.topScore ? formatScore(globalStats.topScore) : "0"}
              </div>
              <div className="text-white">Highest Score</div>
            </div>
            <div className={`bg-base-100/10 backdrop-blur-sm rounded-xl p-6 text-center ${styles.statsCard}`}>
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {globalStats?.totalKills ? globalStats.totalKills.toLocaleString() : "0"}
              </div>
              <div className="text-white">Total Kills</div>
            </div>
          </div>
        )}

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
