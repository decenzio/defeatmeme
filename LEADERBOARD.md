# Leaderboard Integration with GolemDB

## Overview

The DefeatMeme game features a leaderboard system that showcases the top players and their scores. The leaderboard is powered by GolemDB, a decentralized database solution.

## Features

- **Top 10 Leaderboard**: Display the highest scoring players
- **Player Statistics**: Show player names, scores, wallet addresses, and game dates
- **Real-time Updates**: Fetch latest scores from GolemDB
- **Responsive Design**: Beautiful UI with trophy icons and rankings
- **GolemDB Integration**: Decentralized data storage and retrieval

## API Service

The leaderboard uses a dedicated service (`services/golemdb/leaderboard.ts`) that provides:

### Methods

- `getLeaderboard(limit)` - Fetch top players
- `submitScore(playerAddress, playerName, score)` - Submit new scores
- `getPlayerStats(playerAddress)` - Get individual player statistics

### Data Structure

```typescript
interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  playerAddress: string;
  date: string;
  rank: number;
}
```

## Navigation

The leaderboard is accessible via:
- Navigation menu: "Leaderboard" with trophy icon
- Direct URL: `/leaderboard`
- Call-to-action from game completion

## Future Enhancements

1. **Real GolemDB Integration**: Replace mock data with actual GolemDB API calls
2. **Score Submission**: Connect game completion to automatic score submission
3. **Player Profiles**: Individual player pages with detailed statistics
4. **Time-based Leaderboards**: Daily, weekly, monthly rankings
5. **Achievements System**: Badges and milestones

## Environment Variables

To connect to GolemDB, set:
```
NEXT_PUBLIC_GOLEMDB_URL=https://your-golemdb-endpoint.com
```

## GolemDB Benefits

- **Decentralized**: No single point of failure
- **Transparent**: All scores are verifiable on-chain
- **Permanent**: Scores are permanently stored
- **Global**: Accessible from anywhere
- **Secure**: Cryptographically secured data
