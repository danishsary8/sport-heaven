import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');

const TOKENS: Record<string, string> = {
  paper: '#FDFCF9',
  stone: '#EAE7DF',
  obsidian: '#0E1113',
  graphite: '#5A5D57',
  vermilion: '#C8232C',
  cobalt: '#032EA1',
  brass: '#B8933B',
};

describe('design tokens', () => {
  it.each(Object.entries(TOKENS))('defines --color-%s exactly once as %s', (name, hex) => {
    const matches = css.match(new RegExp(`--color-${name}:\\s*([^;]+);`, 'g')) ?? [];
    expect(matches).toHaveLength(1);
    expect(matches[0]).toContain(hex);
  });

  it('uses Barlow Condensed for display and Noto Sans Khmer for Khmer', () => {
    expect(css).toMatch(/--font-display:\s*"Barlow Condensed"/);
    expect(css).toMatch(/--font-khmer:\s*"Noto Sans Khmer"/);
    expect(css).toMatch(/:root\[lang="?km"?\]/);
  });

  it('drops the demo fonts', () => {
    expect(css).not.toMatch(/Instrument Serif|JetBrains Mono/);
  });

  it('has a visible focus ring and honours reduced motion', () => {
    expect(css).toMatch(/:focus-visible/);
    expect(css).toMatch(/prefers-reduced-motion/);
  });
});
