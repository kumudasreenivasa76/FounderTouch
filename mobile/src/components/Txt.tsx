import { Text, type TextProps, type TextStyle } from "react-native";
import { type as t } from "../theme";

type Variant = keyof typeof t;

export function Txt({ v = "body", style, ...rest }: TextProps & { v?: Variant; style?: TextStyle | TextStyle[] | any }) {
  return <Text {...rest} style={[t[v], style]} />;
}
