"use client";
import { useState } from "react";
import { AvatarArt } from "@/components/avatar";
import { AVATAR_OPTS, AVATAR_PRESETS, AvatarCfg } from "@/lib/look";

type View = [number, number, number];
const VIEWS: Record<string, View> = {
  face: [42, 34, 116], hair: [26, 8, 148], eyes: [58, 66, 84], mouth: [66, 94, 68], glasses: [54, 68, 92],
  beard: [48, 82, 104], accessory: [26, 8, 148], outfit: [0, 56, 200], full: [0, 0, 200],
};

const TABS = ["Looks", "Face", "Hair", "Eyes & mouth", "Extras", "Outfit", "Background"] as const;

/** Row of thumbnails: each one is the avatar wearing that option, so you can see what you pick. */
function Thumbs({ title, names, current, make, view, onPick }: { title: string; names: string[]; current: number; make: (i: number) => AvatarCfg; view: View; onPick: (i: number) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label className="f" style={{ marginTop: 0 }}>{title}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
        {names.map((n, i) => (
          <button key={n} type="button" onClick={() => onPick(i)} aria-pressed={current === i} aria-label={n}
            style={{ width: 64, padding: 4, background: "#fff", borderRadius: 16, border: current === i ? "2px solid #3b5bdb" : "2px solid #e3e6ec", boxShadow: current === i ? "0 0 0 3px rgba(59,91,219,.15)" : "none" }}>
            <AvatarArt cfg={make(i)} size={52} view={view} />
            <div style={{ fontSize: 10.5, marginTop: 2, color: current === i ? "#3b5bdb" : "#6b7587", fontWeight: current === i ? 600 : 400 }}>{n}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Swatches({ title, values, current, onPick }: { title: string; values: string[]; current: string; onPick: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label className="f" style={{ marginTop: 0 }}>{title}</label>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 5 }}>
        {values.map((v) => (
          <button key={v} type="button" aria-label={v} onClick={() => onPick(v)}
            style={{ width: 34, height: 34, padding: 0, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, ${v}, ${v} 60%, rgba(0,0,0,.25))`, border: current === v ? "3px solid #3b5bdb" : "2px solid #fff", boxShadow: "0 0 0 1px #cfd4dd" }} />
        ))}
      </div>
    </div>
  );
}

export default function Editor({ initial, save }: { initial: AvatarCfg; save: (fd: FormData) => void }) {
  const [c, setC] = useState<AvatarCfg>(initial);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Looks");
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const set = <K extends keyof AvatarCfg>(k: K, v: AvatarCfg[K]) => setC((p) => ({ ...p, [k]: v }));
  const with_ = <K extends keyof AvatarCfg>(k: K) => (i: number) => ({ ...c, [k]: i }) as AvatarCfg;

  const random = () => {
    const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
    const n = (len: number) => Math.floor(Math.random() * len);
    setC({
      bg: pick(AVATAR_OPTS.bg), skin: pick(AVATAR_OPTS.skin), face: n(3), hair: pick(AVATAR_OPTS.hair), style: n(8), eyes: pick(AVATAR_OPTS.eyes), brows: n(4), mouth: n(5),
      glasses: Math.random() < 0.35 ? 1 + n(3) : 0, beard: Math.random() < 0.3 ? 1 + n(3) : 0, accessory: Math.random() < 0.3 ? 1 + n(3) : 0, outfit: n(4), shirt: pick(AVATAR_OPTS.shirt),
    });
  };

  return (
    <form action={save}>
      <input type="hidden" name="cfg" value={JSON.stringify(c)} />

      {/* Live preview that tilts toward your finger or pointer */}
      <div
        style={{ display: "flex", justifyContent: "center", margin: "6px 0 10px", perspective: 700 }}
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 22, y: -((e.clientY - r.top) / r.height - 0.5) * 18 }); }}
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      >
        <div className="float3d" style={{ transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`, transition: "transform .15s ease-out" }}>
          <div className="avatar" style={{ width: 150, height: 150, padding: 0, overflow: "hidden", boxShadow: "0 18px 30px rgba(17,24,39,.28), 0 2px 0 rgba(255,255,255,.6) inset" }}>
            <AvatarArt cfg={c} size={144} />
          </div>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 8 }}>
        <button type="button" className="ghost" onClick={random}>🎲 Surprise me</button>
        <button>Save avatar</button>
      </div>

      <div className="swiper-tabs" style={{ margin: "0 -4px 10px", borderRadius: 14, border: "1px solid #e3e6ec" }}>
        {TABS.map((t) => <button key={t} type="button" className={t === tab ? "on" : ""} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        {tab === "Looks" && (
          <>
            <label className="f" style={{ marginTop: 0 }}>Start from a look, then tweak it</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
              {AVATAR_PRESETS.map((p, i) => (
                <button key={i} type="button" onClick={() => setC(p)} aria-label={`Look ${i + 1}`} style={{ width: 66, height: 66, padding: 3, borderRadius: "50%", background: "#fff", border: "2px solid #e3e6ec" }}>
                  <AvatarArt cfg={p} size={56} />
                </button>
              ))}
            </div>
          </>
        )}
        {tab === "Face" && (
          <>
            <Thumbs title="Face shape" names={AVATAR_OPTS.face} current={c.face} make={with_("face")} view={VIEWS.face} onPick={(i) => set("face", i)} />
            <Swatches title="Skin tone" values={AVATAR_OPTS.skin} current={c.skin} onPick={(v) => set("skin", v)} />
          </>
        )}
        {tab === "Hair" && (
          <>
            <Thumbs title="Style" names={AVATAR_OPTS.style} current={c.style} make={with_("style")} view={VIEWS.hair} onPick={(i) => set("style", i)} />
            <Swatches title="Colour" values={AVATAR_OPTS.hair} current={c.hair} onPick={(v) => set("hair", v)} />
          </>
        )}
        {tab === "Eyes & mouth" && (
          <>
            <Thumbs title="Eyebrows" names={AVATAR_OPTS.brows} current={c.brows} make={with_("brows")} view={VIEWS.eyes} onPick={(i) => set("brows", i)} />
            <Thumbs title="Mouth" names={AVATAR_OPTS.mouth} current={c.mouth} make={with_("mouth")} view={VIEWS.mouth} onPick={(i) => set("mouth", i)} />
            <Swatches title="Eye colour" values={AVATAR_OPTS.eyes} current={c.eyes} onPick={(v) => set("eyes", v)} />
          </>
        )}
        {tab === "Extras" && (
          <>
            <Thumbs title="Glasses" names={AVATAR_OPTS.glasses} current={c.glasses} make={with_("glasses")} view={VIEWS.glasses} onPick={(i) => set("glasses", i)} />
            <Thumbs title="Facial hair" names={AVATAR_OPTS.beard} current={c.beard} make={with_("beard")} view={VIEWS.beard} onPick={(i) => set("beard", i)} />
            <Thumbs title="Accessory" names={AVATAR_OPTS.accessory} current={c.accessory} make={with_("accessory")} view={VIEWS.accessory} onPick={(i) => set("accessory", i)} />
          </>
        )}
        {tab === "Outfit" && (
          <>
            <Thumbs title="Outfit" names={AVATAR_OPTS.outfit} current={c.outfit} make={with_("outfit")} view={VIEWS.outfit} onPick={(i) => set("outfit", i)} />
            <Swatches title="Colour" values={AVATAR_OPTS.shirt} current={c.shirt} onPick={(v) => set("shirt", v)} />
          </>
        )}
        {tab === "Background" && <Swatches title="Background colour" values={AVATAR_OPTS.bg} current={c.bg} onPick={(v) => set("bg", v)} />}
      </div>
    </form>
  );
}
