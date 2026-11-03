import { requireOwner } from "@/lib/auth";
import Shell from "./shell";
import Tabs from "./tabs";
import OfflineSync from "@/components/offline-sync";
import { peekTap, saveTapCard } from "./tap-actions";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  await requireOwner();
  return (<><OfflineSync peek={peekTap} save={saveTapCard} /><Shell>{children}</Shell><Tabs /></>);
}
