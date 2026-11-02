const TONES: Record<string, string> = {
  draft: "bg-paper-deep text-ink-soft",
  sent: "bg-[#e5eef8] text-sent",
  paid: "bg-[#e5f4ec] text-paid",
  overdue: "bg-[#f8e6e4] text-stamp",
  accepted: "bg-[#e5f4ec] text-paid",
  declined: "bg-[#f8e6e4] text-stamp",
  expired: "bg-paper-deep text-ink",
  converted: "bg-[#f6edd8] text-[#6d5420]",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-medium tracking-[0.12em] uppercase ${
        TONES[status] ?? "bg-paper-deep text-ink"
      }`}
    >
      {status}
    </span>
  );
}
