import { describe, expect, it } from 'vitest';
import {
  assertPublicResolution,
  isPublicIpAddress,
  parseOutboundTarget,
} from './outbound-target.js';

describe('outbound target security', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '100.64.0.1',
    '169.254.169.254',
    '172.20.0.1',
    '192.168.1.1',
    '::1',
    'fc00::1',
    'fe80::1',
    '2001:db8::1',
  ])('blocks non-public address %s', (address) => {
    expect(isPublicIpAddress(address)).toBe(false);
  });

  it.each(['93.184.216.34', '1.1.1.1', '2606:4700:4700::1111'])(
    'accepts public address %s',
    (address) => {
      expect(isPublicIpAddress(address)).toBe(true);
    },
  );

  it('allows HTTP crawling but requires HTTPS webhooks', () => {
    expect(parseOutboundTarget('http://example.com/page#part', 'crawl').href).toBe(
      'http://example.com/page',
    );
    expect(() => parseOutboundTarget('http://example.com/hook', 'webhook')).toThrow(/Protocol/);
    expect(parseOutboundTarget('https://example.com/hook', 'webhook').protocol).toBe('https:');
  });

  it('rejects credentials, non-HTTP schemes, and direct private targets', () => {
    expect(() => parseOutboundTarget('https://user:secret@example.com', 'crawl')).toThrow(
      /credentials/,
    );
    expect(() => parseOutboundTarget('file:///etc/passwd', 'crawl')).toThrow(/Protocol/);
    expect(() => parseOutboundTarget('http://127.0.0.1', 'crawl')).toThrow(/public IP/);
    expect(() => parseOutboundTarget('http://[::1]', 'crawl')).toThrow(/public IP/);
  });

  it('rejects DNS answers when any address is unsafe', () => {
    expect(() => assertPublicResolution([])).toThrow(/did not resolve/);
    expect(() => assertPublicResolution(['93.184.216.34', '127.0.0.1'])).toThrow(
      /Every resolved address/,
    );
    expect(() => assertPublicResolution(['93.184.216.34'])).not.toThrow();
  });
});
