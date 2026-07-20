import React, { useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  TrendingUpRounded,
  TrendingDownRounded,
  SentimentSatisfiedAlt,
  SentimentDissatisfied,
  GraphicEqRounded,
  TheaterComedy,
} from "@mui/icons-material";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  BarChart,
  Bar,
} from "recharts";
import Header from "components/Header";
import DashCard from "components/DashCard";
import QueryState from "components/QueryState";
import { dataGridSx } from "utils/dataGridSx";
import { getChartTheme, formatSeriesLabel } from "utils/chartTheme";
import {
  useGetVibeStatsQuery,
  useGetVibeTimelineQuery,
  useGetVibeEmotionsQuery,
  useGetVibeMembersQuery,
} from "state/api";

const RANGE_OPTIONS = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const formatScore = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(3)}`;
};

const formatPct = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${Math.round(v * 100)}%`;
};

const formatPeriodLabel = (period, groupBy) => {
  if (!period) return "";
  if (groupBy === "month") {
    const d = new Date(`${period}-01T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    }
    return period;
  }
  const d = new Date(`${String(period).slice(0, 10)}T12:00:00`);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return period;
};

const deltaRatio = (current, prior) => {
  if (!Number.isFinite(prior) || prior === 0) {
    if (!Number.isFinite(current) || current === 0) return 0;
    return current > 0 ? 1 : -1;
  }
  return current / prior - 1;
};

const TrendChip = ({ change }) => {
  const theme = useTheme();
  if (!Number.isFinite(change) || change === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        flat vs prior
      </Typography>
    );
  }
  const up = change > 0;
  return (
    <Typography
      variant="caption"
      fontWeight={700}
      sx={{
        color: up ? theme.palette.green.default : theme.palette.red.default,
        display: "inline-flex",
        alignItems: "center",
        gap: 0.25,
      }}
    >
      {`${up ? "+" : ""}${Math.round(change * 100)}%`}
      {up ? (
        <TrendingUpRounded sx={{ fontSize: 14 }} />
      ) : (
        <TrendingDownRounded sx={{ fontSize: 14 }} />
      )}
      <Box component="span" fontWeight={400} color="text.secondary" ml={0.25}>
        vs prior
      </Box>
    </Typography>
  );
};

const StatTile = ({ label, value, icon, change }) => {
  const theme = useTheme();
  return (
    <DashCard sx={{ gridColumn: { xs: "span 12", sm: "span 6", md: "span 3" } }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <Box color={theme.palette.secondary.main}>{icon}</Box>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
        <Typography variant="h4" fontWeight={700}>
          {value}
        </Typography>
        <Box mt={0.5}>
          <TrendChip change={change} />
        </Box>
      </CardContent>
    </DashCard>
  );
};

const Vibes = () => {
  const theme = useTheme();
  const chart = getChartTheme(theme);
  const navigate = useNavigate();
  const isMd = useMediaQuery("(min-width: 900px)");
  const [range, setRange] = useState("month");

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useGetVibeStatsQuery(range);

  const {
    data: timeline,
    isLoading: timelineLoading,
    error: timelineError,
    refetch: refetchTimeline,
  } = useGetVibeTimelineQuery(range);

  const {
    data: emotionsData,
    isLoading: emotionsLoading,
    error: emotionsError,
    refetch: refetchEmotions,
  } = useGetVibeEmotionsQuery(range);

  const {
    data: membersData,
    isLoading: membersLoading,
    error: membersError,
    refetch: refetchMembers,
  } = useGetVibeMembersQuery(range);

  const current = stats?.current;
  const prior = stats?.prior;

  const timelinePoints = useMemo(
    () =>
      (timeline?.points || []).map((p) => {
        const score = Number(p.avg_score) || 0;
        return {
          ...p,
          avg_score: score,
          // Split fill toward zero: green above, red below
          pos_score: Math.max(score, 0),
          neg_score: Math.min(score, 0),
          label: formatPeriodLabel(p.period, timeline?.groupBy),
        };
      }),
    [timeline]
  );

  const emotionBars = useMemo(
    () =>
      (emotionsData?.emotions || [])
        .filter((e) => e.emotion !== "neutral")
        .slice(0, 10)
        .map((e) => ({
          emotion: formatSeriesLabel(e.emotion),
          count: e.count,
        })),
    [emotionsData]
  );

  const columns = useMemo(
    () => [
      {
        field: "display_name",
        headerName: "Member",
        flex: 1.2,
        minWidth: 160,
        renderCell: (params) => (
          <Box display="flex" alignItems="center" gap={1} minWidth={0}>
            <Avatar
              src={params.row.avatar || undefined}
              alt=""
              sx={{ width: 28, height: 28 }}
            >
              {(params.value || "?").charAt(0)}
            </Avatar>
            <Box minWidth={0}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {params.value || params.row.user_name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {params.row.label}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        field: "avg_score",
        headerName: "Avg score",
        flex: 0.7,
        minWidth: 100,
        valueFormatter: ({ value }) => formatScore(value),
      },
      {
        field: "positive_pct",
        headerName: "Positive",
        flex: 0.6,
        minWidth: 90,
        valueFormatter: ({ value }) => formatPct(value),
      },
      {
        field: "negative_pct",
        headerName: "Negative",
        flex: 0.6,
        minWidth: 90,
        valueFormatter: ({ value }) => formatPct(value),
      },
      {
        field: "sarcasm_rate",
        headerName: "Sarcasm",
        flex: 0.6,
        minWidth: 90,
        valueFormatter: ({ value }) => formatPct(value),
      },
      {
        field: "toxicity_rate",
        headerName: "Toxicity",
        flex: 0.6,
        minWidth: 90,
        valueFormatter: ({ value }) => formatPct(value),
      },
      {
        field: "scored_count",
        headerName: "Messages",
        flex: 0.7,
        minWidth: 100,
        type: "number",
      },
    ],
    []
  );

  const rows = useMemo(
    () =>
      (membersData?.members || []).map((m) => ({
        id: m.member_id,
        ...m,
        positive_pct: m.polarity?.positive ?? 0,
        negative_pct: m.polarity?.negative ?? 0,
      })),
    [membersData]
  );

  return (
    <Box>
      <Box
        display="flex"
        alignItems={{ xs: "stretch", sm: "flex-end" }}
        justifyContent="space-between"
        flexDirection={{ xs: "column", sm: "row" }}
        gap={1.5}
        mb={0.5}
      >
        <Header
          title="Vibes"
          subtitle="Server mood from message sentiment"
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="vibes-range-label">Range</InputLabel>
          <Select
            labelId="vibes-range-label"
            label="Range"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            {RANGE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box
        display="grid"
        gridTemplateColumns="repeat(12, 1fr)"
        gap={2}
        mt={1.5}
      >
        {statsError ? (
          <DashCard sx={{ gridColumn: "span 12" }}>
            <CardContent>
              <QueryState
                isLoading={false}
                error={statsError}
                onRetry={refetchStats}
              />
            </CardContent>
          </DashCard>
        ) : (
          <>
            <StatTile
              label="Avg vibe score"
              value={statsLoading ? "…" : formatScore(current?.avgScore)}
              change={deltaRatio(current?.avgScore, prior?.avgScore)}
              icon={<GraphicEqRounded fontSize="small" />}
            />
            <StatTile
              label="Positive"
              value={statsLoading ? "…" : formatPct(current?.polarity?.positive)}
              change={deltaRatio(
                current?.polarity?.positive,
                prior?.polarity?.positive
              )}
              icon={<SentimentSatisfiedAlt fontSize="small" />}
            />
            <StatTile
              label="Negative"
              value={statsLoading ? "…" : formatPct(current?.polarity?.negative)}
              change={deltaRatio(
                current?.polarity?.negative,
                prior?.polarity?.negative
              )}
              icon={<SentimentDissatisfied fontSize="small" />}
            />
            <StatTile
              label="Sarcasm rate"
              value={statsLoading ? "…" : formatPct(current?.sarcasmRate)}
              change={deltaRatio(current?.sarcasmRate, prior?.sarcasmRate)}
              icon={<TheaterComedy fontSize="small" />}
            />
          </>
        )}

        <DashCard
          sx={{
            gridColumn: { xs: "span 12", md: "span 7" },
            minHeight: 320,
          }}
        >
          <CardContent sx={{ height: "100%" }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Vibe trend
            </Typography>
            {timelineLoading || timelineError ? (
              <QueryState
                isLoading={timelineLoading}
                error={timelineError}
                onRetry={refetchTimeline}
              />
            ) : (
              <Box height={260}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={timelinePoints} margin={chart.margin}>
                    <defs>
                      <linearGradient id="vibePos" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={theme.palette.green.default}
                          stopOpacity={0.65}
                        />
                        <stop
                          offset="95%"
                          stopColor={theme.palette.green.default}
                          stopOpacity={0.2}
                        />
                      </linearGradient>
                      <linearGradient id="vibeNeg" x1="0" y1="1" x2="0" y2="0">
                        <stop
                          offset="5%"
                          stopColor={theme.palette.red.default}
                          stopOpacity={0.65}
                        />
                        <stop
                          offset="95%"
                          stopColor={theme.palette.red.default}
                          stopOpacity={0.2}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke={chart.gridStroke}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={chart.tick}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      tick={chart.tick}
                      axisLine={false}
                      tickLine={false}
                      domain={["auto", "auto"]}
                      width={48}
                      tickFormatter={(v) => Number(v).toFixed(2)}
                    />
                    <ReferenceLine
                      y={0}
                      stroke={theme.palette.text.secondary}
                      strokeDasharray="5 5"
                      strokeOpacity={0.7}
                      ifOverflow="extendDomain"
                    />
                    <Tooltip
                      contentStyle={chart.tooltip.contentStyle}
                      labelStyle={chart.tooltip.labelStyle}
                      formatter={(value, name) => {
                        if (name !== "avg_score") return [null, null];
                        return [formatScore(value), "Avg score"];
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="pos_score"
                      stroke="none"
                      fill="url(#vibePos)"
                      fillOpacity={1}
                      isAnimationActive={false}
                      legendType="none"
                      tooltipType="none"
                    />
                    <Area
                      type="monotone"
                      dataKey="neg_score"
                      stroke="none"
                      fill="url(#vibeNeg)"
                      fillOpacity={1}
                      isAnimationActive={false}
                      legendType="none"
                      tooltipType="none"
                    />
                    <Line
                      type="monotone"
                      dataKey="avg_score"
                      stroke={theme.palette.secondary.main}
                      strokeWidth={1.75}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </Box>
            )}
          </CardContent>
        </DashCard>

        <DashCard
          sx={{
            gridColumn: { xs: "span 12", md: "span 5" },
            minHeight: 320,
          }}
        >
          <CardContent sx={{ height: "100%" }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Top emotions
            </Typography>
            {emotionsLoading || emotionsError ? (
              <QueryState
                isLoading={emotionsLoading}
                error={emotionsError}
                onRetry={refetchEmotions}
              />
            ) : (
              <Box height={260}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={emotionBars}
                    layout="vertical"
                    margin={{ ...chart.margin, left: 8 }}
                  >
                    <CartesianGrid
                      stroke={chart.gridStroke}
                      horizontal={false}
                    />
                    <XAxis type="number" tick={chart.tick} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="emotion"
                      width={88}
                      tick={chart.tick}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={chart.tooltip.contentStyle}
                      labelStyle={chart.tooltip.labelStyle}
                    />
                    <Bar
                      dataKey="count"
                      fill={theme.palette.secondary.main}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </CardContent>
        </DashCard>

        <DashCard sx={{ gridColumn: "span 12" }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Member vibes
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={1.5}>
              Min 20 scored messages in range. Click a row for their profile.
            </Typography>
            {membersLoading || membersError ? (
              <QueryState
                isLoading={membersLoading}
                error={membersError}
                onRetry={refetchMembers}
              />
            ) : (
              <Box height={isMd ? 420 : 360} width="100%">
                <DataGrid
                  rows={rows}
                  columns={columns}
                  disableRowSelectionOnClick
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 10 } },
                  }}
                  onRowClick={(params) => navigate(`/members/${params.id}`)}
                  sx={{
                    ...dataGridSx(theme),
                    cursor: "pointer",
                    "& .MuiDataGrid-cell": { display: "flex", alignItems: "center" },
                  }}
                  components={{
                    NoRowsOverlay: () => (
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        height="100%"
                      >
                        <Typography color="text.secondary">
                          No members meet the threshold for this range.
                        </Typography>
                      </Box>
                    ),
                  }}
                />
              </Box>
            )}
            <Typography variant="caption" color="text.secondary" mt={1} display="block">
              Tip: open any{" "}
              <Box
                component={RouterLink}
                to="/members"
                sx={{ color: "secondary.main" }}
              >
                member profile
              </Box>{" "}
              for a full vibe characterization.
            </Typography>
          </CardContent>
        </DashCard>
      </Box>
    </Box>
  );
};

export default Vibes;
