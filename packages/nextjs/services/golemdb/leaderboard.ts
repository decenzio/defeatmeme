// GolemDB API service for leaderboard data

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  playerAddress: string;
  date: string;
  rank: number;
}

export interface GolemDBResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

class GolemDBService {
  private readonly baseUrl: string;

  constructor() {
    // TODO: Replace with actual GolemDB endpoint
    this.baseUrl = process.env.NEXT_PUBLIC_GOLEMDB_URL || "https://api.golemdb.example.com";
  }

  async getLeaderboard(limit: number = 10): Promise<GolemDBResponse<LeaderboardEntry[]>> {
    try {
      // TODO: Replace with actual GolemDB API call
      // const response = await fetch(`${this.baseUrl}/leaderboard?limit=${limit}`);
      // const data = await response.json();

      // For now, return mock data
      const mockData: LeaderboardEntry[] = [
        {
          id: "1",
          playerName: "CryptoDefender",
          score: 15420,
          playerAddress: "0x1234567890123456789012345678901234567890",
          date: new Date().toISOString().split("T")[0],
          rank: 1,
        },
        {
          id: "2",
          playerName: "MemeSlayer",
          score: 12850,
          playerAddress: "0x2345678901234567890123456789012345678901",
          date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
          rank: 2,
        },
        {
          id: "3",
          playerName: "PlanetGuard",
          score: 11200,
          playerAddress: "0x3456789012345678901234567890123456789012",
          date: new Date(Date.now() - 172800000).toISOString().split("T")[0],
          rank: 3,
        },
        {
          id: "4",
          playerName: "GalaxyHero",
          score: 9850,
          playerAddress: "0x4567890123456789012345678901234567890123",
          date: new Date(Date.now() - 172800000).toISOString().split("T")[0],
          rank: 4,
        },
        {
          id: "5",
          playerName: "CosmicCat",
          score: 8920,
          playerAddress: "0x5678901234567890123456789012345678901234",
          date: new Date(Date.now() - 259200000).toISOString().split("T")[0],
          rank: 5,
        },
        {
          id: "6",
          playerName: "StarFighter",
          score: 7650,
          playerAddress: "0x6789012345678901234567890123456789012345",
          date: new Date(Date.now() - 259200000).toISOString().split("T")[0],
          rank: 6,
        },
        {
          id: "7",
          playerName: "AstroWarrior",
          score: 6420,
          playerAddress: "0x7890123456789012345678901234567890123456",
          date: new Date(Date.now() - 345600000).toISOString().split("T")[0],
          rank: 7,
        },
        {
          id: "8",
          playerName: "StellarAce",
          score: 5890,
          playerAddress: "0x8901234567890123456789012345678901234567",
          date: new Date(Date.now() - 345600000).toISOString().split("T")[0],
          rank: 8,
        },
        {
          id: "9",
          playerName: "NebulaNinja",
          score: 5234,
          playerAddress: "0x9012345678901234567890123456789012345678",
          date: new Date(Date.now() - 432000000).toISOString().split("T")[0],
          rank: 9,
        },
        {
          id: "10",
          playerName: "VoidVigilante",
          score: 4567,
          playerAddress: "0x0123456789012345678901234567890123456789",
          date: new Date(Date.now() - 432000000).toISOString().split("T")[0],
          rank: 10,
        },
      ];

      return {
        success: true,
        data: mockData.slice(0, limit),
      };
    } catch (error) {
      console.error("Error fetching leaderboard from GolemDB:", error);
      return {
        success: false,
        data: [],
        error: "Failed to fetch leaderboard data",
      };
    }
  }

  async submitScore(playerAddress: string, playerName: string, score: number): Promise<GolemDBResponse<boolean>> {
    try {
      // TODO: Replace with actual GolemDB API call
      // const response = await fetch(`${this.baseUrl}/scores`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     playerAddress,
      //     playerName,
      //     score,
      //     timestamp: new Date().toISOString(),
      //   }),
      // });
      // const data = await response.json();

      console.log("Score submitted to GolemDB:", { playerAddress, playerName, score });

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      console.error("Error submitting score to GolemDB:", error);
      return {
        success: false,
        data: false,
        error: "Failed to submit score",
      };
    }
  }

  async getPlayerStats(playerAddress: string): Promise<GolemDBResponse<any>> {
    try {
      // TODO: Replace with actual GolemDB API call
      // const response = await fetch(`${this.baseUrl}/players/${playerAddress}/stats`);
      // const data = await response.json();

      console.log("Fetching stats for player:", playerAddress);

      const mockStats = {
        totalGames: 42,
        highestScore: 15420,
        averageScore: 8350,
        rank: 1,
        totalMemesDefeated: 1247,
      };

      return {
        success: true,
        data: mockStats,
      };
    } catch (error) {
      console.error("Error fetching player stats from GolemDB:", error);
      return {
        success: false,
        data: null,
        error: "Failed to fetch player statistics",
      };
    }
  }
}

export const golemDBService = new GolemDBService();
