import { describe, expect, it } from 'vitest';
import { serializeJsonLd } from './jsonLd';

describe('serializeJsonLd', () => {
  it('escapes characters that could end the script tag', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script> & co' });
    expect(out).not.toMatch(/[<>&]/);
    expect(JSON.parse(out)).toEqual({ name: '</script><script>alert(1)</script> & co' });
  });
});
