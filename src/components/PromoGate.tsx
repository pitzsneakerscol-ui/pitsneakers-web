"use client";

import { useEffect, useState } from "react";

export default function PromoGate({
  endsAt,
  children,
}: {
  endsAt: string;
  children: React.ReactNode;
}) {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const remaining = new Date(endsAt).getTime() - Date.now();
    const timeout = setTimeout(() => setExpired(true), Math.max(remaining, 0));
    return () => clearTimeout(timeout);
  }, [endsAt]);

  if (expired) return null;
  return <>{children}</>;
}
