import { Fragment, isValidElement, type ReactNode } from "react";

/** Attributes React spells in camelCase but SVG spells with dashes. (Others, like stdDeviation and viewBox, keep their case.) */
const DASHED: Record<string, string> = {
  strokeWidth: "stroke-width", strokeLinecap: "stroke-linecap", strokeLinejoin: "stroke-linejoin", strokeOpacity: "stroke-opacity",
  stopColor: "stop-color", stopOpacity: "stop-opacity", fillOpacity: "fill-opacity",
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * Turns a tree of SVG React elements into a markup string, without react-dom/server (which Next.js blocks in app code).
 * Handles plain function components, fragments, arrays and intrinsic SVG tags: enough for the avatar.
 */
export function svgToString(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string") return esc(node);
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(svgToString).join("");
  if (!isValidElement(node)) return "";
  const { type, props } = node as { type: unknown; props: Record<string, unknown> };
  if (type === Fragment) return svgToString(props.children as ReactNode);
  if (typeof type === "function") return svgToString((type as (p: unknown) => ReactNode)(props));
  const tag = String(type);
  const attrs = Object.entries(props)
    .filter(([k, v]) => k !== "children" && k !== "style" && v !== undefined && v !== null && v !== false && typeof v !== "function")
    .map(([k, v]) => ` ${DASHED[k] ?? k}="${esc(String(v))}"`)
    .join("");
  const ns = tag === "svg" && !("xmlns" in props) ? ' xmlns="http://www.w3.org/2000/svg"' : "";
  const inner = svgToString(props.children as ReactNode);
  return inner ? `<${tag}${ns}${attrs}>${inner}</${tag}>` : `<${tag}${ns}${attrs}/>`;
}
