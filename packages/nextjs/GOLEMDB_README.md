# GolemDB Integration for Defeat Meme Game

This integration connects the Defeat Meme game with GolemDB, a decentralized database, to store game scores and leaderboard data.

## Overview

When players finish a game and submit their results to the blockchain, the game also automatically saves their score data to GolemDB. This allows for:

- **Persistent Leaderboards**: Game scores are stored decentralized and accessible across sessions
- **Player History**: Track individual player performance over time
- **Global Statistics**: Aggregate data across all players and games
- **Meme Analytics**: See which memes are being defeated the most

## Features

### 🎮 Game Data Storage

- **Automatic Submission**: Game results are automatically saved to GolemDB after blockchain submission
- **Score Calculation**: Smart scoring system based on kills, variety, and efficiency
- **Rich Metadata**: Stores kill counts by meme type, timestamps, and blockchain transaction data

### 📊 Analytics & Leaderboards

- **Top Players**: Real-time leaderboard with top scores
- **Global Stats**: Total games played, kills, and average scores
- **Meme Statistics**: Which memes are defeated most frequently
- **Player History**: Individual player game history and progression

### 🌐 Decentralized Storage

- **GolemDB Integration**: Leverages decentralized database technology
- **Data Persistence**: Scores survive beyond local storage
- **Cross-Session Access**: Data available from any device/session

## Architecture

### Components

1. **GolemGameService** (`services/golemdb/GolemGameService.ts`)

   - Core service for GolemDB interactions
   - Handles connection, data serialization, and queries
   - Implements scoring algorithm

2. **API Endpoint** (`app/api/golemdb/route.ts`)

   - Next.js API route for GolemDB operations
   - Handles POST (save results) and GET (fetch data) requests
   - Server-side GolemDB connection management

3. **useGolemDB Hook** (`hooks/scaffold-eth/useGolemDB.ts`)

   - React hook for easy GolemDB integration
   - Provides methods for saving and querying game data
   - Handles loading states and error management

4. **LeaderboardCard Component** (`components/custom/LeaderboardCard.tsx`)
   - Displays leaderboard and global statistics
   - Real-time data updates
   - Responsive design with meme visualizations

### Data Structure

```typescript
interface GameResult {
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
```

### Scoring Algorithm

The scoring system rewards:

- **Base Points**: 10 points per kill
- **Variety Bonus**: 50 points per different meme type defeated
- **Efficiency Bonus**: 2 points per kill (time-based multiplier)

## Setup

### Environment Variables

Add to your `.env.local` file:

```env
# GolemDB Configuration
GOLEM_PRIVATE_KEY=0x08cdc2904602db8ae6e6cd4cd45650cb45dfa49dd4db3029760a378ebade9d8d
GOLEM_CHAIN_ID=60138453033
GOLEM_RPC_URL=https://ethwarsaw.holesky.golemdb.io/rpc
GOLEM_WS_URL=wss://ethwarsaw.holesky.golemdb.io/rpc/ws
```

### Installation

The necessary dependencies are already included:

```bash
yarn add golem-base-sdk
```

### Testing

Test the GolemDB integration:

```bash
yarn test-golemdb
```

## Usage

### In Game Component

The game automatically saves results when users submit:

```typescript
import { useGolemDB } from "~~/hooks/scaffold-eth/useGolemDB";

const { saveGameResult } = useGolemDB();

// After successful blockchain submission
await saveGameResult({
  killsByType: [5, 3, 7, 2, 1, 0, 4, 2, 1],
  transactionHash: "0x...",
  blockNumber: 12345,
  gameSession: "session_123",
});
```

### Leaderboard Display

```typescript
import { useGolemDB } from "~~/hooks/scaffold-eth/useGolemDB";

const { getLeaderboard, getGlobalStats } = useGolemDB();

const leaderboard = await getLeaderboard(10);
const stats = await getGlobalStats();
```

## API Endpoints

### POST /api/golemdb

Save game result to GolemDB.

**Request Body:**

```json
{
  "playerAddress": "0x...",
  "killsByType": [5, 3, 7, 2, 1, 0, 4, 2, 1],
  "transactionHash": "0x...",
  "blockNumber": 12345,
  "gameSession": "session_123"
}
```

**Response:**

```json
{
  "success": true,
  "entityKey": "0x...",
  "score": 420,
  "gameResult": { ... }
}
```

### GET /api/golemdb

#### Get Leaderboard

`GET /api/golemdb?action=leaderboard&limit=10`

#### Get Player History

`GET /api/golemdb?action=player-history&playerAddress=0x...`

#### Get Global Stats

`GET /api/golemdb?action=global-stats`

#### Get Meme Stats

`GET /api/golemdb?action=meme-stats&memeTypeIndex=0`

## Data Flow

1. **Game Completion**: Player finishes game and defeats memes
2. **Blockchain Submission**: Results submitted to smart contract
3. **GolemDB Storage**: Game data automatically saved to GolemDB
4. **Leaderboard Update**: Real-time leaderboards reflect new scores
5. **Analytics**: Global statistics updated with new data

## Benefits

### For Players

- **Persistent Progress**: Scores saved across sessions
- **Competition**: Compare against other players globally
- **Achievement Tracking**: Personal history and improvement

### For Developers

- **Decentralized Data**: No single point of failure
- **Rich Analytics**: Detailed player behavior insights
- **Scalable Storage**: GolemDB handles data growth

### For the Ecosystem

- **Interoperability**: Data accessible by other applications
- **Transparency**: Open, verifiable game statistics
- **Innovation**: Foundation for future gaming features

## Future Enhancements

- **Player Profiles**: Extended player statistics and achievements
- **Tournaments**: Organized competitions with time-based leaderboards
- **NFT Integration**: Achievement NFTs based on performance
- **Social Features**: Player following and friend systems
- **Advanced Analytics**: Detailed gameplay pattern analysis

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check environment variables and network connectivity
2. **Scoring Discrepancies**: Verify kill counts and scoring algorithm
3. **Missing Data**: Ensure proper error handling in submission flow

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=golem:*
```

### Support

For GolemDB specific issues, refer to the [GolemDB documentation](https://docs.golemdb.io) or contact support.

---

_This integration demonstrates the power of combining blockchain gaming with decentralized databases for a truly Web3 gaming experience._
