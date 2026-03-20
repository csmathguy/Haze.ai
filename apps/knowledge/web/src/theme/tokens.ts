export const colorTokens = {
  dark: {
    accent: "#d27b4a",
    background: {
      default: "#12161b",
      paper: "#191f25"
    },
    border: "#2d3742",
    primary: "#d6e3ea",
    success: "#74b48b",
    warning: "#d6a65f"
  },
  light: {
    accent: "#b2572e",
    background: {
      default: "#efe6d7",
      paper: "#f8f2e8"
    },
    border: "#dac9b0",
    primary: "#193c47",
    success: "#2f6a4f",
    warning: "#916521"
  }
} as const;

export const typographyTokens = {
  bodyFontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
  headingFontFamily: '"Space Grotesk", "Trebuchet MS", sans-serif'
} as const;

export const shapeTokens = {
  borderRadius: 22
} as const;
