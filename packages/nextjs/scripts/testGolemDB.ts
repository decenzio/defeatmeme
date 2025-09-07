import { GolemGameService } from "~~/services/golemdb/GolemGameService";

// Demo script to test GolemDB integration
async function testGolemDB() {
  console.log("🚀 Testing GolemDB integration...");

  const service = new GolemGameService({
    privateKey: process.env.GOLEM_PRIVATE_KEY || "0x08cdc2904602db8ae6e6cd4cd45650cb45dfa49dd4db3029760a378ebade9d8d",
    chainId: parseInt(process.env.GOLEM_CHAIN_ID || "60138453033"),
    rpcUrl: process.env.GOLEM_RPC_URL || "https://ethwarsaw.holesky.golemdb.io/rpc",
    wsUrl: process.env.GOLEM_WS_URL || "wss://ethwarsaw.holesky.golemdb.io/rpc/ws",
  });

  try {
    // Connect to GolemDB
    await service.connect();
    console.log("✅ Connected to GolemDB");

    // Create sample game results
    const sampleGameResults = [
      {
        id: `test_game_1_${Date.now()}`,
        playerAddress: "0x1234567890123456789012345678901234567890",
        totalKills: 25,
        killsByType: [5, 8, 3, 2, 4, 1, 2, 0, 0],
        timestamp: Date.now(),
        blockNumber: 12345,
        transactionHash: "0xabc123...",
        gameSession: `test_session_${Date.now()}`,
        score: 0, // Will be calculated
      },
      {
        id: `test_game_2_${Date.now() + 1}`,
        playerAddress: "0x9876543210987654321098765432109876543210",
        totalKills: 35,
        killsByType: [7, 6, 4, 8, 3, 2, 3, 1, 1],
        timestamp: Date.now() + 1000,
        blockNumber: 12346,
        transactionHash: "0xdef456...",
        gameSession: `test_session_${Date.now() + 1}`,
        score: 0, // Will be calculated
      },
    ];

    // Save sample results
    console.log("💾 Saving sample game results...");
    for (const gameResult of sampleGameResults) {
      const saved = await service.saveGameResult(gameResult);
      console.log(`✅ Saved game result with key: ${saved.entityKey}, score: ${saved.score}`);
    }

    // Test queries
    console.log("📊 Testing queries...");

    // Get leaderboard
    const leaderboard = await service.getLeaderboard(5);
    console.log(
      "🏆 Leaderboard:",
      leaderboard.map(r => ({
        player: r.playerAddress.slice(0, 8) + "...",
        score: r.score,
        kills: r.totalKills,
      })),
    );

    // Get global stats
    const globalStats = await service.getGlobalStats();
    console.log("🌍 Global Stats:", globalStats);

    // Get player history
    const playerHistory = await service.getPlayerHistory(sampleGameResults[0].playerAddress);
    console.log("👤 Player History:", playerHistory.length, "games");

    console.log("✅ GolemDB test completed successfully!");
  } catch (error) {
    console.error("❌ GolemDB test failed:", error);
  }
}

// Run the test
if (require.main === module) {
  testGolemDB();
}

export { testGolemDB };
