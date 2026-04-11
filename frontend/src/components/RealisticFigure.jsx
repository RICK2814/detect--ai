import React from "react";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Camera,
  CheckCircle2,
  CircleEllipsis,
  FileText,
  Flag,
  FlaskConical,
  Globe,
  HelpCircle,
  Image,
  Lightbulb,
  Link2,
  MessageSquare,
  Pencil,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

const ICON_BY_SYMBOL = {
  "🚀": Sparkles,
  "⚠️": AlertTriangle,
  "✅": CheckCircle2,
  "❌": XCircle,
  "❓": HelpCircle,
  "⚡": Sparkles,
  "🔬": FlaskConical,
  "🌐": Globe,
  "📄": FileText,
  "✏️": Pencil,
  "🖼️": Image,
  "💡": Lightbulb,
  "🔍": Search,
  "📭": FileText,
  "🗑": Trash2,
  "📊": BarChart3,
  "💬": MessageSquare,
  "🤖": Bot,
  "👤": UserRound,
  "🧑": UserRound,
  "🚩": Flag,
  "🛡️": ShieldCheck,
  "📷": Camera,
  "✕": X,
  "🔗": Link2,
  "…": CircleEllipsis,
};

export default function RealisticFigure({ symbol, className = "animated-emoji emoji-icon", size = "1em", style }) {
  const Icon = ICON_BY_SYMBOL[symbol] || Sparkles;

  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", ...style }} aria-hidden="true">
      <Icon size={size} strokeWidth={2.1} />
    </span>
  );
}