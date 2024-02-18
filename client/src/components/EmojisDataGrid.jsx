import React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, colors, LinearProgress, useTheme } from '@mui/material';

const EmojisDataGrid = ({ data, isLoading }) => {
  // Define columns for the DataGrid
  const theme = useTheme();
  const columns = [
    {
      field: 'url',
      headerName: 'Icon',
      flex: 1,
      headerClassName: 'emoji-table-column-header',
      renderCell: (params) => (
        <img src={params.value} alt="Icon" style={{ width: '30px', height: '30px' }} />
      ),
    },
    { field: 'emoji_name', headerName: 'Name', flex: 3, headerClassName: 'emoji-table-column-header' },
    { field: 'occurrences', headerName: 'Occurrences', flex: 3, headerClassName: 'emoji-table-column-header' },
    { field: 'created_at', headerName: 'Created on', flex: 3, headerClassName: 'emoji-table-column-header' },
  ];

  if (!data || isLoading) return (
    <DataGrid
        columns={columns}
        rows={[]}
        slots={{loadingOverlay: LinearProgress}}
        loading
        {...data}
        sx = {{
          '& .emoji-table-column-header': {fontWeight: 'bold !important'},
        }}
      />
  )

  else {
    // Map the data to rows
    const rows = data.map((item, index) => ({
      id: index + 1,
      emoji_name: item.emoji_name,
      occurrences: item.occurrences,
      created_at: item.created_at,
      url: item.url,
    }));
    return (
      <Box>
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{
            pagination: { paginationModel: { pageSize: 100 } }
          }}
          //autoHeight
          sx = {{
            fontSize: '0.9rem',
            border: '1.5px solid #ccc',
            '& .MuiDataGrid-columnHeader': {fontWeight: 'bold !important',},
            '& .MuiDataGrid-row:hover': {
              boxShadow: `0px 2px 4px ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'}`,
              transition: 'box-shadow 0.25s', // Add a smooth transition effect for multiple properties
            },
            '& .MuiDataGrid-columnHeader:hover, & .MuiDataGrid-row:hover .MuiDataGrid-cell': {
              transform: 'translateY(2px)', // Move down by 2 pixels
              transition: 'transform 0.25s',
            }
        }}
        />
      </Box>
    );
  };
}
export default EmojisDataGrid;
