import React, { useState } from 'react';
import {
    Box,
    Card,
    CardActions,
    CardContent,
    Collapse,
    Button,
    Typography,
    useTheme,
    useMediaQuery,
    Grow,
    } from "@mui/material";
    import Header from "components/Header";
    import { 
        useGetMembersQuery, 
        useGetJuiceByMemberQuery, 
        useGetMessagesByMembersQuery,
        useGetScoreQuery } from "state/api";

const Member = ({
    index,
    id,
    user_name,
    display_name,
    number_of_messages,
    firsts,
    juice,
    avatar,
    created_at,
    last_updated
}) => {
    const theme = useTheme();
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <Grow 
            in={true} 
            style={{ transformOrigin: '0 0 0' }} 
            timeout={{ enter: 100 * index }}
            >
            <Card
                sx={{
                    backgroundImage: "none",
                    backgroundColor: theme.palette.background.alt,
                    borderRadius: "0.55rem",
                    boxShadow: `0px 4px 8px ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)'}`,
                }}
            >
                <CardContent>
                    <Typography sx={{ fontSize: 14 }} color={theme.palette.secondary[300]} gutterBottom>
                        @{user_name}
                    </Typography>
                    <Box sx={{ justifyContent: "space-between", display: "flex" }}>
                        <Box sx={{ justifyContent: "space-between", display: "flex" }}>
                                <Typography variant='h5'>
                                    {display_name}
                                    <br/><br/><br/>
                                    <tr>
                                        <td><strong>Messages</strong>:</td>
                                        <td>{number_of_messages}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Firsts</strong>:</td>
                                        <td>{firsts}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Juice</strong>:</td>
                                        <td>{juice}</td>
                                    </tr>
                                </Typography>
                        </Box>
                        <Box 
                            component="img"
                            alt="profile"
                            src={avatar}
                            height="80px"
                            width="80px"
                            borderRadius="50%"
                            sx={{ objectFit: "cover" }}
                        />
                    </Box>
                    <Typography sx={{ mb: "1.5rem"}} color={theme.palette.secondary[300]}>
                        Joined {created_at}
                    </Typography>
                </CardContent>
                <CardActions>
                    <Button
                        variant="primary"
                        size="small"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        See more
                    </Button>
                </CardActions>
                <Collapse
                    in={isExpanded}
                    timeout="auto"
                    unmountOnExit
                    sx={{
                        color: theme.palette.grey[300]
                    }}
                >
                    <CardContent>
                        <Typography>id: {id}</Typography>
                        <Typography>updated: {last_updated}</Typography>
                    </CardContent>
                </Collapse>
            </Card>
        </Grow>
    )
}

const Members = () => {
    const { data: membersData, isLoading: isMembersLoading } = useGetMembersQuery();
    const { data: messagesData, isLoading: isMessagesLoading } = useGetMessagesByMembersQuery();
    const { data: juiceData, isLoading: isJuiceLoading } = useGetJuiceByMemberQuery();
    const { data: scoreData, isLoading: isScoreLoading } = useGetScoreQuery();

    const isNonMobile = useMediaQuery("(min-width: 1000px)");

    const isLoading = isMembersLoading || isMessagesLoading || isJuiceLoading || isScoreLoading;

    // Combine member data with their respective message counts
    const combinedData = React.useMemo(() => {
        // If either membersData or messagesData is not available, return an empty array
        if (!membersData || !messagesData || !juiceData || !scoreData) return [];

        // Create a map of message counts for quick lookup
        const messageCountMap = messagesData.reduce((acc, message) => {
            acc[message.user_id] = message.messages;
            return acc;
        }, {});

        // Create a map of juice for quick lookup
        const juiceMap = juiceData.reduce((acc, juice) => {
            acc[juice.user_id] = juice.total_juice;
            return acc;
        }, {});

        // Create a map of juice for quick lookup
        const scoreMap = scoreData.reduce((acc, score) => {
            acc[score.user_id] = score.firsts;
            return acc;
        }, {});

        // Map over each member and add their message count
        return membersData.map(member => ({
            ...member,                                              // Spread all existing member properties
            number_of_messages: messageCountMap[member.id] || 0,    // Add message count or 0 if not found
            juice: juiceMap[member.id] || 0,                        // Add juice or 0 if not found
            firsts: scoreMap[member.id] || 0,                        // Add firsts or 0 if not found
        }));
    }, [membersData, messagesData, juiceData]);

    if (isLoading) {
        return (
            <Box m="1.5rem 2.5rem">
                <Header title="Members" subtitle="All users on the server"/>
                <Box mt="20px">Loading...</Box>
            </Box>
        );
    }

    return (
        <Box m="1.5rem 2.5rem">
            <Header title="Members" subtitle="All users on the server"/>
            <Box 
                mt="20px" 
                display="grid"
                gridTemplateColumns="repeat(4,minmax(0, 1fr))"
                justifyContent="space-between"
                rowGap="20px"
                columnGap="1.33%"
                sx={{
                    "& > div": {gridColumn: isNonMobile ? undefined : "span 4"}
                }}
            >
                {combinedData.map(({
                    id,
                    user_name,
                    display_name,
                    number_of_messages,
                    firsts,
                    juice,
                    avatar,
                    created_at,
                    last_updated,
                }, index) => (
                    <Member
                        key={id}
                        index={index} 
                        id={id}
                        user_name={user_name}
                        display_name={display_name}
                        number_of_messages={number_of_messages}
                        juice={juice}
                        firsts={firsts}
                        avatar={avatar}
                        created_at={created_at}
                        last_updated={last_updated}
                    />
                ))}
            </Box>
        </Box>
    );
};

export default Members;