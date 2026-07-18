import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  SearchRounded,
  ClearRounded,
  ChevronRightRounded,
} from "@mui/icons-material";
import Header from "components/Header";
import DashCard from "components/DashCard";
import {
  useGetMembersQuery,
  useGetJuiceByMemberQuery,
  useGetMessagesByMembersQuery,
  useGetScoreQuery,
} from "state/api";
import QueryState from "components/QueryState";
import { MemberCardSkeleton, MemberRowSkeleton } from "components/skeletons/DashSkeleton";
import { getApiErrorMessage } from "state/api";
import { formatCompactCount } from "utils/memberActivity";

const SORT_OPTIONS = [
  { value: "messages", label: "Messages", key: "number_of_messages" },
  { value: "firsts", label: "Firsts", key: "firsts" },
  { value: "juice", label: "Juice", key: "juice" },
];

function MemberAvatar({ avatar, name, size = 48 }) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const showImg = Boolean(avatar) && !failed;
  const initial = (name || "?").charAt(0).toUpperCase();

  return (
    <Box
      width={size}
      height={size}
      flexShrink={0}
      borderRadius="50%"
      overflow="hidden"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{
        bgcolor:
          theme.palette.mode === "dark"
            ? theme.palette.secondary[700]
            : theme.palette.secondary[100],
        color:
          theme.palette.mode === "dark"
            ? theme.palette.secondary[100]
            : theme.palette.secondary[700],
        fontWeight: 700,
        fontSize: size * 0.38,
        border: `2px solid ${
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.06)"
        }`,
      }}
    >
      {showImg ? (
        <Box
          component="img"
          alt=""
          src={avatar}
          width="100%"
          height="100%"
          sx={{ objectFit: "cover" }}
          onError={() => setFailed(true)}
        />
      ) : (
        initial
      )}
    </Box>
  );
}

function RankBadge({ rank }) {
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
}

function StatCell({ label, value, emphasize }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        textAlign: "center",
        px: 0.5,
        py: 0.75,
        borderRadius: `${theme.shape.borderRadius}px`,
        bgcolor: emphasize
          ? theme.palette.mode === "dark"
            ? "rgba(142, 123, 218, 0.14)"
            : "rgba(67, 35, 194, 0.06)"
          : "transparent",
      }}
    >
      <Typography
        variant="body2"
        fontWeight={700}
        sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}
      >
        {value}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", lineHeight: 1.2, mt: 0.25 }}
      >
        {label}
      </Typography>
    </Box>
  );
}

/** Dense row for phones — scannable directory list. */
function MemberRow({
  id,
  user_name,
  display_name,
  number_of_messages,
  firsts,
  juice,
  avatar,
  rank,
  sortOrder,
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const primary =
    sortOrder === "juice"
      ? { label: "Juice", value: formatCompactCount(juice) }
      : sortOrder === "firsts"
        ? { label: "Firsts", value: formatCompactCount(firsts) }
        : { label: "Msgs", value: formatCompactCount(number_of_messages) };

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/members/${id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/members/${id}`);
        }
      }}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        px: 1.5,
        py: 1.25,
        cursor: "pointer",
        outline: "none",
        transition: "background-color 120ms ease",
        "&:hover, &:focus-visible": {
          bgcolor:
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.03)",
        },
        "&:active": {
          bgcolor:
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.05)",
        },
      }}
    >
      <RankBadge rank={rank} />
      <MemberAvatar
        avatar={avatar}
        name={display_name || user_name}
        size={44}
      />
      <Box minWidth={0} flex={1}>
        <Typography
          variant="body2"
          fontWeight={600}
          noWrap
          color={
            theme.palette.mode === "dark"
              ? theme.palette.primary[100]
              : theme.palette.grey[900]
          }
        >
          {display_name || user_name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          @{user_name}
        </Typography>
      </Box>
      <Box textAlign="right" flexShrink={0} mr={0.25}>
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}
        >
          {primary.value}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", lineHeight: 1.2 }}
        >
          {primary.label}
        </Typography>
      </Box>
      <ChevronRightRounded
        sx={{ color: "text.secondary", fontSize: 20, opacity: 0.55 }}
      />
    </Box>
  );
}

/** Card for tablet / desktop grids. */
function MemberCard({
  id,
  user_name,
  display_name,
  number_of_messages,
  firsts,
  juice,
  avatar,
  rank,
  sortOrder,
}) {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <DashCard
      sx={{
        cursor: "pointer",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
      onClick={() => navigate(`/members/${id}`)}
    >
      <Box
        sx={{
          position: "absolute",
          top: 10,
          right: 10,
        }}
      >
        <RankBadge rank={rank} />
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          px: 2,
          pt: 2.25,
          pb: 1.5,
          gap: 1,
        }}
      >
        <MemberAvatar
          avatar={avatar}
          name={display_name || user_name}
          size={72}
        />
        <Box minWidth={0} width="100%" px={2}>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            noWrap
            color={
              theme.palette.mode === "dark"
                ? theme.palette.primary[100]
                : theme.palette.grey[900]
            }
          >
            {display_name || user_name}
          </Typography>
          <Typography
            variant="caption"
            color={theme.palette.secondary[300]}
            noWrap
            display="block"
          >
            @{user_name}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          mt: "auto",
          display: "flex",
          alignItems: "stretch",
          gap: 0.25,
          px: 1.25,
          py: 1,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor:
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.02)"
              : "rgba(0,0,0,0.015)",
        }}
      >
        <StatCell
          label="Messages"
          value={formatCompactCount(number_of_messages)}
          emphasize={sortOrder === "messages"}
        />
        <StatCell
          label="Firsts"
          value={formatCompactCount(firsts)}
          emphasize={sortOrder === "firsts"}
        />
        <StatCell
          label="Juice"
          value={formatCompactCount(juice)}
          emphasize={sortOrder === "juice"}
        />
      </Box>
    </DashCard>
  );
}

const Members = () => {
  const theme = useTheme();
  const {
    data: membersData,
    isLoading: isMembersLoading,
    error: membersError,
    refetch: refetchMembers,
  } = useGetMembersQuery();
  const {
    data: messagesData,
    isLoading: isMessagesLoading,
    error: messagesError,
  } = useGetMessagesByMembersQuery();
  const {
    data: juiceData,
    isLoading: isJuiceLoading,
    error: juiceError,
  } = useGetJuiceByMemberQuery();
  const {
    data: scoreData,
    isLoading: isScoreLoading,
    error: scoreError,
  } = useGetScoreQuery();

  const isLoading =
    isMembersLoading || isMessagesLoading || isJuiceLoading || isScoreLoading;
  const error = membersError || messagesError || juiceError || scoreError;

  const isLg = useMediaQuery("(min-width: 1200px)");
  const isMd = useMediaQuery("(min-width: 750px)");
  const isListLayout = !isMd;

  const [sortOrder, setSortOrder] = useState("messages");
  const [query, setQuery] = useState("");

  const combinedData = useMemo(() => {
    if (!membersData || !messagesData || !juiceData || !scoreData) return [];

    const messageCountMap = messagesData.reduce((acc, message) => {
      acc[message.user_id] = message.messages;
      return acc;
    }, {});
    const juiceMap = juiceData.reduce((acc, row) => {
      acc[row.user_id] = row.total_juice;
      return acc;
    }, {});
    const scoreMap = scoreData.reduce((acc, score) => {
      acc[score.user_id] = score.firsts;
      return acc;
    }, {});

    const sortedData = membersData.map((member) => ({
      ...member,
      number_of_messages: messageCountMap[member.id] || 0,
      juice: juiceMap[member.id] || 0,
      firsts: scoreMap[member.id] || 0,
    }));

    switch (sortOrder) {
      case "juice":
        return sortedData.sort((a, b) => b.juice - a.juice);
      case "firsts":
        return sortedData.sort((a, b) => b.firsts - a.firsts);
      case "messages":
      default:
        return sortedData.sort(
          (a, b) => b.number_of_messages - a.number_of_messages
        );
    }
  }, [membersData, messagesData, juiceData, scoreData, sortOrder]);

  const rankById = useMemo(() => {
    const map = new Map();
    combinedData.forEach((m, i) => map.set(m.id, i + 1));
    return map;
  }, [combinedData]);

  const filteredData = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return combinedData;
    return combinedData.filter((m) => {
      const name = (m.display_name || "").toLowerCase();
      const handle = (m.user_name || "").toLowerCase();
      return name.includes(q) || handle.includes(q);
    });
  }, [combinedData, query]);

  const cols = isLg ? 4 : isMd ? 2 : 1;
  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === sortOrder)?.label || "Messages";

  return (
    <Box>
      <Box
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "flex-end" }}
        justifyContent="space-between"
        gap={1.5}
        mb={0.5}
      >
        <Header
          title="Members"
          subtitle={`${
            isLoading ? "…" : filteredData.length === combinedData.length
              ? `${combinedData.length} members`
              : `${filteredData.length} of ${combinedData.length}`
          } · sorted by ${sortLabel.toLowerCase()}`}
        />
      </Box>

      <Box
        mt={1.5}
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        gap={1.25}
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <TextField
          size="small"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members…"
          aria-label="Search members"
          fullWidth
          sx={{
            flex: 1,
            maxWidth: { sm: 360 },
            "& .MuiOutlinedInput-root": {
              bgcolor: theme.palette.background.alt,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: query ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                  edge="end"
                >
                  <ClearRounded fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 140 } }}>
          <InputLabel id="select-member-sort-label">Sort by</InputLabel>
          <Select
            labelId="select-member-sort-label"
            id="select-member-sort"
            value={sortOrder}
            label="Sort by"
            onChange={(event) => setSortOrder(event.target.value)}
            sx={{ bgcolor: theme.palette.background.alt }}
          >
            {SORT_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {isLoading ? (
        isListLayout ? (
          <DashCard sx={{ mt: 1.5, overflow: "hidden" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  borderBottom:
                    i < 7 ? `1px solid ${theme.palette.divider}` : "none",
                }}
              >
                <MemberRowSkeleton />
              </Box>
            ))}
          </DashCard>
        ) : (
          <Box
            mt={1.5}
            display="grid"
            gridTemplateColumns={`repeat(${cols}, minmax(0, 1fr))`}
            gap={1.5}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <MemberCardSkeleton key={i} />
            ))}
          </Box>
        )
      ) : error ? (
        <Box mt={1.5}>
          <QueryState
            isLoading={false}
            error={error}
            onRetry={() => {
              refetchMembers();
            }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            mt={1}
            display="block"
          >
            {getApiErrorMessage(error)}
          </Typography>
        </Box>
      ) : filteredData.length === 0 ? (
        <Box
          mt={1.5}
          py={6}
          textAlign="center"
          sx={{
            borderRadius: `${theme.shape.borderRadius}px`,
            border: `1px dashed ${theme.palette.divider}`,
            bgcolor: theme.palette.background.alt,
          }}
        >
          <Typography color="text.secondary">
            {query.trim()
              ? `No members match “${query.trim()}”`
              : "No members found"}
          </Typography>
          {query.trim() ? (
            <Typography
              component="button"
              variant="body2"
              color="secondary"
              onClick={() => setQuery("")}
              sx={{
                mt: 1,
                border: 0,
                background: "none",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Clear search
            </Typography>
          ) : null}
        </Box>
      ) : isListLayout ? (
        <DashCard sx={{ mt: 1.5, overflow: "hidden" }}>
          {filteredData.map((member, index) => (
            <Box
              key={member.id}
              sx={{
                borderBottom:
                  index < filteredData.length - 1
                    ? `1px solid ${theme.palette.divider}`
                    : "none",
              }}
            >
              <MemberRow
                {...member}
                rank={rankById.get(member.id) || index + 1}
                sortOrder={sortOrder}
              />
            </Box>
          ))}
        </DashCard>
      ) : (
        <Box
          mt={1.5}
          display="grid"
          gridTemplateColumns={`repeat(${cols}, minmax(0, 1fr))`}
          gap={1.5}
        >
          {filteredData.map((member, index) => (
            <MemberCard
              key={member.id}
              {...member}
              rank={rankById.get(member.id) || index + 1}
              sortOrder={sortOrder}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default Members;
