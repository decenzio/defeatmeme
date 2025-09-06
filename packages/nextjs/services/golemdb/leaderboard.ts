// GolemDB API service for leaderboard data

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  playerAddress: string;
  ensName?: string;
  ensAvatar?: string;
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

      // For now, return mock data with real ENS names and their actual addresses
      const mockData: LeaderboardEntry[] = [
        {
          id: "1",
          playerName: "CryptoDefender",
          score: 15420,
          playerAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // vitalik.eth actual address
          ensName: "vitalik.eth",
          ensAvatar: "https://metadata.ens.domains/mainnet/avatar/vitalik.eth",
          date: new Date().toISOString().split("T")[0],
          rank: 1,
        },
        {
          id: "2",
          playerName: "MemeSlayer",
          score: 12850,
          playerAddress: "0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5", // nick.eth actual address
          ensName: "nick.eth",
          ensAvatar: "https://metadata.ens.domains/mainnet/avatar/nick.eth",
          date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
          rank: 2,
        },
        {
          id: "3",
          playerName: "PlanetGuard",
          score: 11200,
          playerAddress: "0x983110309620D911731Ac0932219af06091b6744", // brantly.eth actual address
          ensName: "brantly.eth",
          ensAvatar: "https://metadata.ens.domains/mainnet/avatar/brantly.eth",
          date: new Date(Date.now() - 172800000).toISOString().split("T")[0],
          rank: 3,
        },
        {
          id: "4",
          playerName: "GalaxyHero",
          score: 9850,
          playerAddress: "0x225f137127d9067788314bc7fcc1f36746a3c3B5", // luc.eth actual address
          ensName: "luc.eth",
          ensAvatar: "https://metadata.ens.domains/mainnet/avatar/luc.eth",
          date: new Date(Date.now() - 172800000).toISOString().split("T")[0],
          rank: 4,
        },
        {
          id: "5",
          playerName: "CosmicCat",
          score: 8920,
          playerAddress: "0x54BeCc7560a7924b5e05F5bF59a4bBb4F2387B8f", // actual address - no ENS
          ensName: undefined,
          ensAvatar: undefined,
          date: new Date(Date.now() - 259200000).toISOString().split("T")[0],
          rank: 5,
        },
        {
          id: "6",
          playerName: "StarFighter",
          score: 7650,
          playerAddress: "0xFb6916095ca1df60bb79Ce92cE3Ea74c37c5d359", // ens deployer address
          ensName: "ens.eth",
          ensAvatar: "https://metadata.ens.domains/mainnet/avatar/ens.eth",
          date: new Date(Date.now() - 259200000).toISOString().split("T")[0],
          rank: 6,
        },
        {
          id: "7",
          playerName: "AstroWarrior",
          score: 6420,
          playerAddress: "0x2FC93484614a1f87F1402595460312107D4dd06a", // actual address - no ENS
          ensName: undefined,
          ensAvatar: undefined,
          date: new Date(Date.now() - 345600000).toISOString().split("T")[0],
          rank: 7,
        },
        {
          id: "8",
          playerName: "StellarAce",
          score: 5890,
          playerAddress: "0xA2881A90Bf33F03E7a3f803765Cd2ED5c8928dFb", // neiman.eth actual address
          ensName: "neiman.eth",
          ensAvatar: "https://metadata.ens.domains/mainnet/avatar/neiman.eth",
          date: new Date(Date.now() - 345600000).toISOString().split("T")[0],
          rank: 8,
        },
        {
          id: "9",
          playerName: "NebulaNinja",
          score: 5234,
          playerAddress: "0x6fC21092DA55B392b045eD78F4732bff3C580e2c", // actual address - no ENS
          ensName: undefined,
          ensAvatar: undefined,
          date: new Date(Date.now() - 432000000).toISOString().split("T")[0],
          rank: 9,
        },
        {
          id: "10",
          playerName: "VoidVigilante",
          score: 4567,
          playerAddress: "0x0904Dac3347eA47d208F3Fd67402D039a3b99859", // hadrien.eth actual address
          ensName: "hadrien.eth",
          ensAvatar: "https://metadata.ens.domains/mainnet/avatar/hadrien.eth",
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
