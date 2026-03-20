import { alpha, createTheme } from "@mui/material/styles";

import { colorTokens, shapeTokens, typographyTokens } from "./tokens.js";

export type KnowledgeColorMode = "light" | "dark";

export function createKnowledgeTheme(mode: KnowledgeColorMode) {
  const paletteTokens = colorTokens[mode];

  return createTheme({
    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true
        },
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 600,
            textTransform: "none"
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            border: `1px solid ${alpha(paletteTokens.border, 0.9)}`
          }
        }
      }
    },
    cssVariables: true,
    palette: {
      background: paletteTokens.background,
      mode,
      primary: {
        main: paletteTokens.primary
      },
      secondary: {
        main: paletteTokens.accent
      },
      success: {
        main: paletteTokens.success
      },
      warning: {
        main: paletteTokens.warning
      }
    },
    shape: {
      borderRadius: shapeTokens.borderRadius
    },
    typography: {
      fontFamily: typographyTokens.bodyFontFamily,
      h1: {
        fontFamily: typographyTokens.headingFontFamily,
        fontSize: "2.6rem"
      },
      h2: {
        fontFamily: typographyTokens.headingFontFamily,
        fontSize: "1.6rem"
      },
      h3: {
        fontFamily: typographyTokens.headingFontFamily
      }
    }
  });
}
