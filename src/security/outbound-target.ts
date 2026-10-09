import { isIP } from 'node:net';

export type OutboundTargetPurpose = 'crawl' | 'webhook';

function ipv4ToNumber(address: string): number {
  return address
    .split('.')
    .map(Number)
    .reduce((value, octet) => value * 256 + octet, 0);
}

function ipv4InCidr(address: string, network: string, prefix: number): boolean {
  const value = ipv4ToNumber(address);
  const base = ipv4ToNumber(network);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (base & mask);
}

const blockedIpv4Ranges = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const;

function isBlockedIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];

  if (mappedIpv4) return !isPublicIpAddress(mappedIpv4);

  return (
    normalized === '::' ||
    normalized === '::1' ||
    /^f[cd]/.test(normalized) ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith('ff') ||
    normalized.startsWith('2001:db8:')
  );
}

export function isPublicIpAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    return !blockedIpv4Ranges.some(([network, prefix]) => ipv4InCidr(address, network, prefix));
  }
  if (family === 6) return !isBlockedIpv6(address);
  return false;
}

export function parseOutboundTarget(rawUrl: string, purpose: OutboundTargetPurpose): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new TypeError('Outbound target must be an absolute URL');
  }

  const allowedProtocols = purpose === 'webhook' ? ['https:'] : ['http:', 'https:'];
  if (!allowedProtocols.includes(url.protocol)) {
    throw new TypeError(`Protocol ${url.protocol} is not allowed for ${purpose}`);
  }
  if (url.username || url.password) {
    throw new TypeError('Outbound target credentials are not allowed');
  }
  if (!url.hostname) throw new TypeError('Outbound target hostname is required');
  const addressLiteral = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(addressLiteral) && !isPublicIpAddress(addressLiteral)) {
    throw new TypeError('Outbound target must resolve to a public IP address');
  }

  url.hash = '';
  return url;
}

export function assertPublicResolution(addresses: readonly string[]): void {
  if (addresses.length === 0) throw new TypeError('Hostname did not resolve');
  if (addresses.some((address) => !isPublicIpAddress(address))) {
    throw new TypeError('Every resolved address must be public');
  }
}
