import React, { useState } from "react";
import {
  Box,
  CardActions,
  CardContent,
  Collapse,
  Button,
  Typography,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import Header from "components/Header";
import DashCard from "components/DashCard";
import {
  useGetMembersQuery,
  useGetJuiceByMemberQuery,
  useGetMessagesByMembersQuery,
  useGetScoreQuery,
} from "state/api";
import FlexBetween from "components/FlexBetween";
import QueryState from "components/QueryState";
import { MemberCardSkeleton } from "components/skeletons/DashSkeleton";
import { getApiErrorMessage } from "state/api";

const Member = ({
  id,
  user_name,
  display_name,
  number_of_messages,
  firsts,
  juice,
  avatar,
  created_at,
}) => {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  function formatNumber(num) {
    if (num >= 10000) return Math.floor(num / 1000) + "k";
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return num.toString();
  }

  const StatChip = ({ label, value }) => (
    <Box
      sx={{
        backgroundColor:
          theme.palette.mode === "dark"
            ? theme.palette.white[1000]
            : theme.palette.grey[100],
        boxShadow: theme.customShadows.card,
        borderRadius: `${theme.shape.borderRadius}px`,
        padding: "0.2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "30%",
      }}
    >
      <Typography variant="body2" align="center">
        <strong>{value}</strong>
      </Typography>
      <Typography
        variant="caption"
        align="center"
        color="text.secondary"
      >
        {label}
      </Typography>
    </Box>
  );

  return (
    <DashCard>
      <CardContent>
        <Typography
          variant="caption"
          color={theme.palette.secondary[300]}
          gutterBottom
          display="block"
        >
          @{user_name}
        </Typography>
        <FlexBetween sx={{ py: 0.5 }}>
          <Typography
            variant="subtitle1"
            fontWeight="bold"
            color={
              theme.palette.mode === "dark"
                ? theme.palette.primary[100]
                : theme.palette.grey[900]
            }
            gutterBottom
          >
            {display_name}
          </Typography>
          {avatar ? (
            <Box
              component="img"
              alt=""
              src={avatar}
              height="64px"
              width="64px"
              borderRadius="50%"
              sx={{ objectFit: "cover", bgcolor: theme.palette.grey[800] }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.nextSibling;
                if (fallback) fallback.style.display = "flex";
              }}
            />
          ) : null}
          <Box
            height="64px"
            width="64px"
            borderRadius="50%"
            display={avatar ? "none" : "flex"}
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
              fontSize: 20,
            }}
          >
            {(display_name || user_name || "?").charAt(0).toUpperCase()}
          </Box>
        </FlexBetween>
        <FlexBetween sx={{ pt: 2 }}>
          <StatChip label="Messages" value={formatNumber(number_of_messages)} />
          <StatChip label="Firsts" value={firsts} />
          <StatChip label="Juice" value={formatNumber(juice)} />
        </FlexBetween>
      </CardContent>
      <CardActions sx={{ px: 1.5, pt: 0, pb: 1 }}>
        <Button size="small" onClick={() => setIsExpanded(!isExpanded)}>
          See more
        </Button>
      </CardActions>
      <Collapse
        in={isExpanded}
        timeout={theme.transitions.duration.shorter}
        unmountOnExit
      >
        <CardContent sx={{ pt: 0 }}>
          <Typography variant="body2">Joined: {created_at}</Typography>
          <Typography variant="body2">id: {id}</Typography>
        </CardContent>
      </Collapse>
    </DashCard>
  );
};

const Members = () => {
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
  const [sortOrder, setSortOrder] = useState("messages");

  const combinedData = React.useMemo(() => {
    if (!membersData || !messagesData || !juiceData || !scoreData) return [];

    const messageCountMap = messagesData.reduce((acc, message) => {
      acc[message.user_id] = message.messages;
      return acc;
    }, {});
    const juiceMap = juiceData.reduce((acc, juice) => {
      acc[juice.user_id] = juice.total_juice;
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

  const cols = isLg ? 4 : isMd ? 2 : 1;

  return (
    <Box>
      <FlexBetween flexWrap="wrap" gap={2}>
        <Header title="Members" subtitle="All users on the server" />
        <FormControl sx={{ m: 0.5, minWidth: 120 }} size="small">
          <InputLabel id="select-member-sort-label">Sort by</InputLabel>
          <Select
            labelId="select-member-sort-label"
            id="select-member-sort"
            value={sortOrder}
            label="Sort by"
            onChange={(event) => setSortOrder(event.target.value)}
          >
            <MenuItem value="messages">Messages</MenuItem>
            <MenuItem value="firsts">Firsts</MenuItem>
            <MenuItem value="juice">Juice</MenuItem>
          </Select>
        </FormControl>
      </FlexBetween>

      {isLoading ? (
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
      ) : error ? (
        <Box mt={1.5}>
          <QueryState
            isLoading={false}
            error={error}
            onRetry={() => {
              refetchMembers();
            }}
          />
          <Typography variant="caption" color="text.secondary" mt={1} display="block">
            {getApiErrorMessage(error)}
          </Typography>
        </Box>
      ) : combinedData.length === 0 ? (
        <Box mt={1.5}>
          <Typography color="text.secondary">No members found</Typography>
        </Box>
      ) : (
        <Box
          mt={1.5}
          display="grid"
          gridTemplateColumns={`repeat(${cols}, minmax(0, 1fr))`}
          gap={1.5}
        >
          {combinedData.map((member) => (
            <Member key={member.id} {...member} />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default Members;
