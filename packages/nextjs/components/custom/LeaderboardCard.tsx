"use client";

import { useEffect, useState } from "react";
import { useGolemDB } from "~~/hooks/scaffold-eth/useGolemDB";
import type { GameResultResponse } from "~~/services/golemdb/GolemGameService";

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

export default function LeaderboardCard() {
  const { getLeaderboard, getGlobalStats, loading } = useGolemDB();
  const [leaderboard, setLeaderboard] = useState<GameResultResponse[]>([]);
  const [globalStats, setGlobalStats] = useState<{
    totalGames: number;
    totalKills: number;
    averageScore: number;
    topScore: number;
    killsByMemeType: number[];
  } | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadDataAsync = async () => {
      try {
        setRefreshing(true);
        const [leaderboardData, statsData] = await Promise.all([getLeaderboard(10), getGlobalStats()]);

        setLeaderboard(leaderboardData);
        setGlobalStats(statsData);
      } catch (error) {
        console.error("Failed to load leaderboard data:", error);
      } finally {
        setRefreshing(false);
      }
    };

    loadDataAsync();
  }, [getLeaderboard, getGlobalStats]);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [leaderboardData, statsData] = await Promise.all([getLeaderboard(10), getGlobalStats()]);

      setLeaderboard(leaderboardData);
      setGlobalStats(statsData);
    } catch (error) {
      console.error("Failed to load leaderboard data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="bg-base-100 p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">🏆 GolemDB Leaderboard</h2>
        <button onClick={loadData} disabled={refreshing || loading} className="btn btn-sm btn-primary">
          {refreshing || loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Global Stats */}
      {globalStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">Total Games</div>
            <div className="stat-value text-lg">{globalStats.totalGames}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">Total Kills</div>
            <div className="stat-value text-lg">{globalStats.totalKills.toLocaleString()}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">Average Score</div>
            <div className="stat-value text-lg">{Math.round(globalStats.averageScore)}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">Top Score</div>
            <div className="stat-value text-lg">{globalStats.topScore.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Score</th>
              <th>Total Kills</th>
              <th>Date</th>
              <th>Most Killed Meme</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 opacity-60">
                  No games recorded yet. Be the first to play!
                </td>
              </tr>
            ) : (
              leaderboard.map((game, index) => {
                const mostKilledIndex = game.killsByType.indexOf(Math.max(...game.killsByType));
                const mostKilledMeme = MEME_IMAGES[mostKilledIndex] || "unknown";
                const mostKilledCount = game.killsByType[mostKilledIndex] || 0;

                return (
                  <tr key={game.entityKey}>
                    <td>
                      <div className="flex items-center gap-2">
                        {index === 0 && "🥇"}
                        {index === 1 && "🥈"}
                        {index === 2 && "🥉"}
                        {index > 2 && `#${index + 1}`}
                      </div>
                    </td>
                    <td>
                      <div className="font-mono text-sm">{formatAddress(game.playerAddress)}</div>
                    </td>
                    <td>
                      <div className="font-bold text-primary">{game.score.toLocaleString()}</div>
                    </td>
                    <td>{game.totalKills}</td>
                    <td className="text-sm opacity-70">{formatDate(game.timestamp)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/game/memes/${mostKilledMeme}`}
                          alt={mostKilledMeme}
                          width={24}
                          height={24}
                          className="rounded"
                        />
                        <span className="text-sm">{mostKilledCount}x</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {/* Most Killed Memes */}
      {globalStats && globalStats.killsByMemeType.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-bold mb-4">Most Defeated Memes</h3>
          <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
            {globalStats.killsByMemeType.map((kills, index) => (
              <div key={index} className="bg-base-200 rounded-lg p-3 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/game/memes/${MEME_IMAGES[index]}`}
                  alt={MEME_IMAGES[index]}
                  width={40}
                  height={40}
                  className="mx-auto mb-2"
                />
                <div className="text-xs font-bold">{kills}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 text-xs opacity-60 text-center">
        Data stored on GolemDB - Decentralized database for Web3
      </div>
    </div>
  );
}
