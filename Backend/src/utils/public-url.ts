import dns from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import dnsCallback from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import type { LookupFunction } from 'node:net';

const PRIVATE_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
]);

const isPrivateIPv4 = (address: string) => {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
};

const isPrivateIPv6 = (address: string) => {
  const normalized = address.toLowerCase();

  if (normalized.startsWith('::ffff:')) {
    const mappedIpv4 = normalized.replace('::ffff:', '');
    if (net.isIP(mappedIpv4) === 4) {
      return isPrivateIPv4(mappedIpv4);
    }
  }

  return (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:')
  );
};

const isPrivateAddress = (address: string) => {
  const family = net.isIP(address);
  if (family === 4) return isPrivateIPv4(address);
  if (family === 6) return isPrivateIPv6(address);
  return true;
};

export const assertPublicHttpUrl = async (rawUrl: string) => {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Website URL is invalid');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Website URL must use http or https');
  }

  if (parsed.username || parsed.password) {
    throw new Error('Website URL cannot include credentials');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    PRIVATE_HOSTS.has(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.localhost')
  ) {
    throw new Error('Website URL must be publicly reachable');
  }

  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new Error('Website URL must not target a private network address');
    }
    return parsed;
  }

  let addresses: LookupAddress[];
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: false });
  } catch {
    throw new Error('Website host could not be resolved');
  }

  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error('Website URL must resolve to a public address');
  }

  return parsed;
};

const publicLookup: LookupFunction = (hostname, options, callback) => {
  dnsCallback.lookup(hostname, options, (error, address, family) => {
    if (error) {
      callback(error, '', 0);
      return;
    }

    const selectedAddress = Array.isArray(address) ? address[0]?.address : address;
    const selectedFamily = Array.isArray(address) ? address[0]?.family : family;

    if (!selectedAddress || isPrivateAddress(selectedAddress)) {
      callback(new Error('Resolved address is not public'), '', 0);
      return;
    }

    callback(null, selectedAddress, selectedFamily);
  });
};

export const createPublicHttpAgents = () => ({
  httpAgent: new http.Agent({ lookup: publicLookup }),
  httpsAgent: new https.Agent({ lookup: publicLookup }),
});
