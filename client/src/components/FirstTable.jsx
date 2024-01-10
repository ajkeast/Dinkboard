import React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, colors, LinearProgress } from '@mui/material';

const FirstTable = ({ data, isLoading }) => {
  // Define columns for the DataGrid
  const columns = [
    { field: 'user_name', headerName: 'Name', flex: 1, headerClassName: 'first-table-column-header' },
    { field: 'firsts', headerName: 'Firsts', flex: 1, headerClassName: 'first-table-column-header' },
    { field: 'days_since_first', headerName: 'Days Since First', flex: 1, headerClassName: 'first-table-column-header' },
  ];

  if (!data || isLoading) return (
    <DataGrid
        columns={columns}
        rows={[]}
        slots={{loadingOverlay: LinearProgress}}
        loading
        {...data}
        sx = {{'& .first-table-column-header': {fontWeight: 'bold !important'}}}
      />
  )

  else {
    
    // Map the data to rows
    const rows = data.map((item, index) => ({
      id: index + 1,
      user_name: item.user_name,
      firsts: item.firsts,
      days_since_first: item.days_since_first,
    }));

    return (
      <Box>
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } }
          }}
          autoHeight
          sx = {{'& .first-table-column-header': {fontWeight: 'bold !important'}}}
        />
      </Box>
    );
  };
}
export default FirstTable;
