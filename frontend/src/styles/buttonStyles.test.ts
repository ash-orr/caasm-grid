import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

describe('shared button styles', () => {
  it('contains the prototype button variants and disabled rules', () => {
    const css = readFileSync(path.resolve(__dirname, 'buttonStyles.module.css'), 'utf8');

    expect(css).toContain('.button');
    expect(css).toContain('.buttonPrimary');
    expect(css).toContain('.buttonSecondary');
    expect(css).toContain('.buttonTertiary');
    expect(css).toContain('.buttonDanger');
    expect(css).toContain('.buttonTertiary.buttonDanger');
    expect(css).toContain('.buttonTertiary.buttonDanger');
    expect(css).toContain('background: transparent;');
    expect(css).toContain('border-color: transparent;');
    expect(css).toContain('color: var(--b-red-tx);');
    expect(css).toContain(':disabled');
    expect(css).toContain(':active');
    expect(css).toContain('var(--b-dis-bg)');
    expect(css).toContain('var(--b-red-hb)');
    expect(css).toContain('var(--b-pri-h)');
  });

  it('applies the tertiary + danger class combination when used together', () => {
    const { container } = render(
      createElement(
        'button',
        {
          className: 'button buttonTertiary buttonDanger',
          type: 'button',
        },
        'Delete',
      ),
    );

    const element = container.firstElementChild as HTMLElement | null;
    expect(element).not.toBeNull();
    expect(element?.className).toContain('button');
    expect(element?.className).toContain('buttonTertiary');
    expect(element?.className).toContain('buttonDanger');
  });
});
