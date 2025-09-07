import { NextRequest, NextResponse } from "next/server";
import { GolemGameService } from "~~/services/golemdb/GolemGameService";
import type { GameResult } from "~~/services/golemdb/GolemGameService";

// Initialize GolemDB service with environment variables
const golemService = new GolemGameService({
  privateKey: process.env.GOLEM_PRIVATE_KEY || "0x08cdc2904602db8ae6e6cd4cd45650cb45dfa49dd4db3029760a378ebade9d8d",
  chainId: parseInt(process.env.GOLEM_CHAIN_ID || "60138453033"),
  rpcUrl: process.env.GOLEM_RPC_URL || "https://ethwarsaw.holesky.golemdb.io/rpc",
  wsUrl: process.env.GOLEM_WS_URL || "wss://ethwarsaw.holesky.golemdb.io/rpc/ws",
});

// Initialize connection once
let isConnected = false;

async function ensureConnection() {
  if (!isConnected) {
    await golemService.connect();
    isConnected = true;
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureConnection();

    const body = await request.json();
    const { playerAddress, killsByType, transactionHash, blockNumber, gameSession } = body;

    // Validate required fields
    if (!playerAddress || !killsByType || !Array.isArray(killsByType)) {
      return NextResponse.json({ error: "Missing required fields: playerAddress, killsByType" }, { status: 400 });
    }

    // Calculate total kills
    const totalKills = killsByType.reduce((sum: number, kills: number) => sum + kills, 0);

    // Create game result object
    const gameResult: GameResult = {
      id: `game_${playerAddress}_${Date.now()}`,
      playerAddress: playerAddress.toLowerCase(),
      totalKills,
      killsByType,
      timestamp: Date.now(),
      blockNumber,
      transactionHash,
      gameSession: gameSession || `session_${Date.now()}`,
      score: 0, // Will be calculated by the service
    };

    // Save to GolemDB
    const savedResult = await golemService.saveGameResult(gameResult);

    console.log("✅ Game result saved to GolemDB:", savedResult.entityKey);

    return NextResponse.json({
      success: true,
      entityKey: savedResult.entityKey,
      score: savedResult.score,
      gameResult: savedResult,
    });
  } catch (error) {
    console.error("❌ Error saving game result to GolemDB:", error);
    return NextResponse.json({ error: "Failed to save game result" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureConnection();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    console.log(`📡 GolemDB API request: ${action}`);

    switch (action) {
      case "leaderboard": {
        const limit = parseInt(searchParams.get("limit") || "10");
        console.log(`🏆 Fetching leaderboard with limit: ${limit}`);

        const leaderboard = await golemService.getLeaderboard(limit);
        console.log(`✅ Retrieved ${leaderboard.length} leaderboard entries`);

        return NextResponse.json({ leaderboard });
      }

      case "player-history": {
        const playerAddress = searchParams.get("playerAddress");
        if (!playerAddress) {
          return NextResponse.json({ error: "playerAddress is required" }, { status: 400 });
        }

        console.log(`👤 Fetching history for player: ${playerAddress}`);
        const history = await golemService.getPlayerHistory(playerAddress);
        console.log(`✅ Retrieved ${history.length} games for player`);

        return NextResponse.json({ history });
      }

      case "global-stats": {
        console.log("📊 Fetching global stats");
        const stats = await golemService.getGlobalStats();
        console.log("✅ Retrieved global stats:", {
          totalGames: stats.totalGames,
          totalKills: stats.totalKills,
        });

        return NextResponse.json({ stats });
      }

      case "meme-stats": {
        const memeTypeIndex = parseInt(searchParams.get("memeTypeIndex") || "0");
        console.log(`🎯 Fetching meme stats for type: ${memeTypeIndex}`);

        const stats = await golemService.getMemeTypeStats(memeTypeIndex);
        console.log(`✅ Retrieved meme stats:`, stats);

        return NextResponse.json({ stats });
      }

      default:
        console.warn(`❓ Unknown action: ${action}`);
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("❌ GolemDB API Error:", error);

    // Provide more specific error messages
    let errorMessage = "Failed to fetch data";
    if (error instanceof Error) {
      if (error.message.includes("connect")) {
        errorMessage = "Unable to connect to GolemDB network";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Request timed out - GolemDB may be busy";
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 },
    );
  }
}
