import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('shared button styles', () => {
  it('contains the prototype button variants and disabled rules', () => {
    const css = readFileSync(path.resolve(__dirname, 'buttonStyles.module.css'), 'utf8');

    expect(css).toContain('.button');
    expect(css).toContain('.buttonPrimary');
    expect(css).toContain('.buttonSecondary');
    expect(css).toContain('.buttonTertiary');
    expect(css).toContain('.buttonDanger');
    expect(css).toContain(':disabled');
    expect(css).toContain(':active');
    expect(css).toContain('var(--b-dis-bg)');
    expect(css).toContain('var(--b-red-hb)');
    expect(css).toContain('var(--b-pri-h)');
  });
});
