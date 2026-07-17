import React, { useState } from "react";
import {
  Avatar,
  Box,
  CardContent,
  Chip,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from "@mui/material";
import {
  ArrowDownwardRounded,
  ArrowForwardRounded,
  ArrowUpwardRounded,
  LocalAtmRounded,
} from "@mui/icons-material";
import Header from "components/Header";
import DashCard from "components/DashCard";
import QueryState from "components/QueryState";
import { MemberCardSkeleton } from "components/skeletons/DashSkeleton";
import {
  getApiErrorMessage,
  useGetDinkcoinBalancesQuery,
  useGetDinkcoinTransactionsQuery,
} from "state/api";

const formatAmount = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return String(value ?? "0");
  return Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.?0+$/, "");
};

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
          theme.palette.mode === "dark"
            ? `${color}22`
            : `${color}14`,
        border: `1px solid ${color}55`,
        fontWeight: 700,
      }}
    >
      <Icon sx={{ fontSize: 16 }} />
      <Typography variant="body2" fontWeight={700} component="span">
        {isGain ? "+" : "-"}
        {formatAmount(amount)}
      </Typography>
    </Box>
  );
};

const TransactionCard = ({ tx }) => {
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
                theme.palette.mode === "dark"
                  ? `${accent}33`
                  : `${accent}18`,
              color: accent,
              "& .MuiChip-icon": { color: accent },
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {tx.created_at}
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
                <Typography variant="caption" color="text.secondary" noWrap display="block">
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
              <ArrowForwardRounded sx={{ fontSize: 18, transform: "rotate(90deg)" }} />
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

const BalanceCard = ({ balance, display_name, user_name, avatar, user_id }) => {
  const theme = useTheme();
  const name = memberLabel(display_name, user_name, user_id);
  const amount = Number(balance);
  const isPositive = amount > 0;

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
          <MemberAvatar src={avatar} name={name} size={48} />
          <Box flex={1} minWidth={0}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {name}
            </Typography>
            {user_name && (
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                @{user_name}
              </Typography>
            )}
          </Box>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{
              color: isPositive
                ? theme.palette.green.default
                : theme.palette.text.secondary,
            }}
          >
            {formatAmount(balance)}
          </Typography>
        </Box>
      </CardContent>
    </DashCard>
  );
};

const CardColumn = ({ children }) => (
  <Box
    mt={1.5}
    display="flex"
    flexDirection="column"
    gap={1.5}
    width="100%"
  >
    {children}
  </Box>
);

const TransactionsTab = () => {
  const { data, isLoading, error, refetch } = useGetDinkcoinTransactionsQuery(200);

  if (isLoading) {
    return (
      <CardColumn>
        {Array.from({ length: 6 }).map((_, i) => (
          <MemberCardSkeleton key={i} />
        ))}
      </CardColumn>
    );
  }

  if (error) {
    return (
      <Box mt={1.5}>
        <QueryState isLoading={false} error={error} onRetry={refetch} />
        <Typography variant="caption" color="text.secondary" mt={1} display="block">
          {getApiErrorMessage(error)}
        </Typography>
      </Box>
    );
  }

  if (!data?.length) {
    return (
      <Box mt={1.5}>
        <Typography color="text.secondary">No transactions yet</Typography>
      </Box>
    );
  }

  return (
    <CardColumn>
      {data.map((tx) => (
        <TransactionCard key={tx.id} tx={tx} />
      ))}
    </CardColumn>
  );
};

const BalancesTab = () => {
  const { data, isLoading, error, refetch } = useGetDinkcoinBalancesQuery();

  if (isLoading) {
    return (
      <CardColumn>
        {Array.from({ length: 6 }).map((_, i) => (
          <MemberCardSkeleton key={i} />
        ))}
      </CardColumn>
    );
  }

  if (error) {
    return (
      <Box mt={1.5}>
        <QueryState isLoading={false} error={error} onRetry={refetch} />
        <Typography variant="caption" color="text.secondary" mt={1} display="block">
          {getApiErrorMessage(error)}
        </Typography>
      </Box>
    );
  }

  if (!data?.length) {
    return (
      <Box mt={1.5}>
        <Typography color="text.secondary">No balances yet</Typography>
      </Box>
    );
  }

  return (
    <CardColumn>
      {data.map((row) => (
        <BalanceCard key={row.user_id} {...row} />
      ))}
    </CardColumn>
  );
};

const Economy = () => {
  const theme = useTheme();
  const [tab, setTab] = useState("transactions");

  return (
    <Box>
      <Header
        title="DinkCoin Economy"
        subtitle="Balances and transaction history"
      />

      <Box mx="auto" width="100%" maxWidth={520}>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          sx={{
            mt: 1,
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

        {tab === "transactions" ? <TransactionsTab /> : <BalancesTab />}
      </Box>
    </Box>
  );
};

export default Economy;
