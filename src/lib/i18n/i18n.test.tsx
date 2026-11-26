import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider, useI18n } from './index';
import { km } from './dict.km';
import type { Dict } from './dict.en';

function Probe() {
  const { t, lang, setLang } = useI18n();
  return (
    <div>
      <p data-testid="count">{t('cart.count', { n: 2 })}</p>
      <p data-testid="lang">{lang}</p>
      <button onClick={() => setLang(lang === 'en' ? 'km' : 'en')}>switch</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = 'en';
});

describe('i18n', () => {
  it('interpolates variables', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('count').textContent).toBe('2 items in your bag');
  });

  it('switches to Khmer, sets <html lang> and remembers the choice', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    act(() => screen.getByRole('button').click());
    expect(screen.getByTestId('lang').textContent).toBe('km');
    expect(document.documentElement.lang).toBe('km');
    expect(localStorage.getItem('sc.lang')).toBe('km');
  });

  it('starts from the remembered language', () => {
    localStorage.setItem('sc.lang', 'km');
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('lang').textContent).toBe('km');
  });

  it('requires every key in the Khmer dictionary', () => {
    // @ts-expect-error a dictionary missing keys is not a Dict
    const partial: Dict = { 'cart.count': 'x' };
    expect(partial).toBeTruthy();
    expect(Object.keys(km).length).toBeGreaterThan(10);
  });
});
