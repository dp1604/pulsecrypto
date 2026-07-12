import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme";

export const BACK_ICON_SIZE_DP = 21;

type BackIconProps = {
  size?: number;
  color?: string;
};

export const BackIcon = ({
  size = BACK_ICON_SIZE_DP,
  color = colors.buy
}: BackIconProps) => (
  <Svg height={size} viewBox="0 0 24 24" width={size}>
    <Path
      d="M14.5 5.5L8 12l6.5 6.5"
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
    <Path
      d="M8 12h10"
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  </Svg>
);
