import BackLink from "@/components/back-link";

/** Screen header: back button and title on one row, then an optional line of help and a saved / error banner. */
export default function PageHead({ title, sub, back = "/app", saved, error }: { title: string; sub?: string; back?: string; saved?: boolean; error?: string }) {
  return (
    <>
      <div className="tn-top">
        <BackLink href={back} />
        <h1>{title}</h1>
      </div>
      {sub && <p className="muted tn-sub">{sub}</p>}
      {saved && <div className="ok">Saved</div>}
      {error && <div className="err">{error}</div>}
    </>
  );
}
