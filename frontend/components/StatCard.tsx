import React from "react";

type StatCardProps = {
  label: string;
  value: React.ReactNode;        // ✅ era string
  subValue?: React.ReactNode;     // ✅ opcional, também pode virar ReactNode
  icon: any;
  color?: string;
  isAnimated?: boolean;
};

export default function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  color = "slate",
  isAnimated = false,
}: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold">{label}</p>

          {/* ✅ aqui NÃO pode assumir string */}
          <div className={`mt-2 text-2xl font-extrabold text-slate-100 ${isAnimated ? "animate-pulse" : ""}`}>
            {value}
          </div>

          {subValue ? <div className="mt-1 text-xs text-slate-500">{subValue}</div> : null}
        </div>

        <div className="shrink-0 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <Icon size={18} className="text-slate-300" />
        </div>
      </div>
    </div>
  );
}