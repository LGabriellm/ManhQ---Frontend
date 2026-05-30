"use client";

import { useEffect, useState } from "react";

interface ClientDateProps {
  date: string | Date | number;
  format?: "date" | "datetime" | "timeAgo" | "weekday" | "shortDate";
  className?: string;
  fallback?: React.ReactNode;
}

export function ClientDate({ date, format = "date", className, fallback = null }: ClientDateProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span className={className}>{fallback}</span>;
  }

  const d = new Date(date);
  let result = "";

  if (format === "timeAgo") {
    const diffMs = Date.now() - d.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) result = "agora";
    else if (minutes < 60) result = `há ${minutes}m`;
    else if (hours < 24) result = `há ${hours}h`;
    else if (days === 1) result = "ontem";
    else if (days < 30) result = `há ${days}d`;
    else result = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } else if (format === "datetime") {
    result = d.toLocaleString("pt-BR");
  } else if (format === "weekday") {
    result = d.toLocaleDateString("pt-BR", { weekday: "long" });
  } else if (format === "shortDate") {
    result = d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
  } else {
    result = d.toLocaleDateString("pt-BR");
  }

  return <span className={className}>{result}</span>;
}
