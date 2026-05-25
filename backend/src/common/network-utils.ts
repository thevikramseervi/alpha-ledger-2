export function isPrivateNetworkHost(hostname: string): boolean {
  // 0.0.0.0 is a bind address, not a routable host — but browsers can use it in the URL bar.
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    return true;
  }

  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = parts;

  if (first === 10) {
    return true;
  }

  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }

  if (first === 192 && second === 168) {
    return true;
  }

  return false;
}

/** True for http(s)://<private-ip>:3000 — typical mobile/LAN dev frontend origin. */
export function isAllowedDevFrontendOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }

    const port = url.port || (url.protocol === 'https:' ? '443' : '80');
    if (port !== '3000') {
      return false;
    }

    return isPrivateNetworkHost(url.hostname);
  } catch {
    return false;
  }
}

export function getListenHost(): string {
  if (process.env.HOST) {
    return process.env.HOST;
  }

  // PaaS containers (Railway, Render, Fly) need 0.0.0.0; local prod behind nginx can set HOST=127.0.0.1
  return '0.0.0.0';
}
