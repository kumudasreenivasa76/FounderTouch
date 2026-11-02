import {
  ArrowLeft, ArrowRight, ArrowUpRight, Briefcase, Building2, Calendar, CalendarCheck, Camera, Check, CheckCircle2, ChevronDown, ChevronRight,
  CircleAlert, CircleDot, Code2, Contact, Copy, Download, FileText, Flag, Folder, Globe, GraduationCap, Layers, Link2, Lock, LogOut, Mail, MapPin,
  MessageSquare, MoreHorizontal, Nfc, Palette, Paperclip, Phone, Play, Plus, QrCode, RefreshCw, ScanLine, Send, Settings, Share, Shuffle,
  Store, Tag, Ticket, Trash2, Trophy, TrendingUp, User, UserSearch, Users, Video, Wallet, X, XCircle, Bookmark, Lightbulb, Wrench, Banknote,
  type LucideIcon,
} from "lucide-react-native";
import { colors, ICON_STROKE } from "../theme";

/** Same name map as the web app (components/icon.tsx), so API `icon` fields resolve identically. */
const ICONS: Record<string, LucideIcon> = {
  "arrow-left": ArrowLeft, "arrow-right": ArrowRight, external: ArrowUpRight, briefcase: Briefcase, building: Building2,
  calendar: Calendar, "calendar-check": CalendarCheck, camera: Camera, check: Check, "check-circle": CheckCircle2,
  "chevron-down": ChevronDown, "chevron-right": ChevronRight, alert: CircleAlert, dot: CircleDot, code: Code2, contact: Contact,
  copy: Copy, download: Download, file: FileText, flag: Flag, folder: Folder, globe: Globe, school: GraduationCap, layers: Layers,
  link: Link2, lock: Lock, mail: Mail, pin: MapPin, message: MessageSquare, more: MoreHorizontal, nfc: Nfc, palette: Palette,
  clip: Paperclip, phone: Phone, play: Play, plus: Plus, qr: QrCode, flip: RefreshCw, scan: ScanLine, send: Send, settings: Settings,
  share: Share, shuffle: Shuffle, store: Store, tag: Tag, ticket: Ticket, trophy: Trophy, trend: TrendingUp, user: User,
  "user-search": UserSearch, users: Users, video: Video, wallet: Wallet, x: X, "x-circle": XCircle, bookmark: Bookmark,
  idea: Lightbulb, tools: Wrench, money: Banknote,
  // mobile-only additions
  logout: LogOut, trash: Trash2,
};

export type IconName = keyof typeof ICONS;

export function Icon({ n, size = 18, color = colors.ink, strokeWidth = ICON_STROKE }: { n: string; size?: number; color?: string; strokeWidth?: number }) {
  const C = ICONS[n] ?? CircleDot;
  return <C size={size} color={color} strokeWidth={strokeWidth} />;
}
