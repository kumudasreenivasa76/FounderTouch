import path from "path";

type R = { id: string; url: string; filePath: string };

/** True when the site is reachable from the internet, which Office/Google viewers need. */
export const isPublicOrigin = (origin: string) => /^https:\/\//.test(origin) && !/localhost|127\.0\.0\.1|\.local\b/.test(origin);

/** A link that points straight at a video file (plays in a <video> tag). */
export const isDirectVideo = (url: string) => {
  try { return /\.(mp4|webm|mov|m4v|ogv)$/i.test(new URL(url).pathname); } catch { return false; }
};

/**
 * Returns an iframe-able URL for a deck/document, or null when it can only be opened or downloaded.
 * - Google Drive / Docs / Slides links  -> Google's preview player
 * - uploaded PDF                        -> the browser's built-in PDF viewer
 * - uploaded PPT/PPTX/DOC/DOCX          -> Microsoft Office viewer (needs a public https site)
 */
export function embedFor(r: R, origin: string): string | null {
  if (r.filePath) {
    const ext = path.extname(r.filePath).toLowerCase();
    if (ext === ".pdf") return `/files/${r.id}`;
    if ([".ppt", ".pptx", ".doc", ".docx"].includes(ext) && isPublicOrigin(origin))
      return "https://view.officeapps.live.com/op/embed.aspx?src=" + encodeURIComponent(`${origin}/files/${r.id}`);
    return null;
  }
  try {
    const u = new URL(r.url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
      const id = host === "youtu.be" ? u.pathname.slice(1) : u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id.split("/")[0]}` : null;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.match(/\/(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (host === "loom.com") {
      const id = u.pathname.match(/\/(?:share|embed)\/([\w]+)/)?.[1];
      return id ? `https://www.loom.com/embed/${id}` : null;
    }
    if (u.hostname === "drive.google.com") {
      const m = u.pathname.match(/\/file\/d\/([\w-]+)/) ?? (u.searchParams.get("id") ? [, u.searchParams.get("id")!] : null);
      return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null;
    }
    if (u.hostname === "docs.google.com") {
      const m = u.pathname.match(/^\/(presentation|document|spreadsheets)\/d\/([\w-]+)/);
      return m ? `https://docs.google.com/${m[1]}/d/${m[2]}/preview` : null;
    }
  } catch {}
  return null;
}
