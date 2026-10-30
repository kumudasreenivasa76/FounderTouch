import { requireOwner } from "@/lib/auth";
import Shell from "./shell";
import Tabs from "./tabs";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  await requireOwner();
  return (<><Shell>{children}</Shell><Tabs /></>);
}
