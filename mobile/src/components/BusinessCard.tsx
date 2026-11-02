import { useRef, useState } from "react";
import { Animated, Image, Platform, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts, shadows } from "../theme";
import { initials } from "../format";
import { Icon } from "./Icon";
import { Txt } from "./Txt";

export type CardFace = {
  name: string;
  byline: string;
  photoUrl?: string | null;
  theme: { from: string; to: string };
  lines?: { icon: string; text: string }[];
  modeLabel?: string;
  handle?: string;
};

/** The hero: a 1.586 business card with a gradient face. Tap to flip to the contact lines. */
export function BusinessCard({ card, flippable = true }: { card: CardFace; flippable?: boolean }) {
  const [back, setBack] = useState(false);
  const turn = useRef(new Animated.Value(0)).current;
  const native = Platform.OS !== "web";

  const flip = () => {
    if (!flippable) return;
    const to = back ? 0 : 1;
    setBack(!back);
    Animated.spring(turn, { toValue: to, useNativeDriver: native, friction: 8, tension: 60 }).start();
  };

  const frontRot = turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRot = turn.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });
  const frontOpacity = turn.interpolate({ inputRange: [0, 0.5, 0.501, 1], outputRange: [1, 1, 0, 0] });
  const backOpacity = turn.interpolate({ inputRange: [0, 0.5, 0.501, 1], outputRange: [0, 0, 1, 1] });

  return (
    <Pressable onPress={flip} accessibilityRole={flippable ? "button" : undefined} accessibilityHint={flippable ? "Flips the card" : undefined} style={[s.wrap, shadows.float]}>
      <Animated.View pointerEvents="none" style={[s.face, { opacity: frontOpacity, transform: [{ perspective: 1200 }, { rotateY: frontRot }] }]}>
        <Front card={card} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[s.face, StyleSheet.absoluteFill, { opacity: backOpacity, transform: [{ perspective: 1200 }, { rotateY: backRot }] }]}>
        <Back card={card} />
      </Animated.View>
    </Pressable>
  );
}

function Shell({ card, children }: { card: CardFace; children: React.ReactNode }) {
  return (
    <LinearGradient colors={[card.theme.from, card.theme.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.card}>
      {/* subtle top highlight */}
      <LinearGradient colors={["rgba(255,255,255,0.16)", "rgba(255,255,255,0)"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={s.highlight} pointerEvents="none" />
      <View style={s.edge} pointerEvents="none" />
      {children}
    </LinearGradient>
  );
}

function Front({ card }: { card: CardFace }) {
  return (
    <Shell card={card}>
      <View style={s.top}>
        {card.photoUrl ? (
          <Image source={{ uri: card.photoUrl }} style={s.photo} />
        ) : (
          <View style={s.initials}>
            <Txt style={s.initialsText}>{initials(card.name)}</Txt>
          </View>
        )}
        {card.modeLabel ? (
          <View style={s.modeTag}>
            <Txt style={s.modeText}>{card.modeLabel}</Txt>
          </View>
        ) : null}
      </View>
      <View>
        <Txt style={s.name} numberOfLines={1}>{card.name}</Txt>
        {card.byline ? <Txt style={s.byline} numberOfLines={2}>{card.byline}</Txt> : null}
      </View>
    </Shell>
  );
}

function Back({ card }: { card: CardFace }) {
  const lines = card.lines ?? [];
  return (
    <Shell card={card}>
      <Txt style={s.backTitle}>{card.name}</Txt>
      <View style={{ gap: 9 }}>
        {lines.length ? (
          lines.map((l, i) => (
            <View key={i} style={s.line}>
              <Icon n={l.icon} size={15} color="rgba(255,255,255,0.8)" />
              <Txt style={s.lineText} numberOfLines={1}>{l.text}</Txt>
            </View>
          ))
        ) : (
          <Txt style={s.lineText}>Add a phone, email or website in Profile.</Txt>
        )}
      </View>
      <Txt style={s.brand}>{card.handle ? `foundertouch / ${card.handle}` : "FounderTouch"}</Txt>
    </Shell>
  );
}

const s = StyleSheet.create({
  wrap: { width: "100%", aspectRatio: 1.586, borderRadius: 18, backgroundColor: colors.ink },
  face: { flex: 1, borderRadius: 18, overflow: "hidden", backfaceVisibility: "hidden" },
  card: { flex: 1, borderRadius: 18, padding: 20, justifyContent: "space-between", overflow: "hidden" },
  highlight: { position: "absolute", left: 0, right: 0, top: 0, height: "45%" },
  edge: { ...StyleSheet.absoluteFill, borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  photo: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: "rgba(255,255,255,0.35)" },
  initials: { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", alignItems: "center", justifyContent: "center" },
  initialsText: { fontFamily: fonts.semibold, fontSize: 19, color: colors.white, letterSpacing: 0.3 },
  modeTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },
  modeText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.white, letterSpacing: 0.2 },
  name: { fontFamily: fonts.bold, fontSize: 24, color: colors.white, letterSpacing: -0.6 },
  byline: { fontFamily: fonts.medium, fontSize: 14, color: "rgba(255,255,255,0.82)", marginTop: 2 },
  backTitle: { fontFamily: fonts.semibold, fontSize: 15, color: "rgba(255,255,255,0.9)", letterSpacing: -0.2 },
  line: { flexDirection: "row", alignItems: "center", gap: 10 },
  lineText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.white, flexShrink: 1 },
  brand: { fontFamily: fonts.semibold, fontSize: 11.5, color: "rgba(255,255,255,0.6)", letterSpacing: 0.5 },
});
