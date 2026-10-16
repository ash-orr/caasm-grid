import { describe, expect, it } from 'vitest';
import { formatSourceSyncAge, getSourceCoverageVisibility } from '../src/components/AssetsTable/sourceCoverage.js';

describe('source coverage visibility', () => {
  it('handles 0 rows', () => {
    const result = getSourceCoverageVisibility(0, false);

    expect(result.visibleCount).toBe(0);
    expect(result.showToggle).toBe(false);
  });

  it('handles 5 rows without toggle', () => {
    const result = getSourceCoverageVisibility(5, false);

    expect(result.visibleCount).toBe(5);
    expect(result.showToggle).toBe(false);
  });

  it('handles 6 rows with Show all and Collapse', () => {
    const collapsed = getSourceCoverageVisibility(6, false);
    const expanded = getSourceCoverageVisibility(6, true);

    expect(collapsed.visibleCount).toBe(5);
    expect(collapsed.toggleLabel).toBe('Show all (+1)');
    expect(expanded.visibleCount).toBe(6);
    expect(expanded.toggleLabel).toBe('Collapse');
  });

  it('handles 9 rows with Show all and Collapse', () => {
    const collapsed = getSourceCoverageVisibility(9, false);
    const expanded = getSourceCoverageVisibility(9, true);

    expect(collapsed.visibleCount).toBe(5);
    expect(collapsed.toggleLabel).toBe('Show all (+4)');
    expect(expanded.visibleCount).toBe(9);
    expect(expanded.toggleLabel).toBe('Collapse');
  });
});

describe('source sync age formatting', () => {
  const now = Date.parse('2026-10-16T16:00:00.000Z');

  it('formats <1h, Nh, Nd and suppresses time when required', () => {
    expect(formatSourceSyncAge('Reporting', '2026-10-16T15:30:00.000Z', now)).toBe('<1h ago');
    expect(formatSourceSyncAge('Stale', '2026-10-16T12:00:00.000Z', now)).toBe('4h ago');
    expect(formatSourceSyncAge('Reporting', '2026-10-13T16:00:00.000Z', now)).toBe('3d ago');

    expect(formatSourceSyncAge('Pending', '2026-10-16T12:00:00.000Z', now)).toBeNull();
    expect(formatSourceSyncAge('Not present', '2026-10-16T12:00:00.000Z', now)).toBeNull();
    expect(formatSourceSyncAge('Not applicable', '2026-10-16T12:00:00.000Z', now)).toBeNull();
  });
});
