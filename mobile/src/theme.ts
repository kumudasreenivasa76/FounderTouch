import { Platform, type TextStyle, type ViewStyle } from "react-native";

/** Design tokens mirrored from the web app (app/globals.css). */
export const colors = {
  canvas: "#eceef1",
  bg: "#f6f7f8",
  surface: "#ffffff",
  sunken: "#f0f1f3",
  line: "#e3e5e8",
  lineStrong: "#d2d5da",
  ink: "#15171a",
  ink2: "#4b5059",
  ink3: "#7c818b",
  placeholder: "#a3a7ae",
  accent: "#2350d8",
  accentSoft: "#eaf0fd",
  good: "#127a52",
  goodSoft: "#e7f5ee",
  warn: "#9a5b00",
  warnSoft: "#fdf4e4",
  bad: "#b42318",
  badSoft: "#fdecea",
  white: "#ffffff",
};

export const radius = { sm: 10, md: 14, lg: 20, btn: 12, card: 18, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const fonts = {
  regular: "HankenGrotesk_400Regular",
  medium: "HankenGrotesk_500Medium",
  semibold: "HankenGrotesk_600SemiBold",
  bold: "HankenGrotesk_700Bold",
};

/** Icon stroke used everywhere so the set reads as one line style. */
export const ICON_STROKE = 1.75;

export const type = {
  display: { fontFamily: fonts.bold, fontSize: 26, letterSpacing: -0.7, color: colors.ink } as TextStyle,
  title: { fontFamily: fonts.bold, fontSize: 20, letterSpacing: -0.45, color: colors.ink } as TextStyle,
  heading: { fontFamily: fonts.semibold, fontSize: 16, letterSpacing: -0.2, color: colors.ink } as TextStyle,
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink } as TextStyle,
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.ink } as TextStyle,
  small: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 19, color: colors.ink3 } as TextStyle,
  label: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.ink2 } as TextStyle,
  overline: { fontFamily: fonts.semibold, fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase", color: colors.ink3 } as TextStyle,
};

function shadow(y: number, blur: number, opacity: number, elevation: number): ViewStyle {
  return Platform.select<ViewStyle>({
    web: { boxShadow: `0 ${y}px ${blur}px rgba(16,18,22,${opacity})` } as ViewStyle,
    default: {
      shadowColor: "#101216",
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: blur / 2,
      elevation,
    },
  })!;
}

export const shadows = {
  card: shadow(1, 2, 0.05, 1),
  float: shadow(14, 32, 0.28, 10),
  soft: shadow(4, 14, 0.08, 3),
};
