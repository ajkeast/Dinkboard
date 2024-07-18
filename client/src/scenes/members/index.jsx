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
    FormControl,
    InputLabel,
    Select,
    MenuItem
    } from "@mui/material";
    import Header from "components/Header";
    import { 
        useGetMembersQuery, 
        useGetJuiceByMemberQuery, 
        useGetMessagesByMembersQuery,
        useGetScoreQuery } from "state/api";
import FlexBetween from 'components/FlexBetween';

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

    function formatNumber(num) {
        if (num >= 10000) {
            return (Math.floor(num / 1000)) + 'k';
        } 
        else if (num >=1000){
            return (num / 1000).toFixed(1) + 'k';
        } else {
            return num.toString();
        }
    };

    const StatBox = ({ label, value }) => (
        <Box
            sx={{
                backgroundColor: theme.palette.white[1000],
                borderRadius: '0.25rem',
                padding: '0.2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30%',
            }}
            >
            <Typography variant="body" align="center" >
                <strong>{value}</strong>
            </Typography>
            <Typography variant="body" align="center" sx= {{ fontSize: 12 }}>
                {label}
            </Typography>
            </Box>
        );

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
                    <FlexBetween sx={{ padding: '0.5rem 0rem'}}>                      
                        <Typography sx={{ fontSize: 16,  fontWeight: 'bold'}} color={theme.palette.primary[100]} gutterBottom>
                            {display_name}
                        </Typography>
                        <Box 
                            component="img"
                            alt="profile"
                            src={avatar}
                            height="80px"
                            width="80px"
                            borderRadius="50%"
                            sx={{ objectFit: "cover" }}
                        />
                    </FlexBetween>
                    <FlexBetween sx={{ paddingTop: '2rem' }}>
                        <StatBox label={'Messages'} value={formatNumber(number_of_messages)}/>
                        <StatBox label={'Firsts'} value={firsts}/>
                        <StatBox label={'Juice'} value={formatNumber(juice)}/>
                    </FlexBetween>
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
                        <Typography color={theme.palette.white[0]}>Joined: {created_at} </Typography>
                        <Typography color={theme.palette.white[0]}>id: {id}</Typography>
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
    const isLoading = isMembersLoading || isMessagesLoading || isJuiceLoading || isScoreLoading;

    const isNonMobile = useMediaQuery("(min-width: 1000px)");

    const theme = useTheme();
    
    const [sortOrder, setSortOrder] = useState(''); // 'messages', 'juice', or 'firsts'

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

        const sortedData = membersData.map(member => ({
            ...member,
            number_of_messages: messageCountMap[member.id] || 0,
            juice: juiceMap[member.id] || 0,
            firsts: scoreMap[member.id] || 0,
        }));

        // Sort based on the current sortOrder
        switch(sortOrder) {
            case 'messages':
                return sortedData.sort((a, b) => b.number_of_messages - a.number_of_messages);
            case 'juice':
                return sortedData.sort((a, b) => b.juice - a.juice);
            case 'firsts':
                return sortedData.sort((a, b) => b.firsts - a.firsts);
            default:
                return sortedData.sort((a, b) => b.number_of_messages - a.number_of_messages);
        };

    }, [membersData, messagesData, juiceData, sortOrder]);

    // Add a button or dropdown to change the sort order
    const handleSortChange = (newSortOrder) => {
        setSortOrder(newSortOrder);
    };

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
            <FlexBetween >
                    <Header title="Members" subtitle="All users on the server"/>
                    <FormControl sx={{ m: 1, minWidth: 120 }}>
                        <InputLabel 
                            id="select-member-sort-label"
                            sx={{
                                color: theme.palette.primary[100],
                                '&.Mui-focused': {
                                  color: theme.palette.primary[100]
                                },
                              }}
                            >
                            Sort by
                        </InputLabel>
                        <Select
                            labelId="select-member-sort-label"
                            id="select-member-sort"
                            value={sortOrder}
                            label="Sort by"
                            onChange={(event) => handleSortChange(event.target.value)}
                            sx={{
                                color: theme.palette.background[900],
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: theme.palette.grey[400],
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  //borderColor: ,
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: theme.palette.secondary[400],
                                },
                              }}
                        >
                            <MenuItem value="" disabled><em>Sort by</em></MenuItem>
                            <MenuItem value={'messages'}>Messages</MenuItem>
                            <MenuItem value={'firsts'}>Firsts</MenuItem>
                            <MenuItem value={'juice'}>Juice</MenuItem>
                        </Select>
                    </FormControl>                           
            </FlexBetween>
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