import type { Persona } from "./mocks";

/** Sample people for the product previews. Fictional, and the fields mirror what each real mode asks for. */
export const PERSONAS: Persona[] = [
  {
    name: "Maya Iyer", role: "Founder, Northwind Robotics", face: "1581065178047-8ee15951ede6", theme: ["#2a4fc9", "#1c3796"],
    mode: "Founder", icon: "flag", cta: "Let's connect",
    facts: [["Stage", "Seed"], ["Traction", "14 plants live"], ["Looking for", "Investors, hires"]],
    files: ["Pitch deck", "Product demo", "2-pager"],
  },
  {
    name: "Arjun Mehta", role: "Partner, Orbit Ventures", face: "1560250097-0b93528c311a", theme: ["#2b2e34", "#16181b"],
    mode: "Investor", icon: "trend", cta: "Pitch me",
    facts: [["Sectors", "Climate, fintech"], ["Stages", "Pre-seed, seed"], ["Cheque size", "$25k to $250k"]],
    files: ["Fund deck", "Thesis & one-pager"],
  },
  {
    name: "Kavya Rao", role: "Owner, Kiln & Co. Ceramics", face: "1494790108377-be9c29b29330", theme: ["#b0482a", "#7c2f1a"],
    mode: "Business", icon: "store", cta: "Get a quote",
    facts: [["Products", "Tableware, studio pieces"], ["Pricing", "From ₹1,200 a piece"], ["Delivery", "Ships in 7 days"]],
    files: ["Catalog & rate card", "Case studies"],
  },
  {
    name: "Leah Okafor", role: "Product designer", face: "1607990283143-e81e7a2c9349", theme: ["#22634c", "#133f30"],
    mode: "Hire me", icon: "user", cta: "Contact me", status: "Open to work",
    facts: [["Experience", "6 years, fintech"], ["Skills", "Figma, research, prototyping"], ["Education", "NID Ahmedabad"]],
    files: ["Resume", "Portfolio"],
  },
  {
    name: "Dev Raman", role: "Talent, Lumen Labs", face: "1500648767791-00dcc994a43e", theme: ["#1f5f7a", "#123f52"],
    mode: "Recruiter", icon: "user-search", cta: "See open roles", status: "Hiring · 3 open roles",
    facts: [["Work type", "Hybrid"], ["Locations", "Bengaluru, Remote"], ["Process", "3 steps, 2 weeks"]],
    files: ["Company deck", "Job descriptions"],
  },
  {
    name: "Ishaan Verma", role: "Engineer, hackathon regular", face: "1507003211169-0a1dd7228f2d", theme: ["#6b2c4f", "#461b33"],
    mode: "Hackathon", icon: "code", cta: "Team up",
    facts: [["I am a", "Participant"], ["Stack", "React, Python, ML"], ["Looking for a team?", "Yes"]],
    files: ["Demo video", "Pitch slides"],
  },
];

export const BLURB: Record<string, string> = {
  Founder: "Your stage, traction and what you are raising for, with the deck and demo one tap away.",
  Investor: "Thesis, cheque size and how to pitch you, so founders send the right thing the first time.",
  Business: "Products, pricing and delivery areas, plus your catalog and a way to ask for a quote.",
  "Hire me": "A profile page built from your experience, education, skills and resume, with an Open to work badge.",
  Recruiter: "Open roles people can apply to in one tap, with every applicant tracked in a simple pipeline.",
  Hackathon: "Your stack, past wins and whether you need a team, with the demo video right there.",
};
