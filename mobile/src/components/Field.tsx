import { forwardRef, useState } from "react";
import { StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from "react-native";
import { colors, fonts, radius } from "../theme";
import { Txt } from "./Txt";

export const Field = forwardRef<TextInputInstance, TextInputProps & { label: string; hint?: string }>(function Field({ label, hint, style, multiline, ...rest }, ref) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginBottom: 12 }}>
      <Txt v="label" style={{ marginBottom: 6 }}>{label}</Txt>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.placeholder}
        {...rest}
        multiline={multiline}
        onFocus={(e) => {
          setFocus(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(false);
          rest.onBlur?.(e);
        }}
        style={[s.input, multiline && s.multi, focus && s.focus, style]}
      />
      {hint ? <Txt v="small" style={{ marginTop: 5, fontSize: 12.5 }}>{hint}</Txt> : null}
    </View>
  );
});

const s = StyleSheet.create({
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontFamily: fonts.regular,
    fontSize: 15.5,
    color: colors.ink,
  },
  multi: { minHeight: 92, textAlignVertical: "top" },
  focus: { borderColor: colors.ink },
});
