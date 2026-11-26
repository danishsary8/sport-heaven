import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATEGORY_IMAGES } from './categoryImages';

const PUBLIC = resolve(__dirname, '../../../../public');

describe('category tile photos', () => {
  it.each(Object.entries(CATEGORY_IMAGES))('%s points at a photo that ships with the shop', (_slug, path) => {
    expect(path.startsWith('/assets/catalog/')).toBe(true);
    expect(existsSync(resolve(PUBLIC, `.${path}`))).toBe(true);
  });
});
