export type TypographyStyle = {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?:
    | "normal"
    | "bold"
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900";
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
  fontVariant?: Array<"tabular-nums" | "lining-nums" | "proportional-nums">;
  colorRole?: "muted" | "secondary";
};
