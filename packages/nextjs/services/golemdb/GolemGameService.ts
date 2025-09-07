import { Annotation, Tagged, createClient } from "golem-base-sdk";
import type { AccountData, GolemBaseClient, GolemBaseCreate } from "golem-base-sdk";

export interface GameResult {
  id: string;
  playerAddress: string;
  totalKills: number;
  killsByType: number[];
  timestamp: number;
  blockNumber?: number;
  transactionHash?: string;
  gameSession: string;
  score: number;
}

export interface GameResultResponse extends GameResult {
  entityKey: string;
  expirationBlock?: number;
  stringAnnotations?: Record<string, string>;
  numericAnnotations?: Record<string, number>;
}

export interface GolemGameServiceConfig {
  privateKey: string;
  chainId: number;
  rpcUrl?: string;
  wsUrl?: string;
}

export class GolemGameService {
  private client: GolemBaseClient | null = null;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private config: GolemGameServiceConfig;

  constructor(config: GolemGameServiceConfig) {
    this.config = {
      rpcUrl: "https://ethwarsaw.holesky.golemdb.io/rpc",
      wsUrl: "wss://ethwarsaw.holesky.golemdb.io/rpc/ws",
      ...config,
    };
  }

  /**
   * Initialize connection to GolemDB
   */
  async connect(): Promise<void> {
    try {
      const rawKey = this.config.privateKey;
      const hexKey = rawKey.startsWith("0x") ? rawKey.slice(2) : rawKey;
      const key: AccountData = new Tagged("privatekey", new Uint8Array(Buffer.from(hexKey, "hex")));

      this.client = await createClient(this.config.chainId, key, this.config.rpcUrl!, this.config.wsUrl!);

      console.log("✅ Connected to GolemDB for game scores");
    } catch (error) {
      console.error("❌ Failed to connect to GolemDB:", error);
      throw error;
    }
  }

  /**
   * Save game result to GolemDB
   */
  async saveGameResult(gameResult: GameResult): Promise<GameResultResponse> {
    this.ensureConnected();

    // Calculate score based on total kills and efficiency
    const score = this.calculateScore(gameResult);
    const resultWithScore = { ...gameResult, score };

    const entityData: GolemBaseCreate = {
      data: this.serializeData(resultWithScore),
      btl: 86400, // 24 hours (assuming ~12 seconds per block)
      stringAnnotations: this.createStringAnnotations(resultWithScore),
      numericAnnotations: this.createNumericAnnotations(resultWithScore),
    };

    const [receipt] = await this.client!.createEntities([entityData]);

    return {
      ...resultWithScore,
      entityKey: receipt.entityKey,
      expirationBlock: receipt.expirationBlock,
    };
  }

  /**
   * Get leaderboard (top scores)
   */
  async getLeaderboard(limit: number = 10): Promise<GameResultResponse[]> {
    this.ensureConnected();

    // Query for game results ordered by score
    const entities = await this.client!.queryEntities('type = "game_result"');

    const results: GameResultResponse[] = [];

    for (const entity of entities) {
      const metadata = await this.client!.getEntityMetaData(entity.entityKey);
      const gameResult = this.deserializeData(entity.storageValue) as GameResult;

      results.push({
        ...gameResult,
        entityKey: entity.entityKey,
        stringAnnotations: this.annotationsToRecord(metadata.stringAnnotations),
        numericAnnotations: this.numericAnnotationsToRecord(metadata.numericAnnotations),
      });
    }

    // Sort by score (descending) and return top results
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Get player's game history
   */
  async getPlayerHistory(playerAddress: string): Promise<GameResultResponse[]> {
    this.ensureConnected();

    const query = `type = "game_result" && playerAddress = "${playerAddress.toLowerCase()}"`;
    const entities = await this.client!.queryEntities(query);

    const results: GameResultResponse[] = [];

    for (const entity of entities) {
      const metadata = await this.client!.getEntityMetaData(entity.entityKey);
      const gameResult = this.deserializeData(entity.storageValue) as GameResult;

      results.push({
        ...gameResult,
        entityKey: entity.entityKey,
        stringAnnotations: this.annotationsToRecord(metadata.stringAnnotations),
        numericAnnotations: this.numericAnnotationsToRecord(metadata.numericAnnotations),
      });
    }

    // Sort by timestamp (most recent first)
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get statistics for a specific meme type
   */
  async getMemeTypeStats(memeTypeIndex: number): Promise<{
    totalKills: number;
    gamesPlayed: number;
    averageKillsPerGame: number;
  }> {
    this.ensureConnected();

    const entities = await this.client!.queryEntities('type = "game_result"');

    let totalKills = 0;
    let gamesPlayed = 0;

    for (const entity of entities) {
      const gameResult = this.deserializeData(entity.storageValue) as GameResult;
      const killsForThisType = gameResult.killsByType[memeTypeIndex] || 0;

      if (killsForThisType > 0) {
        totalKills += killsForThisType;
        gamesPlayed++;
      }
    }

    return {
      totalKills,
      gamesPlayed,
      averageKillsPerGame: gamesPlayed > 0 ? totalKills / gamesPlayed : 0,
    };
  }

  /**
   * Get global game statistics
   */
  async getGlobalStats(): Promise<{
    totalGames: number;
    totalKills: number;
    averageScore: number;
    topScore: number;
    killsByMemeType: number[];
  }> {
    this.ensureConnected();

    const entities = await this.client!.queryEntities('type = "game_result"');

    let totalGames = 0;
    let totalKills = 0;
    let totalScore = 0;
    let topScore = 0;
    const killsByMemeType: number[] = new Array(9).fill(0); // Assuming 9 meme types

    for (const entity of entities) {
      const gameResult = this.deserializeData(entity.storageValue) as GameResult;

      totalGames++;
      totalKills += gameResult.totalKills;
      totalScore += gameResult.score;
      topScore = Math.max(topScore, gameResult.score);

      // Aggregate kills by meme type
      gameResult.killsByType.forEach((kills, index) => {
        if (index < killsByMemeType.length) {
          killsByMemeType[index] += kills;
        }
      });
    }

    return {
      totalGames,
      totalKills,
      averageScore: totalGames > 0 ? totalScore / totalGames : 0,
      topScore,
      killsByMemeType,
    };
  }

  // Private helper methods

  private ensureConnected(): void {
    if (!this.client) {
      throw new Error("GolemGameService not connected. Call connect() first.");
    }
  }

  private calculateScore(gameResult: GameResult): number {
    // Score calculation: base points for kills + bonus for variety
    const baseScore = gameResult.totalKills * 10;

    // Bonus for killing different types of memes (variety bonus)
    const typesKilled = gameResult.killsByType.filter(count => count > 0).length;
    const varietyBonus = typesKilled * 50;

    // Efficiency bonus (kills per minute, assuming game length)
    const timeBonus = Math.floor(gameResult.totalKills * 2);

    return baseScore + varietyBonus + timeBonus;
  }

  private serializeData(data: any): Uint8Array {
    return this.encoder.encode(JSON.stringify(data));
  }

  private deserializeData(data: Uint8Array): any {
    const decoded = this.decoder.decode(data);
    try {
      return JSON.parse(decoded);
    } catch {
      return decoded;
    }
  }

  private createStringAnnotations(gameResult: GameResult): any[] {
    return [
      new Annotation("id", gameResult.id),
      new Annotation("type", "game_result"),
      new Annotation("playerAddress", gameResult.playerAddress.toLowerCase()),
      new Annotation("gameSession", gameResult.gameSession),
      new Annotation("transactionHash", gameResult.transactionHash || ""),
    ];
  }

  private createNumericAnnotations(gameResult: GameResult): any[] {
    const annotations = [
      new Annotation("totalKills", gameResult.totalKills),
      new Annotation("score", gameResult.score),
      new Annotation("timestamp", gameResult.timestamp),
    ];

    // Add individual meme type kill counts
    gameResult.killsByType.forEach((kills, index) => {
      annotations.push(new Annotation(`memeType${index}Kills`, kills));
    });

    if (gameResult.blockNumber) {
      annotations.push(new Annotation("blockNumber", gameResult.blockNumber));
    }

    return annotations;
  }

  private annotationsToRecord(annotations: any[]): Record<string, string> {
    const result: Record<string, string> = {};
    annotations.forEach(annotation => {
      result[annotation.key] = annotation.value.toString();
    });
    return result;
  }

  private numericAnnotationsToRecord(annotations: any[]): Record<string, number> {
    const result: Record<string, number> = {};
    annotations.forEach(annotation => {
      const numValue = Number(annotation.value);
      if (!isNaN(numValue)) {
        result[annotation.key] = numValue;
      }
    });
    return result;
  }
}
