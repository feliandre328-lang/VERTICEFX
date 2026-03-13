import React from "react";

export default function Money({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`text-emerald-500 font-semibold ${className}`}>{children}</span>;
}