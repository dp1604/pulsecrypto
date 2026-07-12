import { colors } from "../theme";

export const resolveTabIconTint = (focused: boolean): string =>
  focused ? colors.buy : colors.textMuted;
