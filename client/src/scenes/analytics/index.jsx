import React, { useMemo, useState } from "react";
import {
  Box,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  DevicesOutlined,
  ErrorOutline,
  VisibilityOutlined,
  GroupsOutlined,
  TimelineOutlined,
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
import { StatSkeleton } from "components/skeletons/DashSkeleton";
import { dataGridSx } from "utils/dataGridSx";
import { getChartTheme } from "utils/chartTheme";
import {
  useGetUsageSummaryQuery,
  useGetUsageActivityQuery,
} from "state/api";

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
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const StatTile = ({ label, value, icon }) => {
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
          {value?.toLocaleString?.() ?? value ?? "—"}
        </Typography>
      </CardContent>
    </DashCard>
  );
};

const Analytics = () => {
  const theme = useTheme();
  const chart = getChartTheme(theme);
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

  const columns = useMemo(
    () => [
      { field: "when", headerName: "When", flex: 1.2, minWidth: 170 },
      { field: "user_label", headerName: "User", flex: 1, minWidth: 120 },
      { field: "event_type", headerName: "Type", flex: 0.8, minWidth: 110 },
      { field: "path", headerName: "Path", flex: 1.2, minWidth: 140 },
      { field: "device_type", headerName: "Device", flex: 0.7, minWidth: 90 },
      { field: "browser", headerName: "Browser", flex: 0.7, minWidth: 90 },
      { field: "os", headerName: "OS", flex: 0.7, minWidth: 80 },
    ],
    []
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
        os: e.os || "",
      })),
    [activity]
  );

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
          subtitle="Site usage — visible to admins only"
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="usage-days-label">Range</InputLabel>
          <Select
            labelId="usage-days-label"
            label="Range"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <MenuItem value={7}>Last 7 days</MenuItem>
            <MenuItem value={30}>Last 30 days</MenuItem>
            <MenuItem value={90}>Last 90 days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box
        mt={1.5}
        display="grid"
        gridTemplateColumns="repeat(12, minmax(0, 1fr))"
        gap={1.5}
      >
        {summaryLoading ? (
          <>
            <StatSkeleton sx={{ gridColumn: { xs: "span 12", sm: "span 6", md: "span 3" } }} />
            <StatSkeleton sx={{ gridColumn: { xs: "span 12", sm: "span 6", md: "span 3" } }} />
            <StatSkeleton sx={{ gridColumn: { xs: "span 12", sm: "span 6", md: "span 3" } }} />
            <StatSkeleton sx={{ gridColumn: { xs: "span 12", sm: "span 6", md: "span 3" } }} />
          </>
        ) : summaryError ? (
          <Box gridColumn="span 12">
            <QueryState
              isLoading={false}
              error={summaryError}
              onRetry={refetchSummary}
              skeletonHeight={80}
            />
          </Box>
        ) : (
          <>
            <StatTile
              label="Page views"
              value={totals?.page_views}
              icon={<VisibilityOutlined fontSize="small" />}
            />
            <StatTile
              label="Sessions"
              value={totals?.sessions}
              icon={<TimelineOutlined fontSize="small" />}
            />
            <StatTile
              label="Unique users"
              value={totals?.users}
              icon={<GroupsOutlined fontSize="small" />}
            />
            <StatTile
              label="Errors"
              value={totals?.errors}
              icon={<ErrorOutline fontSize="small" />}
            />
          </>
        )}

        <DashCard sx={{ gridColumn: { xs: "span 12", md: "span 8" }, minHeight: 300 }}>
          <CardContent sx={{ height: "100%" }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Activity by day
            </Typography>
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
                  <BarChart data={byDay} margin={chart.margin}>
                    <CartesianGrid {...chart.grid} />
                    <XAxis
                      dataKey="day"
                      {...chart.xAxisAngled}
                      tickFormatter={formatAxisDate}
                    />
                    <YAxis {...chart.yAxis} allowDecimals={false} />
                    <Tooltip
                      {...chart.tooltip}
                      labelFormatter={formatTooltipDate}
                    />
                    <Bar
                      dataKey="count"
                      fill={theme.palette.secondary.main}
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </QueryState>
          </CardContent>
        </DashCard>

        <DashCard sx={{ gridColumn: { xs: "span 12", md: "span 4" }, minHeight: 300 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={0.75} mb={1}>
              <DevicesOutlined fontSize="small" color="secondary" />
              <Typography variant="h6" fontWeight={600}>
                Devices
              </Typography>
            </Box>
            <QueryState
              isLoading={summaryLoading}
              error={summaryError}
              isEmpty={!byDevice.length}
              emptyMessage="No device data yet"
              onRetry={refetchSummary}
              skeletonHeight={180}
            >
              <Box display="flex" flexDirection="column" gap={1}>
                {byDevice.map((d) => (
                  <Box
                    key={d.device_type}
                    display="flex"
                    justifyContent="space-between"
                  >
                    <Typography variant="body2" textTransform="capitalize">
                      {d.device_type}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {d.count.toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </QueryState>
          </CardContent>
        </DashCard>

        <DashCard sx={{ gridColumn: "span 12", minHeight: 320 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Views per page
            </Typography>
            <QueryState
              isLoading={summaryLoading}
              error={summaryError}
              isEmpty={!byPath.length}
              emptyMessage="No page views yet"
              onRetry={refetchSummary}
              skeletonHeight={240}
            >
              <Box height={Math.max(220, byPath.length * 28)}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={byPath}
                    layout="vertical"
                    margin={chart.marginVertical}
                  >
                    <CartesianGrid {...chart.gridVerticalLayout} />
                    <XAxis type="number" {...chart.yAxis} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="path"
                      {...chart.yAxisCategory}
                      width={140}
                    />
                    <Tooltip {...chart.tooltip} />
                    <Bar
                      dataKey="count"
                      fill={theme.palette.secondary.main}
                      radius={[0, 2, 2, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </QueryState>
          </CardContent>
        </DashCard>

        <DashCard sx={{ gridColumn: "span 12", minHeight: 360 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Recent activity
            </Typography>
            <QueryState
              isLoading={activityLoading}
              error={activityError}
              isEmpty={!rows.length}
              emptyMessage="No activity recorded yet"
              onRetry={refetchActivity}
              skeletonVariant="table"
              skeletonHeight={280}
            >
              <Box height={320} width="100%">
                <DataGrid
                  rows={rows}
                  columns={columns}
                  density="compact"
                  disableRowSelectionOnClick
                  pageSizeOptions={[25, 50, 100]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 25 } },
                  }}
                  sx={dataGridSx(theme)}
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
