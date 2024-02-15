import React, { useState } from 'react';
import {
    Box,
    Card,
    CardActions,
    CardContent,
    Collapse,
    Button,
    Typography,
    Rating,
    useTheme,
    useMediaQuery,
    } from "@mui/material";
    import Header from "components/Header";
    import { useGetMembersQuery } from "state/api";

const Member = ({
    id,
    user_name,
    display_name,
    avatar,
    created_at,
    last_updated
}) => {
    const theme = useTheme();
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <Card
            sx={{
                backgroundImage: "none",
                backgroundColor: theme.palette.background.alt,
                borderRadius: "0.55rem"
            }}
        >
            <CardContent>
                <Typography sx={{ fontSize: 14 }} color={theme.palette.secondary[300]} gutterBottom>
                    @{user_name}
                </Typography>
                <Box sx={{ justifyContent: "space-between", display: "flex" }}>
                    <Typography variant='h5'>
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
    )
}
const Members = () => {
    const { data, isLoading } = useGetMembersQuery();
    const isNonMobile = useMediaQuery("(min-width: 1000px)");

    return (
        <Box m="1.5rem 2.5rem">
            <Header title="Members" subtitle="All users on the server"/>
            {data && !isLoading ? (
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
                {data.map(({
                    id,
                    user_name,
                    display_name,
                    avatar,
                    created_at,
                    last_updated,
                }) => (
                    <Member 
                    id={id}
                    user_name={user_name}
                    display_name={display_name}
                    avatar={avatar}
                    created_at={created_at}
                    last_updated={last_updated}/>
                ))}
                </Box>
                ) : (
                    <>Loading...</>)
            
        }
        </Box>
    )
}

export default Members