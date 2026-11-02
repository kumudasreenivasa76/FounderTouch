import { requireOwner } from "@/lib/auth";
import Shell from "./shell";
import Tabs from "./tabs";
import { getSettings } from "@/lib/platform";
import I from "@/components/icon";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  await requireOwner();
  const { notice } = await getSettings();
  return (<>{notice && <div className="notice" role="status"><I n="alert" size={15} />{notice}</div>}<Shell>{children}</Shell><Tabs /></>);
}
