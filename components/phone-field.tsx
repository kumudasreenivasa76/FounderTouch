"use client";
import { useState } from "react";

const CODES: [string, string][] = [
  ["+91", "India"], ["+1", "US / Canada"], ["+44", "UK"], ["+971", "UAE"],
  ["+65", "Singapore"], ["+61", "Australia"], ["+49", "Germany"], ["+33", "France"],
  ["+81", "Japan"], ["+86", "China"], ["+966", "Saudi Arabia"], ["+974", "Qatar"],
  ["+973", "Bahrain"], ["+968", "Oman"], ["+94", "Sri Lanka"], ["+977", "Nepal"],
  ["+880", "Bangladesh"], ["+60", "Malaysia"], ["+62", "Indonesia"], ["+63", "Philippines"],
  ["+82", "South Korea"], ["+31", "Netherlands"], ["+41", "Switzerland"], ["+46", "Sweden"],
  ["+39", "Italy"], ["+34", "Spain"], ["+55", "Brazil"], ["+27", "South Africa"],
  ["+234", "Nigeria"], ["+254", "Kenya"], ["+64", "New Zealand"], ["+7", "Russia / Kazakhstan"],
];

/** Phone input with a country-code picker; submits one value like "+91 98765 43210". */
export default function PhoneField({ name = "phone", defaultValue = "", id }: { name?: string; defaultValue?: string; id?: string }) {
  const v = (defaultValue || "").trim();
  const hit = [...CODES].sort((a, b) => b[0].length - a[0].length).find(([c]) => v.startsWith(c));
  const [code, setCode] = useState(hit ? hit[0] : "+91");
  const [num, setNum] = useState(hit ? v.slice(hit[0].length).trim() : v);
  const n = num.trim();
  const full = n ? (n.startsWith("+") ? n : `${code} ${n}`) : "";
  return (
    <div className="phone-row">
      <select aria-label="Country code" value={code} onChange={(e) => setCode(e.target.value)}>
        {CODES.map(([c, country]) => <option key={c} value={c}>{c} {country}</option>)}
      </select>
      <input id={id} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="98765 43210" value={num} onChange={(e) => setNum(e.target.value)} />
      <input type="hidden" name={name} value={full} />
    </div>
  );
}
