import React, { useMemo, useState } from "react";
import {
  Avatar,
  Box,
  CardContent,
  Chip,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  ArrowDownwardRounded,
  ArrowForwardRounded,
  ArrowUpwardRounded,
  GroupsOutlined,
  LocalAtmRounded,
  PaymentsOutlined,
  TimelineOutlined,
} from "@mui/icons-material";
import Header from "components/Header";
import DashCard from "components/DashCard";
import QueryState from "components/QueryState";
import { MemberCardSkeleton, StatSkeleton } from "components/skeletons/DashSkeleton";
import {
  getApiErrorMessage,
  useGetDinkcoinBalancesQuery,
  useGetDinkcoinTransactionsQuery,
} from "state/api";
import { formatDateTime } from "utils/datetime";

const formatAmount = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return String(value ?? "0");
  return Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.?0+$/, "");
};

const formatDink = (value) => `${formatAmount(value)}Đ`;

const memberLabel = (displayName, userName, userId) =>
  displayName || userName || (userId ? `User ${userId.slice(-4)}` : "Unknown");

const MemberAvatar = ({ src, name, size = 40 }) => {
  const theme = useTheme();
  const initial = (name || "?").charAt(0).toUpperCase();

  return (
    <Avatar
      src={src || undefined}
      alt={name}
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        fontWeight: 700,
        flexShrink: 0,
        bgcolor:
          theme.palette.mode === "dark"
            ? theme.palette.secondary[700]
            : theme.palette.secondary[100],
        color:
          theme.palette.mode === "dark"
            ? theme.palette.secondary[100]
            : theme.palette.secondary[700],
      }}
    >
      {initial}
    </Avatar>
  );
};

const RankBadge = ({ rank }) => {
  const theme = useTheme();

  if (rank > 3) {
    return (
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          width: 22,
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}
      >
        {rank}
      </Typography>
    );
  }

  const accents = {
    1: theme.palette.mode === "dark" ? "#e8c547" : "#c9a227",
    2: theme.palette.mode === "dark" ? "#c0c7d1" : "#8a93a0",
    3: theme.palette.mode === "dark" ? "#c48a5a" : "#a66a3a",
  };

  return (
    <Box
      sx={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor:
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.06)"
            : "rgba(0,0,0,0.04)",
        color: accents[rank],
        fontSize: 11,
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {rank}
    </Box>
  );
};

const AmountBadge = ({ amount, direction }) => {
  const theme = useTheme();
  const isGain = direction === "gain";
  const color = isGain ? theme.palette.green.default : theme.palette.red.default;
  const Icon = isGain ? ArrowUpwardRounded : ArrowDownwardRounded;

  return (
    <Box
      display="inline-flex"
      alignItems="center"
      gap={0.25}
      px={0.75}
      py={0.25}
      borderRadius={`${theme.shape.borderRadius}px`}
      sx={{
        color,
        bgcolor:
          theme.palette.mode === "dark" ? `${color}22` : `${color}14`,
        border: `1px solid ${color}55`,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      <Icon sx={{ fontSize: 16 }} />
      <Typography
        variant="body2"
        fontWeight={700}
        component="span"
        sx={{ fontVariantNumeric: "tabular-nums" }}
      >
        {isGain ? "+" : "−"}
        {formatDink(amount)}
      </Typography>
    </Box>
  );
};

const StatTile = ({ label, value, icon }) => {
  const theme = useTheme();
  return (
    <DashCard sx={{ flex: "1 1 0", minWidth: 0 }}>
      <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <Box
            display="flex"
            color={theme.palette.secondary.main}
            sx={{ "& svg": { fontSize: 18 } }}
          >
            {icon}
          </Box>
          <Typography variant="caption" color="text.secondary" noWrap>
            {label}
          </Typography>
        </Box>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}
        >
          {value}
        </Typography>
      </CardContent>
    </DashCard>
  );
};

const SummaryStrip = ({ balances, transactions, isLoading }) => {
  const stats = useMemo(() => {
    const supply = (balances || []).reduce(
      (sum, row) => sum + (Number(row.balance) || 0),
      0
    );
    const holders = (balances || []).filter(
      (row) => Number(row.balance) > 0
    ).length;
    const volume = (transactions || []).reduce(
      (sum, tx) => sum + (Number(tx.amount) || 0),
      0
    );
    return { supply, holders, volume };
  }, [balances, transactions]);

  if (isLoading) {
    return (
      <Box display="flex" gap={1.5} mt={2} flexWrap="wrap">
        <StatSkeleton sx={{ flex: "1 1 140px", minWidth: 140 }} />
        <StatSkeleton sx={{ flex: "1 1 140px", minWidth: 140 }} />
        <StatSkeleton sx={{ flex: "1 1 140px", minWidth: 140 }} />
      </Box>
    );
  }

  return (
    <Box display="flex" gap={1.5} mt={2} flexWrap="wrap">
      <StatTile
        label="Total supply"
        value={formatDink(stats.supply)}
        icon={<PaymentsOutlined />}
      />
      <StatTile
        label="Holders"
        value={stats.holders.toLocaleString()}
        icon={<GroupsOutlined />}
      />
      <StatTile
        label="Recent volume"
        value={formatDink(stats.volume)}
        icon={<TimelineOutlined />}
      />
    </Box>
  );
};

const PanelHeader = ({ title, count }) => {
  const theme = useTheme();
  return (
    <Box
      display="flex"
      alignItems="baseline"
      justifyContent="space-between"
      gap={1}
      mb={1.25}
      pb={1}
      borderBottom={`1px solid ${theme.palette.divider}`}
      sx={{
        position: { md: "sticky" },
        top: 0,
        zIndex: 1,
        bgcolor: theme.palette.background.default,
      }}
    >
      <Typography variant="subtitle1" fontWeight={700}>
        {title}
      </Typography>
      {count != null && (
        <Typography variant="caption" color="text.secondary">
          {count.toLocaleString()}
        </Typography>
      )}
    </Box>
  );
};

const TransactionCard = ({ tx, dense = false }) => {
  const theme = useTheme();
  const isMint = tx.tx_type === "mint";
  const accent = isMint
    ? theme.palette.green.default
    : theme.palette.secondary[theme.palette.mode === "dark" ? 300 : 500];

  const toName = memberLabel(tx.to_display_name, tx.to_user_name, tx.to_user_id);
  const fromName = memberLabel(
    tx.from_display_name,
    tx.from_user_name,
    tx.from_user_id
  );

  if (dense) {
    return (
      <DashCard
        sx={{
          borderLeft: `3px solid ${
            isMint
              ? theme.palette.green.default
              : theme.palette.mode === "dark"
                ? theme.palette.secondary[400]
                : theme.palette.secondary[500]
          }`,
        }}
      >
        <CardContent sx={{ py: 1.25, px: 1.5, "&:last-child": { pb: 1.25 } }}>
          <Box
            display="flex"
            alignItems="center"
            gap={1.25}
            justifyContent="space-between"
          >
            <Box display="flex" alignItems="center" gap={1} minWidth={0} flex={1}>
              <Chip
                size="small"
                icon={
                  isMint ? (
                    <LocalAtmRounded sx={{ fontSize: "14px !important" }} />
                  ) : (
                    <ArrowForwardRounded sx={{ fontSize: "14px !important" }} />
                  )
                }
                label={isMint ? "Mint" : "Transfer"}
                sx={{
                  height: 22,
                  fontWeight: 600,
                  flexShrink: 0,
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? `${accent}33`
                      : `${accent}18`,
                  color: accent,
                  "& .MuiChip-icon": { color: accent },
                }}
              />

              {isMint ? (
                <Box display="flex" alignItems="center" gap={0.75} minWidth={0}>
                  <MemberAvatar src={tx.to_avatar} name={toName} size={28} />
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {toName}
                  </Typography>
                </Box>
              ) : (
                <Box display="flex" alignItems="center" gap={0.75} minWidth={0}>
                  <MemberAvatar src={tx.from_avatar} name={fromName} size={28} />
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {fromName}
                  </Typography>
                  <AmountBadge amount={tx.amount} direction="loss" />
                  <ArrowForwardRounded
                    sx={{
                      fontSize: 16,
                      color: theme.palette.text.secondary,
                      flexShrink: 0,
                    }}
                  />
                  <MemberAvatar src={tx.to_avatar} name={toName} size={28} />
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {toName}
                  </Typography>
                  <AmountBadge amount={tx.amount} direction="gain" />
                </Box>
              )}
            </Box>

            <Box
              display="flex"
              alignItems="center"
              gap={1}
              flexShrink={0}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: { xs: "none", lg: "block" } }}
              >
                {formatDateTime(tx.created_at)}
              </Typography>
              {isMint ? (
                <AmountBadge amount={tx.amount} direction="gain" />
              ) : (
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{
                    fontVariantNumeric: "tabular-nums",
                    color: accent,
                    flexShrink: 0,
                  }}
                >
                  {formatDink(tx.amount)}
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </DashCard>
    );
  }

  return (
    <DashCard
      sx={{
        borderLeft: `4px solid ${
          isMint
            ? theme.palette.green.default
            : theme.palette.mode === "dark"
              ? theme.palette.secondary[400]
              : theme.palette.secondary[500]
        }`,
      }}
    >
      <CardContent>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
          gap={1}
          mb={1.25}
        >
          <Chip
            size="small"
            icon={
              isMint ? (
                <LocalAtmRounded sx={{ fontSize: "16px !important" }} />
              ) : (
                <ArrowForwardRounded sx={{ fontSize: "16px !important" }} />
              )
            }
            label={isMint ? "Minted" : "Transfer"}
            sx={{
              height: 24,
              fontWeight: 600,
              bgcolor:
                theme.palette.mode === "dark" ? `${accent}33` : `${accent}18`,
              color: accent,
              "& .MuiChip-icon": { color: accent },
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {formatDateTime(tx.created_at)}
          </Typography>
        </Box>

        {isMint ? (
          <Box display="flex" alignItems="center" gap={1.25}>
            <MemberAvatar src={tx.to_avatar} name={toName} />
            <Box flex={1} minWidth={0}>
              <Typography variant="subtitle2" fontWeight={700} noWrap>
                {toName}
              </Typography>
              {tx.to_user_name && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  display="block"
                >
                  @{tx.to_user_name}
                </Typography>
              )}
            </Box>
            <AmountBadge amount={tx.amount} direction="gain" />
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={1.25}>
            <Box display="flex" alignItems="center" gap={1}>
              <MemberAvatar src={tx.from_avatar} name={fromName} size={36} />
              <Box flex={1} minWidth={0}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {fromName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  sent
                </Typography>
              </Box>
              <AmountBadge amount={tx.amount} direction="loss" />
            </Box>

            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              sx={{ color: theme.palette.text.secondary }}
            >
              <ArrowForwardRounded
                sx={{ fontSize: 18, transform: "rotate(90deg)" }}
              />
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
              <MemberAvatar src={tx.to_avatar} name={toName} size={36} />
              <Box flex={1} minWidth={0}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {toName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  received
                </Typography>
              </Box>
              <AmountBadge amount={tx.amount} direction="gain" />
            </Box>
          </Box>
        )}
      </CardContent>
    </DashCard>
  );
};

const BalanceRow = ({
  balance,
  display_name,
  user_name,
  avatar,
  user_id,
  rank,
  dense = false,
}) => {
  const theme = useTheme();
  const name = memberLabel(display_name, user_name, user_id);
  const amount = Number(balance);
  const isPositive = amount > 0;

  if (dense) {
    return (
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        px={1.25}
        py={1}
        borderRadius={`${theme.shape.borderRadius}px`}
        sx={{
          bgcolor: theme.palette.background.alt,
          boxShadow: theme.customShadows?.card,
          borderLeft: `3px solid ${
            isPositive ? theme.palette.green.default : theme.palette.grey[500]
          }`,
          transition: "box-shadow 150ms ease",
          "&:hover": {
            boxShadow: theme.customShadows?.cardHover,
          },
        }}
      >
        <RankBadge rank={rank} />
        <MemberAvatar src={avatar} name={name} size={36} />
        <Box flex={1} minWidth={0}>
          <Typography variant="body2" fontWeight={700} noWrap>
            {name}
          </Typography>
          {user_name && (
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              display="block"
            >
              @{user_name}
            </Typography>
          )}
        </Box>
        <Typography
          variant="subtitle1"
          fontWeight={700}
          sx={{
            fontVariantNumeric: "tabular-nums",
            color: isPositive
              ? theme.palette.green.default
              : theme.palette.text.secondary,
            flexShrink: 0,
          }}
        >
          {formatDink(balance)}
        </Typography>
      </Box>
    );
  }

  return (
    <DashCard
      sx={{
        borderLeft: `4px solid ${
          isPositive ? theme.palette.green.default : theme.palette.grey[500]
        }`,
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" gap={1.25}>
          <RankBadge rank={rank} />
          <MemberAvatar src={avatar} name={name} size={48} />
          <Box flex={1} minWidth={0}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {name}
            </Typography>
            {user_name && (
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                display="block"
              >
                @{user_name}
              </Typography>
            )}
          </Box>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{
              fontVariantNumeric: "tabular-nums",
              color: isPositive
                ? theme.palette.green.default
                : theme.palette.text.secondary,
            }}
          >
            {formatDink(balance)}
          </Typography>
        </Box>
      </CardContent>
    </DashCard>
  );
};

const CardColumn = ({ children, dense = false }) => (
  <Box
    display="flex"
    flexDirection="column"
    gap={dense ? 1 : 1.5}
    width="100%"
  >
    {children}
  </Box>
);

const TransactionsPanel = ({ dense = false, showHeader = false }) => {
  const { data, isLoading, error, refetch } = useGetDinkcoinTransactionsQuery(200);

  if (isLoading) {
    return (
      <Box>
        {showHeader && <PanelHeader title="Transactions" />}
        <CardColumn dense={dense}>
          {Array.from({ length: dense ? 8 : 6 }).map((_, i) => (
            <MemberCardSkeleton key={i} />
          ))}
        </CardColumn>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        {showHeader && <PanelHeader title="Transactions" />}
        <QueryState isLoading={false} error={error} onRetry={refetch} />
        <Typography
          variant="caption"
          color="text.secondary"
          mt={1}
          display="block"
        >
          {getApiErrorMessage(error)}
        </Typography>
      </Box>
    );
  }

  if (!data?.length) {
    return (
      <Box>
        {showHeader && <PanelHeader title="Transactions" count={0} />}
        <Typography color="text.secondary">No transactions yet</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {showHeader && (
        <PanelHeader title="Transactions" count={data.length} />
      )}
      <CardColumn dense={dense}>
        {data.map((tx) => (
          <TransactionCard key={tx.id} tx={tx} dense={dense} />
        ))}
      </CardColumn>
    </Box>
  );
};

const BalancesPanel = ({ dense = false, showHeader = false }) => {
  const { data, isLoading, error, refetch } = useGetDinkcoinBalancesQuery();

  if (isLoading) {
    return (
      <Box>
        {showHeader && <PanelHeader title="Balances" />}
        <CardColumn dense={dense}>
          {Array.from({ length: dense ? 8 : 6 }).map((_, i) => (
            <MemberCardSkeleton key={i} />
          ))}
        </CardColumn>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        {showHeader && <PanelHeader title="Balances" />}
        <QueryState isLoading={false} error={error} onRetry={refetch} />
        <Typography
          variant="caption"
          color="text.secondary"
          mt={1}
          display="block"
        >
          {getApiErrorMessage(error)}
        </Typography>
      </Box>
    );
  }

  if (!data?.length) {
    return (
      <Box>
        {showHeader && <PanelHeader title="Balances" count={0} />}
        <Typography color="text.secondary">No balances yet</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {showHeader && <PanelHeader title="Balances" count={data.length} />}
      <CardColumn dense={dense}>
        {data.map((row, index) => (
          <BalanceRow
            key={row.user_id}
            {...row}
            rank={index + 1}
            dense={dense}
          />
        ))}
      </CardColumn>
    </Box>
  );
};

const Economy = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery("(min-width: 900px)");
  const [tab, setTab] = useState("transactions");

  const {
    data: balances,
    isLoading: balancesLoading,
  } = useGetDinkcoinBalancesQuery();
  const {
    data: transactions,
    isLoading: transactionsLoading,
  } = useGetDinkcoinTransactionsQuery(200);

  const summaryLoading = balancesLoading || transactionsLoading;

  return (
    <Box>
      <Header
        title="DinkCoin Economy"
        subtitle="Live balances and ledger"
      />

      <SummaryStrip
        balances={balances}
        transactions={transactions}
        isLoading={summaryLoading}
      />

      {isDesktop ? (
        <Box
          display="flex"
          gap={2.5}
          mt={2.5}
          alignItems="stretch"
          minHeight={0}
        >
          <Box
            flex="0 0 38%"
            maxWidth={420}
            minWidth={280}
            maxHeight="calc(100vh - 220px)"
            overflow="auto"
            pr={0.5}
          >
            <BalancesPanel dense showHeader />
          </Box>

          <Box
            flex="1 1 62%"
            minWidth={0}
            maxHeight="calc(100vh - 220px)"
            overflow="auto"
            pl={0.5}
            borderLeft={`1px solid ${theme.palette.divider}`}
          >
            <TransactionsPanel dense showHeader />
          </Box>
        </Box>
      ) : (
        <Box mx="auto" width="100%" maxWidth={520} mt={1}>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            sx={{
              minHeight: 36,
              "& .MuiTab-root": {
                minHeight: 36,
                textTransform: "none",
                fontWeight: 600,
                py: 0.5,
                color: theme.palette.text.secondary,
                opacity: 1,
                "&.Mui-selected": {
                  color: theme.palette.text.primary,
                },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: theme.palette.secondary.main,
              },
            }}
          >
            <Tab label="Transactions" value="transactions" />
            <Tab label="Balances" value="balances" />
          </Tabs>

          <Box mt={1.5}>
            {tab === "transactions" ? (
              <TransactionsPanel />
            ) : (
              <BalancesPanel />
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Economy;
