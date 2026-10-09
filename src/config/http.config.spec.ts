import { getHttpPort } from './http.config.js';

describe('getHttpPort', () => {
  it('uses port 3000 when no value is configured', () => {
    expect(getHttpPort(undefined)).toBe(3000);
  });

  it('parses a valid configured port', () => {
    expect(getHttpPort('8080')).toBe(8080);
  });

  it.each(['0', '65536', '1.5', 'invalid'])('rejects invalid port %s', (value) => {
    expect(() => getHttpPort(value)).toThrow('PORT must be an integer between 1 and 65535.');
  });
});
