import { NextResponse } from "next/server";
import { GolemGameService } from "~~/services/golemdb/GolemGameService";

const golemService = new GolemGameService({
  privateKey: process.env.GOLEM_PRIVATE_KEY || "0x08cdc2904602db8ae6e6cd4cd45650cb45dfa49dd4db3029760a378ebade9d8d",
  chainId: parseInt(process.env.GOLEM_CHAIN_ID || "60138453033"),
  rpcUrl: process.env.GOLEM_RPC_URL || "https://ethwarsaw.holesky.golemdb.io/rpc",
  wsUrl: process.env.GOLEM_WS_URL || "wss://ethwarsaw.holesky.golemdb.io/rpc/ws",
});

let isConnected = false;

async function ensureConnection() {
  if (!isConnected) {
    await golemService.connect();
    isConnected = true;
  }
}

export async function POST() {
  try {
    await ensureConnection();

    console.log("🎮 Creating sample game data for testing...");

    // Sample player addresses
    const samplePlayers = [
      "0x1234567890123456789012345678901234567890",
      "0x2345678901234567890123456789012345678901",
      "0x3456789012345678901234567890123456789012",
      "0x4567890123456789012345678901234567890123",
      "0x5678901234567890123456789012345678901234",
    ];

    const sampleGameResults = [];

    // Create varied game results
    for (let i = 0; i < 8; i++) {
      const playerIndex = i % samplePlayers.length;
      const randomMultiplier = Math.random() * 2 + 0.5; // 0.5 to 2.5

      const baseKills = Math.floor(15 * randomMultiplier);
      const killsByType = Array.from({ length: 9 }, () => Math.floor(Math.random() * Math.floor(baseKills / 3)));

      // Ensure total adds up correctly
      const currentTotal = killsByType.reduce((sum, kills) => sum + kills, 0);
      const difference = baseKills - currentTotal;
      if (difference > 0) {
        killsByType[Math.floor(Math.random() * killsByType.length)] += difference;
      }

      const totalKills = killsByType.reduce((sum, kills) => sum + kills, 0);

      const gameResult = {
        id: `sample_game_${i}_${Date.now()}`,
        playerAddress: samplePlayers[playerIndex],
        totalKills,
        killsByType,
        timestamp: Date.now() - i * 1000 * 60 * 30, // Spread over time
        blockNumber: 12345 + i,
        transactionHash: `0x${Math.random().toString(16).substr(2, 40)}`,
        gameSession: `sample_session_${i}_${Date.now()}`,
        score: 0, // Will be calculated by the service
      };

      sampleGameResults.push(gameResult);
    }

    // Save all sample results
    const savedResults = [];
    for (const gameResult of sampleGameResults) {
      const saved = await golemService.saveGameResult(gameResult);
      savedResults.push(saved);
      console.log(`✅ Created sample game: ${saved.entityKey}, score: ${saved.score}`);
    }

    return NextResponse.json({
      success: true,
      message: `Created ${savedResults.length} sample game results`,
      results: savedResults.map(r => ({
        entityKey: r.entityKey,
        score: r.score,
        player: r.playerAddress.slice(0, 8) + "...",
        kills: r.totalKills,
      })),
    });
  } catch (error) {
    console.error("❌ Error creating sample data:", error);
    return NextResponse.json(
      {
        error: "Failed to create sample data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
