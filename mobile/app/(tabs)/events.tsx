import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/api";
import { Banner, Empty, Icon, Pill, Screen, Txt } from "@/components";
import { dateParts, eventDate } from "@/format";
import { useLoad } from "@/useLoad";
import { colors, fonts, radius, shadows } from "@/theme";

export default function EventsScreen() {
  const { data, error, loading, refreshing, refresh } = useLoad(() => api.events());
  const events = data?.events ?? [];
  const upcoming = events.filter((e) => new Date(e.endsAt ?? e.startsAt).getTime() >= Date.now() - 6 * 3600000);
  const past = events.filter((e) => !upcoming.includes(e));

  return (
    <Screen title="Events" subtitle="Run the door from your phone." refreshing={refreshing} onRefresh={refresh}>
      {error && !data ? <Banner tone="bad" text={error} /> : null}
      {!loading && !events.length && !error ? (
        <Empty icon="calendar" title="No events yet" text="Create an event on the web and it shows up here, ready for check in." />
      ) : null}

      {[...upcoming, ...past].map((e, i) => {
        const d = dateParts(e.startsAt);
        const isPast = i >= upcoming.length;
        return (
          <Pressable
            key={e.id}
            onPress={() => router.push({ pathname: "/event/[id]", params: { id: e.id, name: e.name } })}
            style={({ pressed }) => [s.card, shadows.card, pressed && { transform: [{ scale: 0.99 }] }, isPast && { opacity: 0.72 }]}
          >
            <LinearGradient colors={[e.color, e.color2 || e.color]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.band}>
              <View style={s.date}>
                <Txt style={s.month}>{d.month}</Txt>
                <Txt style={s.day}>{d.day}</Txt>
              </View>
              <View style={{ flex: 1 }} />
              {isPast ? <Pill label="Past" tone="ink" /> : e.open ? null : <Pill label="Registration closed" tone="ink" />}
            </LinearGradient>
            <View style={s.body}>
              <Txt v="heading" numberOfLines={2}>{e.name}</Txt>
              <View style={s.meta}>
                <Icon n="calendar" size={14} color={colors.ink3} />
                <Txt v="small">{eventDate(e.startsAt)}</Txt>
              </View>
              {e.location ? (
                <View style={s.meta}>
                  <Icon n="pin" size={14} color={colors.ink3} />
                  <Txt v="small" numberOfLines={1} style={{ flex: 1 }}>{e.location}</Txt>
                </View>
              ) : null}
              <View style={s.counts}>
                <Count n={e.registered} label={e.capacity ? `of ${e.capacity} registered` : "registered"} />
                <Count n={e.checkedIn} label="checked in" />
                <View style={{ flex: 1 }} />
                <Icon n="chevron-right" size={18} color={colors.ink3} />
              </View>
            </View>
          </Pressable>
        );
      })}
    </Screen>
  );
}

function Count({ n, label }: { n: number; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5 }}>
      <Txt style={{ fontFamily: fonts.bold, fontSize: 17, letterSpacing: -0.3 }}>{n}</Txt>
      <Txt v="small" style={{ fontSize: 12.5 }}>{label}</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, marginBottom: 14, overflow: "hidden" },
  band: { height: 78, flexDirection: "row", alignItems: "flex-start", padding: 12 },
  date: { backgroundColor: "rgba(255,255,255,0.94)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, alignItems: "center", minWidth: 48 },
  month: { fontFamily: fonts.semibold, fontSize: 10.5, letterSpacing: 0.8, color: colors.bad },
  day: { fontFamily: fonts.bold, fontSize: 20, letterSpacing: -0.5, color: colors.ink, lineHeight: 24 },
  body: { padding: 14, gap: 5 },
  meta: { flexDirection: "row", alignItems: "center", gap: 7 },
  counts: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: colors.line },
});
