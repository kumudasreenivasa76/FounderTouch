import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { api } from "@/api";
import { openPage } from "@/actions";
import { Avatar, Banner, Button, Empty, Icon, ListRow, Pill, Screen, Segmented, Surface, Txt } from "@/components";
import { clockTime, eventDate } from "@/format";
import { useLoad } from "@/useLoad";
import { colors, fonts } from "@/theme";

type Filter = "all" | "in" | "waiting";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refreshing, refresh } = useLoad(() => api.event(id));
  const [filter, setFilter] = useState<Filter>("all");

  const attendees = data?.attendees ?? [];
  const inCount = attendees.filter((a) => a.checkedInAt).length;
  const shown = attendees.filter((a) => (filter === "all" ? true : filter === "in" ? !!a.checkedInAt : !a.checkedInAt));

  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <Screen edges={[]} refreshing={refreshing} onRefresh={refresh}>
        {error && !data ? <Banner tone="bad" text={error} /> : null}
        {data ? (
          <>
            <View style={{ marginTop: 4, marginBottom: 16 }}>
              <Txt v="title">{data.name}</Txt>
              <View style={s.meta}>
                <Icon n="calendar" size={14} color={colors.ink3} />
                <Txt v="small">{eventDate(data.startsAt)}</Txt>
              </View>
              {data.location ? (
                <View style={s.meta}>
                  <Icon n="pin" size={14} color={colors.ink3} />
                  <Txt v="small">{data.location}</Txt>
                </View>
              ) : null}
            </View>

            <View style={s.stats}>
              <Big n={attendees.length} of={data.capacity} label="registered" />
              <Big n={inCount} label="checked in" />
              <Big n={attendees.length - inCount} label="still to arrive" />
            </View>

            <Button title="Check in at the door" icon="scan" onPress={() => router.push({ pathname: "/event/[id]/checkin", params: { id, name: data.name } })} />
            <Button title="Open event page" icon="external" variant="ghost" small onPress={() => openPage(data.pageUrl)} style={{ marginTop: 6, marginBottom: 14, alignSelf: "center" }} />

            <Segmented
              options={[
                { key: "all", label: "All", count: attendees.length },
                { key: "in", label: "Checked in", count: inCount },
                { key: "waiting", label: "Waiting", count: attendees.length - inCount },
              ]}
              value={filter}
              onChange={setFilter}
            />

            {shown.length ? (
              <Surface padded={false} style={{ overflow: "hidden" }}>
                {shown.map((a, i) => (
                  <ListRow
                    key={a.id}
                    left={<Avatar name={a.name} size={36} />}
                    title={a.name}
                    subtitle={[a.company, a.email].filter(Boolean).join(" · ")}
                    last={i === shown.length - 1}
                    right={a.checkedInAt ? <Pill label={`In at ${clockTime(a.checkedInAt)}`} tone="good" /> : <Pill label="Waiting" />}
                  />
                ))}
              </Surface>
            ) : (
              <Empty icon="users" title={attendees.length ? "Nobody here yet" : "No one has registered yet"} text={attendees.length ? undefined : "Share the event page to get registrations."} />
            )}
          </>
        ) : loading ? null : null}
      </Screen>
    </>
  );
}

function Big({ n, of, label }: { n: number; of?: number | null; label: string }) {
  return (
    <View style={s.stat}>
      <Txt style={{ fontFamily: fonts.bold, fontSize: 22, letterSpacing: -0.5 }}>
        {n}
        {of ? <Txt style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.ink3 }}>{` / ${of}`}</Txt> : null}
      </Txt>
      <Txt v="small" style={{ fontSize: 12 }} numberOfLines={1}>{label}</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  meta: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 4 },
  stats: { flexDirection: "row", gap: 8, marginBottom: 14 },
  stat: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12 },
});
