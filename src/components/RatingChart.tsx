import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

import type { PlayerId } from "../evolu/client";
import type { MatchRow, PlayerRow } from "../evolu/client";
import { K_FACTOR } from "../hooks/useLeagueData";

interface RatingChartProps {
  readonly matches: ReadonlyArray<MatchRow>;
  readonly players: ReadonlyArray<PlayerRow>;
  readonly playerAId: PlayerId | "";
  readonly playerBId: PlayerId | "";
  readonly currentRatings: ReadonlyMap<PlayerId, number>;
  readonly projectedDeltaA: number;
  readonly projectedDeltaB: number;
  readonly winnerId: PlayerId | "";
}

type ChartDataPoint = {
  date: string;
  formattedDate: string;
  [key: string]: number | string | null;
};

const PLAYER_A_COLOR = "#F7931A";
const PLAYER_B_COLOR = "#3B82F6";

// Custom tooltip formatter to show 1 decimal place - only for main player lines
const formatTooltipValue = (value: number | string | undefined, name: string | undefined): [string, string] | null => {
  if (value === null || value === undefined) return null;
  if (name === undefined) return null;
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return null;
  // Only show main player lines, not projections
  if (name.includes(" (proj)")) return null;
  return [num.toFixed(1), name];
};

// Custom legend that only shows the two players (not projection lines)
const CustomLegend = ({ payload }: { payload?: Array<{ value: string; color: string }> }) => {
  if (!payload) return null;
  
  // Filter only the main player lines (not projections with " (proj)" suffix)
  const playerItems = payload.filter(
    (entry) => !entry.value.includes(" (proj)")
  );
  
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: "20px", fontSize: "11px", paddingTop: "10px" }}>
      {playerItems.map((entry) => (
        <span key={entry.value} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: entry.color,
              display: "inline-block",
            }}
          />
          {entry.value}
        </span>
      ))}
    </div>
  );
};

export const RatingChart = ({
  matches,
  players,
  playerAId,
  playerBId,
  currentRatings,
  projectedDeltaA,
  projectedDeltaB,
  winnerId,
}: RatingChartProps) => {
  const playersById = useMemo(() => {
    const map = new Map<PlayerId, PlayerRow>();
    players.forEach((player) => map.set(player.id, player));
    return map;
  }, [players]);

  const chartData = useMemo(() => {
    const playerA = playerAId ? playersById.get(playerAId) : null;
    const playerB = playerBId ? playersById.get(playerBId) : null;
    
    // Need at least one player selected
    if (!playerA && !playerB) return null;

    // Check if both players are selected (for showing projection)
    const bothPlayersSelected = !!playerA && !!playerB;

    // Calculate cutoff date (90 days ago)
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffIso = cutoffDate.toISOString().split("T")[0];

    // Get ALL matches within last 90 days (not just those with selected players)
    // We need to process all matches to correctly calculate rating history
    const allMatches = matches
      .filter((match) => match.playedAt >= cutoffIso)
      .sort((a, b) => a.playedAt.localeCompare(b.playedAt));

    // Calculate rating snapshots at each match date
    // Initialize all players with their current ratings
    const ratingState = new Map<
      PlayerId,
      { rating: number; initial: number }
    >();

    players.forEach((player) => {
      ratingState.set(player.id, {
        rating: currentRatings.get(player.id) ?? player.initialRating,
        initial: player.initialRating,
      });
    });

    // Build data points by processing matches in reverse (from current to past)
    const dataPoints: ChartDataPoint[] = [];

    // Get current ratings for selected players
    const currentA = playerA ? ratingState.get(playerA.id)! : null;
    const currentB = playerB ? ratingState.get(playerB.id)! : null;

    // Determine who is winner and loser for projection
    const isPlayerAWinner = winnerId === playerAId;
    const isPlayerBWinner = winnerId === playerBId;

    // Add projection point (only if both players are selected)
    if (bothPlayersSelected && currentA && currentB) {
      dataPoints.push({
        date: new Date(now.getTime() + 86400000).toISOString(),
        formattedDate: "Projekce",
        [playerA.name]: null,
        [playerB.name]: null,
        [`${playerA.name} (proj)`]: isPlayerAWinner 
          ? currentA.rating + Math.abs(projectedDeltaA)
          : currentA.rating - Math.abs(projectedDeltaA),
        [`${playerB.name} (proj)`]: isPlayerBWinner
          ? currentB.rating + Math.abs(projectedDeltaB)
          : currentB.rating - Math.abs(projectedDeltaB),
      });
    }

    // Add current point
    const currentPoint: ChartDataPoint = {
      date: now.toISOString(),
      formattedDate: "Nyní",
    };
    if (playerA && currentA) {
      currentPoint[playerA.name] = currentA.rating;
      if (bothPlayersSelected) {
        currentPoint[`${playerA.name} (proj)`] = currentA.rating;
      }
    }
    if (playerB && currentB) {
      currentPoint[playerB.name] = currentB.rating;
      if (bothPlayersSelected) {
        currentPoint[`${playerB.name} (proj)`] = currentB.rating;
      }
    }
    dataPoints.push(currentPoint);

    // Process all matches in reverse order (from newest to oldest)
    // This way we can "revert" the ratings to get historical values
    const reversedMatches = [...allMatches].reverse();
    
    reversedMatches.forEach((match) => {
      const matchPlayerA = playersById.get(match.playerAId);
      const matchPlayerB = playersById.get(match.playerBId);
      if (!matchPlayerA || !matchPlayerB) return;

      const stateA = ratingState.get(match.playerAId);
      const stateB = ratingState.get(match.playerBId);
      if (!stateA || !stateB) return;

      // Calculate what the ratings were before this match
      const ratingA = stateA.rating;
      const ratingB = stateB.rating;

      const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
      const actualA = match.winnerId === match.playerAId ? 1 : 0;
      const deltaA = K_FACTOR * (actualA - expectedA);
      const deltaB = -deltaA;

      // Revert the ratings
      stateA.rating = ratingA - deltaA;
      stateB.rating = ratingB - deltaB;

      // Check if this match involves any of the selected players
      const involvesPlayerA = playerA && (match.playerAId === playerA.id || match.playerBId === playerA.id);
      const involvesPlayerB = playerB && (match.playerAId === playerB.id || match.playerBId === playerB.id);
      
      // Only add data point if at least one selected player was involved
      if (involvesPlayerA || involvesPlayerB) {
        const point: ChartDataPoint = {
          date: match.playedAt,
          formattedDate: formatDate(match.playedAt),
        };

        if (playerA) {
          const pointA = ratingState.get(playerA.id)?.rating ?? playerA.initialRating;
          point[playerA.name] = pointA;
          if (bothPlayersSelected) {
            point[`${playerA.name} (proj)`] = null;
          }
        }
        if (playerB) {
          const pointB = ratingState.get(playerB.id)?.rating ?? playerB.initialRating;
          point[playerB.name] = pointB;
          if (bothPlayersSelected) {
            point[`${playerB.name} (proj)`] = null;
          }
        }

        dataPoints.push(point);
      }
    });

    // Reverse to get chronological order (oldest to newest)
    dataPoints.reverse();

    // If no historical data, add starting point
    if (dataPoints.length <= (bothPlayersSelected ? 2 : 1)) {
      const startDate = new Date(cutoffDate);
      const startPoint: ChartDataPoint = {
        date: startDate.toISOString(),
        formattedDate: formatDate(startDate.toISOString()),
      };
      
      if (playerA) {
        startPoint[playerA.name] = playerA.initialRating;
        if (bothPlayersSelected) {
          startPoint[`${playerA.name} (proj)`] = null;
        }
      }
      if (playerB) {
        startPoint[playerB.name] = playerB.initialRating;
        if (bothPlayersSelected) {
          startPoint[`${playerB.name} (proj)`] = null;
        }
      }
      
      dataPoints.unshift(startPoint);
    }

    return {
      data: dataPoints,
      playerAName: playerA?.name ?? null,
      playerBName: playerB?.name ?? null,
      bothPlayersSelected,
    };
  }, [
    matches,
    players,
    playerAId,
    playerBId,
    playersById,
    currentRatings,
    projectedDeltaA,
    projectedDeltaB,
    winnerId,
  ]);

  if (!chartData) return null;

  const { data, playerAName, playerBName, bothPlayersSelected } = chartData;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
        >
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 10 }}
            tickMargin={5}
            axisLine={{ stroke: "rgba(0,0,0,0.1)" }}
            tickLine={{ stroke: "rgba(0,0,0,0.1)" }}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 10 }}
            axisLine={{ stroke: "rgba(0,0,0,0.1)" }}
            tickLine={{ stroke: "rgba(0,0,0,0.1)" }}
            width={35}
            tickFormatter={(value) => value.toFixed(0)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelStyle={{ fontSize: "11px", color: "rgba(0,0,0,0.6)" }}
            formatter={formatTooltipValue}
          />
          <Legend content={<CustomLegend />} />
          
          {/* Player A - solid line (history) */}
          {playerAName && (
            <Line
              type="monotone"
              dataKey={playerAName}
              stroke={PLAYER_A_COLOR}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              name={playerAName}
              connectNulls={false}
            />
          )}
          
          {/* Player B - solid line (history) */}
          {playerBName && (
            <Line
              type="monotone"
              dataKey={playerBName}
              stroke={PLAYER_B_COLOR}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              name={playerBName}
              connectNulls={false}
            />
          )}
          
          {/* Player A - projection line (only if both players selected) */}
          {playerAName && bothPlayersSelected && (
            <Line
              type="monotone"
              dataKey={`${playerAName} (proj)`}
              stroke={PLAYER_A_COLOR}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name={`${playerAName} (proj)`}
              connectNulls={true}
            />
          )}
          
          {/* Player B - projection line (only if both players selected) */}
          {playerBName && bothPlayersSelected && (
            <Line
              type="monotone"
              dataKey={`${playerBName} (proj)`}
              stroke={PLAYER_B_COLOR}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name={`${playerBName} (proj)`}
              connectNulls={true}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString("cs-CZ", {
    month: "short",
    day: "numeric",
  });
};
