import os from "os";

/** Hostnames for Next.js allowedDevOrigins (not full URLs). */
export function getLocalNetworkDevOrigins(): string[] {
  const origins = new Set<string>(["127.0.0.1", "0.0.0.0", "localhost"]);

  for (const interfaces of Object.values(os.networkInterfaces())) {
    if (!interfaces) {
      continue;
    }

    for (const iface of interfaces) {
      if (iface.family !== "IPv4" || iface.internal) {
        continue;
      }

      origins.add(iface.address);
    }
  }

  const fromEnv = process.env.DEV_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (fromEnv) {
    for (const origin of fromEnv) {
      origins.add(origin.replace(/^https?:\/\//, "").split(":")[0]!);
    }
  }

  return [...origins];
}
