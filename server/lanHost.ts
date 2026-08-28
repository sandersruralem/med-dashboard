import dgram from "node:dgram";
import os from "node:os";

const VIRTUAL_NAME = /vethernet|wsl|vmware|virtualbox|hyper-v|hyperv|bluetooth|tailscale|zerotier|loopback|vbox|docker|hamachi/i;

function isIPv4(addr: os.NetworkInterfaceInfo): boolean {
  return addr.family === "IPv4" || (addr.family as unknown) === 4;
}

function isLoopbackIp(ip: string): boolean {
  return ip === "127.0.0.1" || ip === "0.0.0.0" || ip.startsWith("127.");
}

function isApipa(ip: string): boolean {
  return ip.startsWith("169.254.");
}

function isPrivate(ip: string): boolean {
  return ip.startsWith("192.168.") || ip.startsWith("10.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
}

function privateRank(ip: string): number {
  if (ip.startsWith("192.168.")) return 0;
  if (ip.startsWith("10.")) return 1;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return 2;
  return 3;
}

function isVirtualName(name: string): boolean {
  return VIRTUAL_NAME.test(name);
}

function ownerName(ip: string): string | null {
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (isIPv4(addr) && addr.address === ip) return name;
    }
  }
  return null;
}

interface Candidate {
  name: string;
  address: string;
}

function candidates(): Candidate[] {
  const found: Candidate[] = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (isVirtualName(name)) continue;
    for (const addr of addrs ?? []) {
      if (!isIPv4(addr) || addr.internal) continue;
      if (isLoopbackIp(addr.address) || isApipa(addr.address)) continue;
      found.push({ name, address: addr.address });
    }
  }
  return found;
}

function defaultRouteIPv4(): Promise<string | null> {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    const finish = (ip: string | null) => {
      socket.removeAllListeners();
      try {
        socket.close();
      } catch {
        /* ignore */
      }
      resolve(ip);
    };
    socket.once("error", () => finish(null));
    try {
      socket.connect(53, "1.1.1.1", () => {
        try {
          const addr = socket.address();
          const ip = typeof addr === "object" ? addr.address : null;
          finish(ip && !isLoopbackIp(ip) && !isApipa(ip) ? ip : null);
        } catch {
          finish(null);
        }
      });
    } catch {
      finish(null);
    }
  });
}

/** DHCP / default-route IPv4 for LAN share links. Never 127.0.0.1. */
export async function lanIPv4(): Promise<string | null> {
  const list = candidates();
  const routed = await defaultRouteIPv4();
  if (routed) {
    const name = ownerName(routed);
    const virtual = name ? isVirtualName(name) : false;
    if (!virtual && list.some((c) => c.address === routed)) return routed;
    if (!virtual && isPrivate(routed)) return routed;
  }
  const privateLan = list.filter((c) => isPrivate(c.address)).sort((a, b) => privateRank(a.address) - privateRank(b.address));
  const picked = privateLan[0]?.address ?? list[0]?.address ?? null;
  return picked && !isLoopbackIp(picked) ? picked : null;
}
