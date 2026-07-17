// color design tokens export
export const tokensDark = {
  grey: {
    0: "#ffffff",
    10: "#f6f6f6",
    50: "#f0f0f0",
    100: "#e0e0e0",
    200: "#c2c2c2",
    300: "#a3a3a3",
    400: "#858585",
    500: "#666666",
    600: "#525252",
    700: "#3d3d3d",
    800: "#292929",
    900: "#141414",
    1000: "#000000",
  },
  primary: {
    50: "#ffffff",
    100: "#cdcccd",
    200: "#9a9a9b",
    300: "#686769",
    400: "#353537",
    500: "#030205",
    600: "#020204",
    700: "#020103",
    800: "#010102",
    900: "#010001",
  },
  secondary: {
    100: "#d9d3f3",
    200: "#b4a7e7",
    300: "#8e7bda",
    400: "#694fce",
    500: "#4323c2",
    600: "#361c9b",
    700: "#281574",
    800: "#1b0e4e",
    900: "#0d0727",
  },
  green: {
    200: "#22f553",
    700: "#19b03c",
  },
  red: {
    200: "#fc3838",
    700: "#c90e0e",
  },
  white: {
    0: "#ffffff",
    200: "#dddddd",
    400: "#cbcbcb",
    600: "#a6a6a6",
    800: "#818181",
    1000: "#292929",
  },
};

function reverseTokens(tokensDark) {
  const reversedTokens = {};
  Object.entries(tokensDark).forEach(([key, val]) => {
    const keys = Object.keys(val);
    const values = Object.values(val);
    const length = keys.length;
    const reversedObj = {};
    for (let i = 0; i < length; i++) {
      reversedObj[keys[i]] = values[length - i - 1];
    }
    reversedTokens[key] = reversedObj;
  });
  return reversedTokens;
}
export const tokensLight = reverseTokens(tokensDark);

const cardShadow = (mode) =>
  mode === "light"
    ? "0 1px 3px rgba(0, 0, 0, 0.12)"
    : "0 1px 3px rgba(0, 0, 0, 0.4)";

const cardShadowHover = (mode) =>
  mode === "light"
    ? "0 2px 8px rgba(0, 0, 0, 0.12)"
    : "0 2px 8px rgba(0, 0, 0, 0.4)";

export const themeSettings = (mode) => {
  return {
    palette: {
      mode: mode,
      ...(mode === "dark"
        ? {
            primary: {
              ...tokensDark.primary,
              main: tokensDark.primary[400],
              light: tokensDark.primary[400],
            },
            secondary: {
              ...tokensDark.secondary,
              main: tokensDark.secondary[300],
            },
            neutral: {
              ...tokensDark.grey,
              main: tokensDark.grey[500],
            },
            background: {
              default: tokensDark.primary[600],
              alt: tokensDark.grey[900],
            },
            green: {
              default: tokensDark.green[200],
            },
            red: {
              default: tokensDark.red[200],
            },
            white: {
              ...tokensDark.white,
              default: tokensDark.white[0],
            },
            text: {
              primary: tokensDark.grey[100],
              secondary: tokensDark.grey[300],
            },
          }
        : {
            // Light mode: keep secondary vivid for accents; use dark greys for text
            primary: {
              ...tokensLight.primary,
              main: tokensDark.grey[50],
              light: tokensDark.grey[100],
            },
            secondary: {
              ...tokensDark.secondary,
              main: tokensDark.secondary[600],
              light: tokensDark.secondary[700],
            },
            neutral: {
              ...tokensDark.grey,
              main: tokensDark.grey[500],
            },
            background: {
              default: "#f7f7f9",
              alt: "#ffffff",
            },
            green: {
              default: tokensDark.green[700],
            },
            red: {
              default: tokensDark.red[700],
            },
            white: {
              ...tokensDark.white,
              default: tokensDark.white[1000],
            },
            text: {
              primary: tokensDark.grey[900],
              secondary: tokensDark.grey[600],
            },
          }),
    },
    shape: {
      borderRadius: 2,
    },
    customShadows: {
      card: cardShadow(mode),
      cardHover: cardShadowHover(mode),
    },
    transitions: {
      duration: {
        shortest: 100,
        shorter: 150,
        short: 200,
        standard: 250,
        complex: 300,
        enteringScreen: 150,
        leavingScreen: 150,
      },
    },
    typography: {
      fontFamily: ["Inter", "sans-serif"].join(","),
      fontSize: 13,
      h1: {
        fontFamily: ["Inter", "sans-serif"].join(","),
        fontSize: 40,
      },
      h2: {
        fontFamily: ["Inter", "sans-serif"].join(","),
        fontSize: 32,
      },
      h3: {
        fontFamily: ["Inter", "sans-serif"].join(","),
        fontSize: 24,
      },
      h4: {
        fontFamily: ["Inter", "sans-serif"].join(","),
        fontSize: 20,
      },
      h5: {
        fontFamily: ["Inter", "sans-serif"].join(","),
        fontSize: 16,
      },
      h6: {
        fontFamily: ["Inter", "sans-serif"].join(","),
        fontSize: 14,
      },
    },
    components: {
      MuiButton: {
        defaultProps: {
          size: "small",
        },
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
          },
          sizeSmall: {
            padding: "4px 10px",
          },
        },
      },
      MuiIconButton: {
        defaultProps: {
          size: "small",
        },
        styleOverrides: {
          root: {
            padding: 8,
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: 52,
            "@media (min-width: 600px)": {
              minHeight: 52,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundImage: "none",
            backgroundColor: theme.palette.background.alt,
            boxShadow: theme.customShadows.card,
          }),
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 12,
            "&:last-child": {
              paddingBottom: 12,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
          rounded: ({ theme }) => ({
            borderRadius: theme.shape.borderRadius,
          }),
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: theme.shape.borderRadius,
          }),
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: theme.shape.borderRadius,
          }),
        },
      },
      MuiChip: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: theme.shape.borderRadius,
          }),
        },
      },
    },
  };
};
