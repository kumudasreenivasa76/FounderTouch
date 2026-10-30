import { embedFor, isDirectVideo } from "@/lib/embed";

export type ProjectView = { id: string; name: string; tagline: string; description: string; demoUrl: string; repoUrl: string; team: string; submitter?: string };

/** A hackathon project with its demo playing inline (YouTube, Vimeo, Loom, Drive, direct video) or a button. */
export default function ProjectCard({ p, origin, action }: { p: ProjectView; origin: string; action?: React.ReactNode }) {
  const direct = p.demoUrl && isDirectVideo(p.demoUrl);
  const embed = p.demoUrl && !direct ? embedFor({ id: p.id, url: p.demoUrl, filePath: "" }, origin) : null;
  const frame = { width: "100%", borderRadius: 12, margin: "8px 0", background: "#000" } as const;
  return (
    <div className="card">
      <b style={{ fontSize: 16 }}>{p.name}</b>
      {p.tagline && <div>{p.tagline}</div>}
      {direct && <video src={p.demoUrl} controls playsInline preload="metadata" style={frame} />}
      {embed && <iframe src={embed} title={p.name} loading="lazy" allowFullScreen allow="autoplay; fullscreen; picture-in-picture" style={{ ...frame, aspectRatio: "16 / 9", border: 0 }} />}
      {p.description && <p className="muted" style={{ whiteSpace: "pre-wrap", margin: "6px 0" }}>{p.description}</p>}
      {(p.team || p.submitter) && <div className="muted">👥 {p.team || p.submitter}</div>}
      <div className="row" style={{ marginTop: 8 }}>
        {p.demoUrl && !direct && !embed && <a className="btn ghost" href={p.demoUrl} target="_blank" rel="noopener noreferrer">▶ Open demo</a>}
        {p.repoUrl && <a className="btn ghost" href={p.repoUrl} target="_blank" rel="noopener noreferrer">⌘ Code</a>}
      </div>
      {action}
    </div>
  );
}
