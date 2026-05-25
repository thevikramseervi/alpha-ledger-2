"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function NetworkStatusBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);

    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);

    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (online) {
    return null;
  }

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-amber-100 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center gap-2 text-sm">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>
          Offline mode: cached pages and data stay available. New changes are disabled
          until you reconnect.
        </span>
      </div>
    </div>
  );
}
