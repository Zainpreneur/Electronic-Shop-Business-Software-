const palette: Record<string, string> = {
  gray: "bg-slate-100 text-slate-700",
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-rose-100 text-rose-700",
  yellow: "bg-amber-100 text-amber-700",
  blue: "bg-sky-100 text-sky-700",
  purple: "bg-violet-100 text-violet-700",
};

export function Badge({ color = "gray", children }: { color?: keyof typeof palette; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${palette[color]}`}>
      {children}
    </span>
  );
}

const statusColors: Record<string, keyof typeof palette> = {
  COMPLETED: "green",
  DELIVERED: "green",
  RECEIVED: "blue",
  ORDERED: "blue",
  DIAGNOSING: "purple",
  IN_PROGRESS: "yellow",
  WAITING_FOR_PARTS: "yellow",
  CANCELLED: "red",
  REFUNDED: "red",
  PARTIALLY_REFUNDED: "yellow",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge color={statusColors[status] || "gray"}>{status.replace(/_/g, " ")}</Badge>;
}
