import React, { useMemo, useState } from "react";
import {
  Box,
  CardContent,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  DevicesOutlined,
  ErrorOutline,
  VisibilityOutlined,
  GroupsOutlined,
  TimelineOutlined,
  TrendingUpRounded,
} from "@mui/icons-material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import Header from "components/Header";
import DashCard from "components/DashCard";
import QueryState from "components/QueryState";
import { dataGridSx } from "utils/dataGridSx";
import { formatCompact, getChartTheme } from "utils/chartTheme";
import {
  useGetUsageSummaryQuery,
  useGetUsageActivityQuery,
} from "state/api";

const RANGE_OPTIONS = [
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
];

const formatAxisDate = (value) => {
  if (!value) return "";
  if (typeof value === "string" && !value.includes("T") && value.length >= 10) {
    const d = new Date(`${value.slice(0, 10)}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatTooltipDate = (value) => {
  if (!value) return "";
  if (typeof value === "string" && value.length >= 10 && !value.includes(",")) {
    const d = new Date(`${value.slice(0, 10)}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatWhen = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const SectionHeader = ({ title, subtitle, icon }) => {
  const theme = useTheme();
  return (
    <Box mb={1.5} minWidth={0}>
      <Box display="flex" alignItems="center" gap={0.75} minWidth={0}>
        {icon && (
          <Box
            sx={{
              color: theme.palette.secondary[300],
              display: "flex",
              "& svg": { fontSize: 18 },
            }}
          >
            {icon}
          </Box>
        )}
        <Typography variant="h6" fontWeight={600} noWrap>
          {title}
        </Typography>
      </Box>
      {subtitle && (
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          mt={0.25}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
};

const MetricCell = ({ label, shortLabel, value, icon, accent, compact }) => {
  const theme = useTheme();
  const display =
    value == null ? "—" : formatCompact(Number(value) || 0);

  return (
    <Box
      sx={{
        minWidth: 0,
        px: { xs: 1.5, sm: 2 },
        py: { xs: 1.5, sm: 1.75 },
      }}
    >
      <Box display="flex" alignItems="center" gap={0.5} mb={0.75} minWidth={0}>
        {icon && (
          <Box
            sx={{
              color: accent || "text.secondary",
              display: "flex",
              flexShrink: 0,
              "& svg": { fontSize: 16 },
            }}
          >
            {icon}
          </Box>
        )}
        <Typography
          variant="caption"
          fontWeight={600}
          color="text.secondary"
          noWrap
          sx={{ letterSpacing: "0.04em", textTransform: "uppercase" }}
        >
          {compact && shortLabel ? shortLabel : label}
        </Typography>
      </Box>
      <Typography
        variant="h4"
        fontWeight={700}
        noWrap
        sx={{
          color: theme.palette.text.primary,
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
          fontSize: { xs: "1.35rem", sm: undefined },
        }}
      >
        {display}
      </Typography>
    </Box>
  );
};

/** 2×2 on phones, single row from `sm` up — never squishes labels. */
const MetricStrip = ({ metrics, isLoading, error, onRetry }) => {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down("sm"));
  const rule =
    theme.palette.mode === "dark"
      ? "rgba(255,255,255,0.08)"
      : "rgba(0,0,0,0.08)";

  return (
    <DashCard sx={{ gridColumn: "span 12" }}>
      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonHeight={compact ? 128 : 84}
      >
        <Box
          display="grid"
          gridTemplateColumns={{
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(4, minmax(0, 1fr))",
          }}
          sx={{
            [theme.breakpoints.down("sm")]: {
              "& > *:nth-of-type(odd)": {
                borderRight: `1px solid ${rule}`,
              },
              "& > *:nth-of-type(-n+2)": {
                borderBottom: `1px solid ${rule}`,
              },
            },
            [theme.breakpoints.up("sm")]: {
              "& > *:not(:last-child)": {
                borderRight: `1px solid ${rule}`,
              },
            },
          }}
        >
          {metrics.map((m) => (
            <MetricCell key={m.label} {...m} compact={compact} />
          ))}
        </Box>
      </QueryState>
    </DashCard>
  );
};

const DeviceRow = ({ label, count, total }) => {
  const theme = useTheme();
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <Box>
      <Box
        display="flex"
        alignItems="baseline"
        justifyContent="space-between"
        gap={1}
        mb={0.5}
      >
        <Typography variant="body2" textTransform="capitalize" fontWeight={500}>
          {label || "unknown"}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
        >
          {count.toLocaleString()}
          <Box
            component="span"
            sx={{ ml: 0.75, color: "text.secondary", opacity: 0.7 }}
          >
            {Math.round(pct)}%
          </Box>
        </Typography>
      </Box>
      <Box
        sx={{
          height: 4,
          borderRadius: 1,
          bgcolor:
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 1,
            bgcolor: theme.palette.secondary.main,
            transition: "width 300ms ease",
          }}
        />
      </Box>
    </Box>
  );
};

const eventChipColor = (type, theme) => {
  const t = String(type || "").toLowerCase();
  if (t.includes("error")) {
    return {
      color: theme.palette.red.default,
      bg:
        theme.palette.mode === "dark"
          ? "rgba(252, 56, 56, 0.12)"
          : "rgba(201, 14, 14, 0.08)",
    };
  }
  if (t.includes("page") || t.includes("view")) {
    return {
      color: theme.palette.secondary.main,
      bg:
        theme.palette.mode === "dark"
          ? "rgba(142, 123, 218, 0.14)"
          : "rgba(67, 35, 194, 0.08)",
    };
  }
  return {
    color: theme.palette.text.secondary,
    bg:
      theme.palette.mode === "dark"
        ? "rgba(255,255,255,0.06)"
        : "rgba(0,0,0,0.04)",
  };
};

const Analytics = () => {
  const theme = useTheme();
  const chart = getChartTheme(theme);
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [days, setDays] = useState(30);

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useGetUsageSummaryQuery({ days });

  const {
    data: activity,
    isLoading: activityLoading,
    error: activityError,
    refetch: refetchActivity,
  } = useGetUsageActivityQuery({ days, limit: 100 });

  const totals = summary?.totals;
  const byDay = summary?.by_day ?? [];
  const byDevice = summary?.by_device ?? [];
  const byPath = summary?.by_path ?? [];
  const deviceTotal = useMemo(
    () => byDevice.reduce((sum, d) => sum + (Number(d.count) || 0), 0),
    [byDevice]
  );

  const columns = useMemo(
    () => [
      {
        field: "when",
        headerName: "When",
        flex: 0.9,
        minWidth: 130,
      },
      {
        field: "user_label",
        headerName: "User",
        flex: 1,
        minWidth: 110,
      },
      {
        field: "event_type",
        headerName: "Type",
        flex: 0.85,
        minWidth: 120,
        renderCell: (params) => {
          const tones = eventChipColor(params.value, theme);
          return (
            <Chip
              size="small"
              label={params.value || "—"}
              sx={{
                height: 22,
                fontSize: "0.72rem",
                fontWeight: 600,
                color: tones.color,
                bgcolor: tones.bg,
                border: "none",
                "& .MuiChip-label": { px: 1 },
              }}
            />
          );
        },
      },
      { field: "path", headerName: "Path", flex: 1.3, minWidth: 140 },
      {
        field: "device_type",
        headerName: "Device",
        flex: 0.7,
        minWidth: 90,
        valueFormatter: ({ value }) =>
          value
            ? String(value).charAt(0).toUpperCase() + String(value).slice(1)
            : "",
      },
      { field: "browser", headerName: "Browser", flex: 0.7, minWidth: 90 },
    ],
    [theme]
  );

  const rows = useMemo(
    () =>
      (activity || []).map((e) => ({
        id: e.id,
        when: formatWhen(e.created_at),
        user_label: e.username || (e.user_id ? `#${e.user_id}` : "Unknown"),
        event_type: e.event_type,
        path: e.path || "",
        device_type: e.device_type || "",
        browser: e.browser || "",
      })),
    [activity]
  );

  const metrics = [
    {
      label: "Page views",
      shortLabel: "Views",
      value: totals?.page_views,
      icon: <VisibilityOutlined />,
    },
    {
      label: "Sessions",
      value: totals?.sessions,
      icon: <TimelineOutlined />,
    },
    {
      label: "Unique users",
      shortLabel: "Users",
      value: totals?.users,
      icon: <GroupsOutlined />,
    },
    {
      label: "Errors",
      value: totals?.errors,
      icon: <ErrorOutline />,
      accent: theme.palette.red.default,
    },
  ];

  return (
    <Box>
      <Box
        display="flex"
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        gap={1.5}
        flexWrap="wrap"
      >
        <Header
          title="Analytics"
          subtitle="How people move through the site"
        />
        <ToggleButtonGroup
          exclusive
          size="small"
          value={days}
          onChange={(_, next) => {
            if (next != null) setDays(next);
          }}
          aria-label="Date range"
          sx={{
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.04)"
                : "rgba(0,0,0,0.03)",
            "& .MuiToggleButton-root": {
              px: 1.5,
              py: 0.5,
              border: "none",
              fontWeight: 600,
              fontSize: "0.8rem",
              color: "text.secondary",
              "&.Mui-selected": {
                bgcolor:
                  theme.palette.mode === "dark"
                    ? "rgba(142, 123, 218, 0.22)"
                    : "rgba(67, 35, 194, 0.1)",
                color: theme.palette.secondary.main,
                "&:hover": {
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? "rgba(142, 123, 218, 0.28)"
                      : "rgba(67, 35, 194, 0.14)",
                },
              },
            },
          }}
        >
          {RANGE_OPTIONS.map((opt) => (
            <ToggleButton key={opt.value} value={opt.value}>
              {opt.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Box
        mt={2}
        display="grid"
        gridTemplateColumns="repeat(12, minmax(0, 1fr))"
        gap={1.5}
      >
        <MetricStrip
          metrics={metrics}
          isLoading={summaryLoading}
          error={summaryError}
          onRetry={refetchSummary}
        />

        <DashCard
          sx={{
            gridColumn: { xs: "span 12", md: "span 8" },
            minHeight: 320,
          }}
        >
          <CardContent sx={{ height: "100%" }}>
            <SectionHeader
              title="Activity by day"
              subtitle={`Events over the last ${days} days`}
              icon={<TrendingUpRounded />}
            />
            <QueryState
              isLoading={summaryLoading}
              error={summaryError}
              isEmpty={!byDay.length}
              emptyMessage="No activity in this range yet"
              onRetry={refetchSummary}
              skeletonHeight={220}
            >
              <Box height={220}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={byDay}
                    margin={chart.margin}
                    barCategoryGap="22%"
                  >
                    <CartesianGrid {...chart.grid} />
                    <XAxis
                      dataKey="day"
                      {...(isMobile ? chart.xAxis : chart.xAxisAngled)}
                      tickFormatter={formatAxisDate}
                    />
                    <YAxis {...chart.yAxis} allowDecimals={false} />
                    <Tooltip
                      {...chart.tooltip}
                      labelFormatter={formatTooltipDate}
                      cursor={{
                        fill:
                          theme.palette.mode === "dark"
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(0,0,0,0.03)",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      name="Events"
                      fill={theme.palette.secondary.main}
                      radius={[2, 2, 0, 0]}
                      maxBarSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </QueryState>
          </CardContent>
        </DashCard>

        <DashCard
          sx={{
            gridColumn: { xs: "span 12", md: "span 4" },
            minHeight: 320,
          }}
        >
          <CardContent>
            <SectionHeader
              title="Devices"
              subtitle="Share of sessions"
              icon={<DevicesOutlined />}
            />
            <QueryState
              isLoading={summaryLoading}
              error={summaryError}
              isEmpty={!byDevice.length}
              emptyMessage="No device data yet"
              onRetry={refetchSummary}
              skeletonHeight={180}
            >
              <Box display="flex" flexDirection="column" gap={1.75} mt={0.5}>
                {byDevice.map((d) => (
                  <DeviceRow
                    key={d.device_type}
                    label={d.device_type}
                    count={Number(d.count) || 0}
                    total={deviceTotal}
                  />
                ))}
              </Box>
            </QueryState>
          </CardContent>
        </DashCard>

        <DashCard sx={{ gridColumn: "span 12", minHeight: 300 }}>
          <CardContent>
            <SectionHeader
              title="Views per page"
              subtitle="Most visited paths"
              icon={<VisibilityOutlined />}
            />
            <QueryState
              isLoading={summaryLoading}
              error={summaryError}
              isEmpty={!byPath.length}
              emptyMessage="No page views yet"
              onRetry={refetchSummary}
              skeletonHeight={240}
            >
              <Box height={Math.max(200, Math.min(360, byPath.length * 32))}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={byPath}
                    layout="vertical"
                    margin={chart.marginVertical}
                    barCategoryGap="28%"
                  >
                    <CartesianGrid {...chart.gridVerticalLayout} />
                    <XAxis
                      type="number"
                      {...chart.yAxis}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="path"
                      {...chart.yAxisCategory}
                      width={isMobile ? 88 : 150}
                      tickFormatter={(v) => {
                        const s = String(v || "");
                        const max = isMobile ? 12 : 22;
                        return s.length > max ? `${s.slice(0, max - 1)}…` : s;
                      }}
                    />
                    <Tooltip
                      {...chart.tooltip}
                      cursor={{
                        fill:
                          theme.palette.mode === "dark"
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(0,0,0,0.03)",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      name="Views"
                      fill={theme.palette.secondary.main}
                      radius={[0, 2, 2, 0]}
                      maxBarSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </QueryState>
          </CardContent>
        </DashCard>

        <DashCard sx={{ gridColumn: "span 12" }}>
          <CardContent>
            <SectionHeader
              title="Recent activity"
              subtitle="Latest events across the site"
            />
            <QueryState
              isLoading={activityLoading}
              error={activityError}
              isEmpty={!rows.length}
              emptyMessage="No activity recorded yet"
              onRetry={refetchActivity}
              skeletonVariant="table"
              skeletonHeight={280}
            >
              <Box height={340} width="100%">
                <DataGrid
                  rows={rows}
                  columns={columns}
                  density="compact"
                  disableRowSelectionOnClick
                  pageSizeOptions={[25, 50, 100]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 25 } },
                  }}
                  sx={{
                    ...dataGridSx(theme),
                    border: "none",
                    "& .MuiDataGrid-columnHeaders": {
                      bgcolor:
                        theme.palette.mode === "dark"
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(0,0,0,0.02)",
                    },
                    "& .MuiDataGrid-cell": {
                      display: "flex",
                      alignItems: "center",
                    },
                  }}
                />
              </Box>
            </QueryState>
          </CardContent>
        </DashCard>
      </Box>
    </Box>
  );
};

export default Analytics;
