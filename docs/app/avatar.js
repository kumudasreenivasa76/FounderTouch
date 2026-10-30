/* The shaded 3D-style avatar, as an SVG string. */
"use strict";

var AV_OPTS = {
  face: ["Round", "Oval", "Square"], style: ["Short", "Long", "Bun", "Curly", "Bald", "Swoop", "Ponytail", "Buzz"],
  brows: ["Soft", "Bold", "Arched", "Flat"], mouth: ["Smile", "Grin", "Calm", "Open", "Smirk"], glasses: ["None", "Round", "Square", "Shades"],
  beard: ["None", "Stubble", "Moustache", "Beard"], accessory: ["None", "Headphones", "Earring", "Cap"], outfit: ["T-shirt", "Hoodie", "Blazer", "Turtleneck"],
  skin: ["#ffdfc4", "#f6c9a0", "#eab98a", "#d79f6e", "#b9784a", "#8d5524", "#6b3f20", "#4a2a15"],
  hair: ["#0f0f10", "#2b1b12", "#4a2f1e", "#7a4a26", "#c28a3d", "#e3c46d", "#b23a48", "#6c3fc2", "#2a8fbd", "#9aa0a6"],
  eyes: ["#3b2a1d", "#6b4423", "#5a7a3a", "#3b6fb5", "#5c6770", "#2f8f7f"],
  shirt: ["#3b5bdb", "#0ca678", "#e8590c", "#d6336c", "#212529", "#7048e8", "#f1b72a", "#868e96"],
  bg: ["#dbe4ff", "#ffe3e3", "#d3f9d8", "#fff3bf", "#e5dbff", "#c5f6fa", "#ffd8a8", "#dee2e6"]
};
var AV_DEFAULT = { bg: "#dbe4ff", skin: "#eab98a", face: 0, hair: "#2b1b12", style: 0, eyes: "#3b2a1d", brows: 0, mouth: 0, glasses: 0, beard: 0, accessory: 0, outfit: 0, shirt: "#3b5bdb" };

function avatarSvg(c, size, view) {
  c = Object.assign({}, AV_DEFAULT, c || {}); view = view || [0, 0, 200];
  var id = "av" + Math.abs(JSON.stringify(c).split("").reduce(function (h, ch) { return (h * 31 + ch.charCodeAt(0)) | 0; }, 7)).toString(36) + size;
  var u = function (n) { return "url(#" + id + n + ")"; };
  var skin = c.skin, hair = c.hair, shirt = c.shirt, st = c.style;
  var skinHi = shade(skin, .24), skinLo = shade(skin, -.2), skinDeep = shade(skin, -.4), ink = "#8a3b32";
  var o = "";
  // back hair
  if (st === 1) o += '<path d="M46 92 Q38 36 100 30 Q162 36 154 92 L162 176 Q100 190 38 176Z" fill="' + u("hair") + '"/>';
  if (st === 6) o += '<path d="M138 58 Q184 66 176 124 Q172 158 148 168 Q164 126 134 86Z" fill="' + u("hair") + '"/>';
  if (st === 3) [[44, 82], [156, 82], [52, 58], [148, 58]].forEach(function (p) { o += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="17" fill="' + u("hair") + '"/>'; });
  if (st === 2) o += '<circle cx="100" cy="26" r="17" fill="' + u("hair") + '"/>';
  // outfit and neck
  if (c.outfit === 1) o += '<path d="M40 176 Q38 128 100 124 Q162 128 160 176Z" fill="' + shade(shirt, -.3) + '"/>';
  o += '<path d="M12 200 Q14 158 58 150 L100 164 L142 150 Q186 158 188 200Z" fill="' + u("shirt") + '"/><rect x="86" y="122" width="28" height="44" rx="13" fill="' + u("neck") + '"/>';
  if (c.outfit === 0) o += '<path d="M76 152 Q100 176 124 152" stroke="' + shade(shirt, -.3) + '" stroke-width="4.5" fill="none" stroke-linecap="round"/>';
  if (c.outfit === 1) o += '<path d="M70 154 Q100 180 130 154" stroke="' + shade(shirt, -.3) + '" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M92 168 V190 M108 168 V190" stroke="#fff" stroke-width="2.8" stroke-linecap="round" opacity=".85"/>';
  if (c.outfit === 2) o += '<path d="M78 152 L100 194 L122 152 L100 166Z" fill="#f6f6f6"/><path d="M70 152 L100 200 L82 200 L52 164Z" fill="' + shade(shirt, .12) + '"/><path d="M130 152 L100 200 L118 200 L148 164Z" fill="' + shade(shirt, .12) + '"/>';
  if (c.outfit === 3) o += '<path d="M80 126 Q100 138 120 126 L122 156 Q100 166 78 156Z" fill="' + u("shirt") + '" stroke="' + shade(shirt, -.25) + '" stroke-width="1.5"/>';
  o += '<ellipse cx="100" cy="146" rx="34" ry="10" fill="' + skinDeep + '" opacity=".45" filter="url(#' + id + 'blur)"/>';
  // ears and head
  o += '<ellipse cx="53" cy="100" rx="8" ry="12" fill="' + u("skin") + '"/><ellipse cx="147" cy="100" rx="8" ry="12" fill="' + u("skin") + '"/>';
  var head = function (extra) { return c.face === 0 ? '<ellipse cx="100" cy="94" rx="48" ry="50" ' + extra + "/>" : c.face === 1 ? '<ellipse cx="100" cy="95" rx="44" ry="54" ' + extra + "/>" : '<rect x="53" y="42" width="94" height="104" rx="38" ' + extra + "/>"; };
  o += head('fill="' + u("skin") + '"') + head('fill="none" stroke="' + skinLo + '" stroke-width="1.4" opacity=".35"');
  o += '<circle cx="70" cy="113" r="12" fill="#ff6f7a" opacity=".22" filter="url(#' + id + 'blur)"/><circle cx="130" cy="113" r="12" fill="#ff6f7a" opacity=".22" filter="url(#' + id + 'blur)"/>';
  o += '<ellipse cx="86" cy="62" rx="15" ry="7" fill="#fff" opacity=".13" transform="rotate(-20 86 62)"/><ellipse cx="100" cy="113" rx="5.5" ry="3.6" fill="' + skinLo + '" opacity=".55"/><circle cx="98.5" cy="104" r="3" fill="#fff" opacity=".2"/>';
  // beard
  if (c.beard === 1) o += '<path d="M55 100 Q54 140 100 152 Q146 140 145 100 Q140 128 100 132 Q60 128 55 100Z" fill="' + shade(hair, -.1) + '" opacity=".3"/>';
  if (c.beard === 2) o += '<path d="M82 120 Q92 113 100 117 Q108 113 118 120 Q110 124 100 122 Q90 124 82 120Z" fill="' + u("hair") + '"/>';
  if (c.beard === 3) o += '<path d="M53 98 Q48 146 100 158 Q152 146 147 98 Q140 120 100 118 Q60 120 53 98Z" fill="' + u("hair") + '"/><path d="M82 121 Q92 114 100 118 Q108 114 118 121 Q110 125 100 123 Q90 125 82 121Z" fill="' + shade(hair, -.15) + '"/>';
  // eyes
  [80, 120].forEach(function (x) {
    o += '<ellipse cx="' + x + '" cy="97" rx="9.5" ry="8.8" fill="#fbfbfb"/><ellipse cx="' + x + '" cy="94" rx="9.5" ry="5" fill="#000" opacity=".08"/><circle cx="' + (x + .4) + '" cy="97.6" r="5.8" fill="' + u("iris") + '"/><circle cx="' + (x + .4) + '" cy="97.6" r="2.7" fill="#0c0c0c"/><circle cx="' + (x - 1.8) + '" cy="95" r="1.9" fill="#fff"/><circle cx="' + (x + 2.4) + '" cy="99.6" r=".9" fill="#fff" opacity=".8"/><path d="M' + (x - 10) + ' 95 Q' + x + ' 88 ' + (x + 10) + ' 95" stroke="#2b1d16" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
  });
  // brows
  [[-1, 80], [1, 120]].forEach(function (p) {
    var d = p[0], x = p[1];
    var paths = ["M" + (x - 12 * d) + " 83 Q" + x + " 76 " + (x + 11 * d) + " 82", "M" + (x - 12 * d) + " 84 Q" + x + " 77 " + (x + 11 * d) + " 82", "M" + (x - 12 * d) + " 85 Q" + (x - 2 * d) + " 72 " + (x + 11 * d) + " 81", "M" + (x - 12 * d) + " 80 L" + (x + 11 * d) + " 80"];
    o += '<path d="' + paths[c.brows] + '" stroke="' + shade(hair, -.2) + '" stroke-width="' + (c.brows === 1 ? 5 : 3.4) + '" fill="none" stroke-linecap="round"/>';
  });
  // mouth
  o += [
    '<path d="M86 125 Q100 138 114 125" stroke="' + ink + '" stroke-width="3" fill="none" stroke-linecap="round"/>',
    '<path d="M84 122 Q100 144 116 122 Q100 127 84 122Z" fill="#fff" stroke="' + ink + '" stroke-width="2" stroke-linejoin="round"/>',
    '<path d="M91 128 H109" stroke="' + ink + '" stroke-width="3" fill="none" stroke-linecap="round"/>',
    '<path d="M88 122 Q100 148 112 122 Q100 126 88 122Z" fill="#6d2323"/><ellipse cx="100" cy="134" rx="5.5" ry="3.2" fill="#e8707a"/>',
    '<path d="M88 128 Q101 133 114 122" stroke="' + ink + '" stroke-width="3" fill="none" stroke-linecap="round"/>'][c.mouth];
  // front hair
  var HF = [
    '<path d="M49 94 Q42 38 100 33 Q158 38 151 94 Q148 64 128 56 Q100 46 72 56 Q52 64 49 94Z" fill="' + u("hair") + '"/>',
    '<path d="M51 90 Q46 40 100 36 Q154 40 149 90 Q142 62 118 58 Q92 72 74 58 Q56 66 51 90Z" fill="' + u("hair") + '"/><path d="M50 88 Q40 128 50 168 Q64 144 60 96Z" fill="' + u("hair") + '"/><path d="M150 88 Q160 128 150 168 Q136 144 140 96Z" fill="' + u("hair") + '"/>',
    '<path d="M49 94 Q42 40 100 35 Q158 40 151 94 Q148 64 128 57 Q100 48 72 57 Q52 64 49 94Z" fill="' + u("hair") + '"/>',
    [[70, 48], [100, 40], [130, 48], [58, 68], [142, 68], [84, 36], [116, 36]].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="19" fill="' + u("hair") + '"/>'; }).join(""),
    "",
    '<path d="M49 94 Q38 34 108 31 Q164 36 151 94 Q150 66 134 56 Q104 76 62 70 Q52 76 49 94Z" fill="' + u("hair") + '"/>',
    '<path d="M49 94 Q42 38 100 33 Q158 38 151 94 Q148 64 128 56 Q100 46 72 56 Q52 64 49 94Z" fill="' + u("hair") + '"/>',
    '<path d="M51 92 Q46 46 100 42 Q154 46 149 92 Q146 64 100 58 Q54 64 51 92Z" fill="' + u("hair") + '" opacity=".9"/>'][st];
  o += HF + (st !== 4 ? '<ellipse cx="84" cy="50" rx="22" ry="6.5" fill="#fff" opacity=".2" transform="rotate(-16 84 50)"/>' : "");
  // glasses
  var fr = "#262a33";
  if (c.glasses === 1) o += '<g fill="#fff" fill-opacity=".14" stroke="' + fr + '" stroke-width="2.6"><circle cx="80" cy="97" r="14"/><circle cx="120" cy="97" r="14"/><path d="M94 96 Q100 92 106 96" fill="none"/><path d="M66 95 L55 92 M134 95 L145 92" fill="none"/></g>';
  if (c.glasses === 2) o += '<g fill="#fff" fill-opacity=".14" stroke="' + fr + '" stroke-width="2.6" stroke-linejoin="round"><rect x="64" y="86" width="31" height="22" rx="7"/><rect x="105" y="86" width="31" height="22" rx="7"/><path d="M95 94 H105" fill="none"/><path d="M64 92 L54 90 M136 92 L146 90" fill="none"/></g>';
  if (c.glasses === 3) o += '<g stroke-linejoin="round"><rect x="62" y="85" width="34" height="23" rx="8" fill="' + u("lens") + '" stroke="' + fr + '" stroke-width="2.6"/><rect x="104" y="85" width="34" height="23" rx="8" fill="' + u("lens") + '" stroke="' + fr + '" stroke-width="2.6"/><path d="M96 92 H104" stroke="' + fr + '" stroke-width="2.6"/><path d="M62 91 L52 89 M138 91 L148 89" stroke="' + fr + '" stroke-width="2.6"/><path d="M68 90 L78 90 M110 90 L120 90" stroke="#fff" stroke-width="2" opacity=".35" stroke-linecap="round"/></g>';
  // accessory
  if (c.accessory === 1) o += '<g><path d="M50 96 Q48 28 100 28 Q152 28 150 96" stroke="#2b2f3a" stroke-width="7" fill="none" stroke-linecap="round"/><rect x="38" y="84" width="19" height="32" rx="9" fill="' + u("cup") + '"/><rect x="143" y="84" width="19" height="32" rx="9" fill="' + u("cup") + '"/><rect x="44" y="92" width="7" height="16" rx="3.5" fill="' + shirt + '"/><rect x="149" y="92" width="7" height="16" rx="3.5" fill="' + shirt + '"/></g>';
  if (c.accessory === 2) o += '<circle cx="53" cy="116" r="3.6" fill="#f1b72a" stroke="#b8871a" stroke-width=".8"/><circle cx="52" cy="115" r="1.1" fill="#fff" opacity=".8"/>';
  if (c.accessory === 3) o += '<path d="M46 74 Q46 22 100 20 Q154 22 154 74 Q100 62 46 74Z" fill="' + u("shirt") + '"/><path d="M56 66 Q100 80 160 66 Q150 78 102 78 Q70 76 56 66Z" fill="' + shade(shirt, -.3) + '"/><circle cx="100" cy="21" r="4.5" fill="' + shade(shirt, -.2) + '"/><ellipse cx="80" cy="38" rx="18" ry="5.5" fill="#fff" opacity=".2" transform="rotate(-14 80 38)"/>';

  var defs = '<defs>' +
    '<linearGradient id="' + id + 'bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + shade(c.bg, .4) + '"/><stop offset=".6" stop-color="' + c.bg + '"/><stop offset="1" stop-color="' + shade(c.bg, -.12) + '"/></linearGradient>' +
    '<radialGradient id="' + id + 'skin" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="' + skinHi + '"/><stop offset=".5" stop-color="' + skin + '"/><stop offset="1" stop-color="' + skinLo + '"/></radialGradient>' +
    '<linearGradient id="' + id + 'neck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + skinDeep + '"/><stop offset=".35" stop-color="' + skinLo + '"/><stop offset="1" stop-color="' + skin + '"/></linearGradient>' +
    '<linearGradient id="' + id + 'hair" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="' + shade(hair, .3) + '"/><stop offset=".45" stop-color="' + hair + '"/><stop offset="1" stop-color="' + shade(hair, -.3) + '"/></linearGradient>' +
    '<linearGradient id="' + id + 'shirt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + shade(shirt, .22) + '"/><stop offset=".5" stop-color="' + shirt + '"/><stop offset="1" stop-color="' + shade(shirt, -.28) + '"/></linearGradient>' +
    '<radialGradient id="' + id + 'iris" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="' + shade(c.eyes, .45) + '"/><stop offset=".6" stop-color="' + c.eyes + '"/><stop offset="1" stop-color="' + shade(c.eyes, -.45) + '"/></radialGradient>' +
    '<linearGradient id="' + id + 'lens" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3f4b"/><stop offset="1" stop-color="#0f1115"/></linearGradient>' +
    '<linearGradient id="' + id + 'cup" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a4f5c"/><stop offset="1" stop-color="#1d2028"/></linearGradient>' +
    '<radialGradient id="' + id + 'glow" cx=".25" cy=".2" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="' + id + 'vig" cx=".5" cy=".5" r=".72"><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></radialGradient>' +
    '<filter id="' + id + 'blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter></defs>';
  return '<svg width="' + size + '" height="' + size + '" viewBox="' + view.join(" ") + " " + view[2] + '" role="img" aria-label="avatar" style="border-radius:50%;display:block">' + defs +
    '<rect width="200" height="200" fill="' + u("bg") + '"/><rect width="200" height="200" fill="' + u("glow") + '"/>' + o + '<rect width="200" height="200" fill="' + u("vig") + '"/></svg>';
}
