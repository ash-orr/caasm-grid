import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tooltip } from '../src/components/AssetsTable/Tooltip';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

describe('Tooltip', () => {
  it('renders the tooltip content when opened', () => {
    render(
      <Tooltip content="This view must be saved before you can share a link" open>
        <button type="button">Share link</button>
      </Tooltip>
    );

    expect(screen.getByText('This view must be saved before you can share a link')).toBeTruthy();
  });
});
