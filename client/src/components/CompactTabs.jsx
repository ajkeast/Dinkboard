import { Tab, Tabs, useTheme } from "@mui/material";

/**
 * Compact underline tabs. Same control the DinkCoin page uses to switch
 * Transactions and Balances on a narrow screen.
 */
const CompactTabs = ({ value, onChange, tabs, ariaLabel }) => {
  const theme = useTheme();

  return (
    <Tabs
      value={value}
      onChange={(_, next) => onChange(next)}
      aria-label={ariaLabel}
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
      {tabs.map((tab) => (
        <Tab
          key={tab.value}
          id={tab.id}
          aria-controls={tab.controls}
          label={tab.label}
          value={tab.value}
        />
      ))}
    </Tabs>
  );
};

export default CompactTabs;
