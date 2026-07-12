import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme";

export const BOOKMARK_ICON_SIZE_DP = 21;

type BookmarkIconProps = {
  filled: boolean;
  size?: number;
  strokeColor?: string;
  fillColor?: string;
};

export const BookmarkIcon = ({
  filled,
  size = BOOKMARK_ICON_SIZE_DP,
  strokeColor,
  fillColor
}: BookmarkIconProps) => {
  const stroke = strokeColor ?? (filled ? colors.buy : colors.textSecondary);
  const fill = filled ? (fillColor ?? colors.buy) : "transparent";

  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M6 4.5C6 3.67 6.67 3 7.5 3h9c.83 0 1.5.67 1.5 1.5V20l-6-4-6 4V4.5z"
        fill={fill}
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.6}
      />
    </Svg>
  );
};
