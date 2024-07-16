import moment from 'moment-timezone';

export const convertToEasternTime = (utcTimestamp) => {
    return moment.utc(utcTimestamp).tz('America/New_York');
};

export const calculateMinutesAfterMidnight = (timestamp) => {
    return timestamp.hours() * 60 + timestamp.minutes() + timestamp.seconds() / 60;
};

export const processTimestamp = (row) => {
    const easternTime = convertToEasternTime(row.timesent);
    const minutesAfterMidnight = calculateMinutesAfterMidnight(easternTime);
    
    return {
        user_id: row.user_id,
        user_name: row.user_name,
        original_timestamp: row.timesent,
        eastern_timestamp: easternTime.format(),
        juice: Math.round(minutesAfterMidnight * 100) / 100
    };
};

export const groupByUserAndSumMinutes = (processedData) => {
    const grouped = processedData.reduce((acc, curr) => {
        if (!acc[curr.user_id]) {
            acc[curr.user_id] = 0;
        }
        acc[curr.user_id] += curr.juice;
        return acc;
    }, {});

    return Object.entries(grouped).map(([user_id, total_minutes]) => ({
        user_id,
        total_juice: Math.round(total_minutes * 100) / 100
    }));
};