import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#75D7FF", // Siren Blue
      light: "#A8E7FF",
      dark: "#258BC4", // Deep Siren Blue
      contrastText: "#08090D",
    },
    secondary: {
      main: "#FF3D9A", // Neon Pink
      light: "#FF70B6",
      dark: "#C91871",
      contrastText: "#FFFFFF",
    },
    background: {
      default: "#08090D", // Jet Black
      paper: "#11141B",   // Deep Charcoal
    },
    text: {
      primary: "#F5F3EF",   // Pearl White
      secondary: "#A4ADBA", // Muted Silver
    },
    divider: "#292F3B",     // Border Graphite
    error: {
      main: "#F43F5E",
      light: "#FB7185",
      dark: "#E11D48",
    },
    warning: {
      main: "#F59E0B",
      light: "#FBBF24",
      dark: "#D97706",
    },
    success: {
      main: "#10B981",
      light: "#34D399",
      dark: "#059669",
    },
    info: {
      main: "#75D7FF",
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily:
      '"Inter", "Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontWeight: 800, letterSpacing: "-0.025em" },
    h2: { fontWeight: 800, letterSpacing: "-0.025em" },
    h3: { fontWeight: 700, letterSpacing: "-0.02em" },
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h5: { fontWeight: 600, letterSpacing: "-0.01em" },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500 },
    button: { fontWeight: 600, textTransform: "none", letterSpacing: "0.01em" },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 10,
          fontWeight: 600,
          boxShadow: "none",
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          "&:hover": {
            boxShadow: "none",
          },
        },
        containedPrimary: {
          backgroundColor: "#75D7FF",
          color: "#08090D",
          "&:hover": {
            backgroundColor: "#A8E7FF",
          },
        },
        containedSecondary: {
          backgroundColor: "#FF3D9A",
          color: "#FFFFFF",
          "&:hover": {
            backgroundColor: "#FF66AE",
          },
        },
        outlined: {
          borderColor: "#292F3B",
          color: "#F5F3EF",
          "&:hover": {
            borderColor: "#75D7FF",
            backgroundColor: "rgba(117, 215, 255, 0.06)",
          },
        },
        sizeLarge: { padding: "11px 24px" },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: "#11141B",
          border: "1px solid #292F3B",
          boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.4)",
          borderRadius: 14,
          transition: "border-color 0.2s ease, transform 0.2s ease",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#11141B",
        },
        elevation1: {
          boxShadow: "none",
          border: "1px solid #292F3B",
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            backgroundColor: "#191E28",
            borderRadius: 10,
            "& fieldset": {
              borderColor: "#292F3B",
            },
            "&:hover fieldset": {
              borderColor: "#75D7FF",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#75D7FF",
              borderWidth: 1.5,
            },
          },
          "& .MuiInputLabel-root": {
            color: "#A4ADBA",
            "&.Mui-focused": {
              color: "#75D7FF",
            },
          },
          "& .MuiInputBase-input": {
            color: "#F5F3EF",
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          backgroundColor: "#08090D",
          borderBottom: "1px solid #292F3B",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: "#75D7FF",
          height: 3,
          borderRadius: "3px 3px 0 0",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          color: "#A4ADBA",
          "&.Mui-selected": {
            color: "#75D7FF",
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: "1px solid",
        },
        standardSuccess: {
          backgroundColor: "rgba(16, 185, 129, 0.12)",
          borderColor: "rgba(16, 185, 129, 0.3)",
          color: "#6EE7B7",
        },
        standardError: {
          backgroundColor: "rgba(244, 63, 94, 0.12)",
          borderColor: "rgba(244, 63, 94, 0.3)",
          color: "#FDA4AF",
        },
        standardWarning: {
          backgroundColor: "rgba(245, 158, 11, 0.12)",
          borderColor: "rgba(245, 158, 11, 0.3)",
          color: "#FCD34D",
        },
        standardInfo: {
          backgroundColor: "rgba(117, 215, 255, 0.12)",
          borderColor: "rgba(117, 215, 255, 0.3)",
          color: "#BAE6FD",
        },
      },
    },
  },
});

