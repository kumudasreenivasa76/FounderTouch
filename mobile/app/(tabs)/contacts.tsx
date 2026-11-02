import { useState } from "react";
import { StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { api, errorMessage, type Applicant, type AppStatus, type AccessRequest, type Contacts } from "@/api";
import { email, openPage } from "@/actions";
import { Avatar, Banner, Button, Empty, Icon, IconButton, ListRow, OptionSheet, Pill, Screen, Segmented, Surface, Txt, type Tone } from "@/components";
import { timeAgo } from "@/format";
import { useLoad } from "@/useLoad";
import { colors } from "@/theme";

type Tab = "people" | "requests" | "applicants";

const STAGES: { status: AppStatus; label: string; tone: Tone }[] = [
  { status: "NEW", label: "New", tone: "accent" },
  { status: "SHORTLISTED", label: "Shortlisted", tone: "neutral" },
  { status: "INTERVIEW", label: "Interview", tone: "warn" },
  { status: "OFFER", label: "Offer", tone: "good" },
  { status: "REJECTED", label: "Rejected", tone: "bad" },
];
const toneOf = (s: AppStatus) => STAGES.find((x) => x.status === s)?.tone ?? "neutral";

export default function ContactsScreen() {
  const [tab, setTab] = useState<Tab>("people");
  const { data, setData, error, loading, refreshing, refresh, reload } = useLoad(() => api.contacts());
  const [actionError, setActionError] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [picking, setPicking] = useState<Applicant | null>(null);

  const people = data?.people ?? [];
  const requests = data?.requests ?? [];
  const applicants = data?.applicants ?? [];

  const decide = async (r: AccessRequest, status: "APPROVED" | "DECLINED") => {
    setDeciding(r.id + status);
    setActionError(null);
    try {
      await api.decide(r.id, r.kind, status);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setData((d: Contacts | null) => (d ? { ...d, requests: d.requests.filter((x) => x.id !== r.id) } : d));
      void reload();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setDeciding(null);
    }
  };

  const setStage = async (a: Applicant, status: AppStatus) => {
    if (a.status === status) return;
    const prev = data;
    const label = STAGES.find((x) => x.status === status)?.label ?? status;
    setData((d: Contacts | null) => (d ? { ...d, applicants: d.applicants.map((x) => (x.id === a.id ? { ...x, status, statusLabel: label } : x)) } : d));
    setActionError(null);
    try {
      await api.setApplicationStatus(a.id, status);
      void Haptics.selectionAsync().catch(() => {});
    } catch (e) {
      setData(prev);
      setActionError(errorMessage(e));
    }
  };

  return (
    <Screen title="Contacts" refreshing={refreshing} onRefresh={refresh}>
      <Segmented
        options={[
          { key: "people", label: "People", count: people.length },
          { key: "requests", label: "Requests", count: requests.length },
          { key: "applicants", label: "Applicants", count: applicants.length },
        ]}
        value={tab}
        onChange={setTab}
      />
      {error && !data ? <Banner tone="bad" text={error} /> : null}
      {actionError ? <Banner tone="bad" text={actionError} /> : null}

      {loading && !data ? null : tab === "people" ? (
        people.length ? (
          <Surface padded={false} style={{ overflow: "hidden" }}>
            {people.map((p, i) => (
              <ListRow
                key={p.id}
                left={<Avatar name={p.name} />}
                title={p.name}
                subtitle={[p.company, p.email].filter(Boolean).join(" · ")}
                meta={`Via ${p.via} · ${timeAgo(p.at)}`}
                last={i === people.length - 1}
                right={
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {p.linkedin ? <IconButton icon="link" label={`LinkedIn for ${p.name}`} onPress={() => openPage(p.linkedin)} /> : null}
                    {p.email ? <IconButton icon="mail" label={`Email ${p.name}`} onPress={() => email(p.email)} /> : null}
                  </View>
                }
              />
            ))}
          </Surface>
        ) : (
          <Empty icon="users" title="No contacts yet" text="When someone shares their details from your page, they show up here." />
        )
      ) : tab === "requests" ? (
        requests.length ? (
          requests.map((r) => (
            <Surface key={r.id}>
              <View style={s.reqHead}>
                <Avatar name={r.name} size={38} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt v="bodyMedium" numberOfLines={1}>{r.name}</Txt>
                  <Txt v="small" numberOfLines={1}>{r.email}</Txt>
                </View>
                <Txt v="small" style={{ fontSize: 12 }}>{timeAgo(r.at)}</Txt>
              </View>
              <View style={s.what}>
                <Icon n={r.kind === "deck" ? "file" : "lock"} size={15} color={colors.ink2} />
                <Txt style={{ color: colors.ink2, fontSize: 14, flex: 1 }}>Wants to see your {r.what}</Txt>
              </View>
              {r.note ? <Txt style={s.note}>{r.note}</Txt> : null}
              <View style={s.reqActions}>
                <Button title="Approve" icon="check" small onPress={() => decide(r, "APPROVED")} loading={deciding === r.id + "APPROVED"} disabled={!!deciding} style={{ flex: 1 }} />
                <Button title="Decline" variant="secondary" small onPress={() => decide(r, "DECLINED")} loading={deciding === r.id + "DECLINED"} disabled={!!deciding} style={{ flex: 1 }} />
                <IconButton icon="mail" label={`Email ${r.name}`} onPress={() => email(r.email)} />
              </View>
            </Surface>
          ))
        ) : (
          <Empty icon="lock" title="No requests waiting" text="Requests to see a locked page or your deck will appear here for you to approve." />
        )
      ) : applicants.length ? (
        <>
          <Surface padded={false} style={{ overflow: "hidden" }}>
            {applicants.map((a, i) => (
              <ListRow
                key={a.id}
                left={<Avatar name={a.name} />}
                title={a.name}
                subtitle={a.job}
                meta={timeAgo(a.at)}
                onPress={() => setPicking(a)}
                last={i === applicants.length - 1}
                right={<Pill label={a.statusLabel} tone={toneOf(a.status)} />}
              />
            ))}
          </Surface>
          <Txt v="small" style={{ textAlign: "center", fontSize: 12.5 }}>Tap someone to move them to another stage.</Txt>
        </>
      ) : (
        <Empty icon="briefcase" title="No applicants yet" text="Applications to your open roles land here." />
      )}

      <OptionSheet
        visible={!!picking}
        onClose={() => setPicking(null)}
        title={picking ? `${picking.name}, ${picking.job}` : undefined}
        options={
          picking
            ? [
                ...STAGES.map((st) => ({ label: st.label, selected: st.status === picking.status, onPress: () => setStage(picking, st.status) })),
                { label: `Email ${picking.name.split(" ")[0]}`, icon: "mail", onPress: () => email(picking.email, `Your application: ${picking.job}`) },
              ]
            : []
        }
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  reqHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  what: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  note: { marginTop: 8, fontSize: 14, color: colors.ink2, backgroundColor: colors.sunken, padding: 10, borderRadius: 10, overflow: "hidden" },
  reqActions: { flexDirection: "row", gap: 8, marginTop: 14 },
});
