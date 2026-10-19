import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ManageFiltersDialog } from '../src/components/AssetsTable/ManageFiltersDialog';

const DEFAULT_VISIBLE = [
  'deviceType',
  'os',
  'location',
  'accountType',
  'group',
  'riskScore',
  'status',
  'lastConnected',
  'sourceCoverage',
  'manufacturer',
] as const;

const ALL_IDS = [
  'deviceType',
  'os',
  'location',
  'accountType',
  'group',
  'riskScore',
  'status',
  'lastConnected',
  'sourceCoverage',
  'manufacturer',
  'model',
  'createdTime',
  'authRepo',
  'nasSite',
  'macVendor',
  'nasIp',
  'agentpLastReported',
  'riskViolation',
  'onThisDevice',
  'agentpVersion',
] as const;

function renderDialog(overrides: Partial<React.ComponentProps<typeof ManageFiltersDialog>> = {}) {
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.textContent = 'Manage filters';
  document.body.appendChild(trigger);

  const onApply = vi.fn();
  const onOpenChange = vi.fn();

  const view = render(
    <ManageFiltersDialog
      allIds={[...ALL_IDS]}
      entity="devices"
      onApply={onApply}
      onOpenChange={onOpenChange}
      open
      triggerRef={{ current: trigger }}
      visibleIds={[...DEFAULT_VISIBLE]}
      {...overrides}
    />
  );

  return { ...view, trigger, onApply, onOpenChange };
}

describe('Manage filters dialog', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('1 opens with current filters checked', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });

    renderDialog();

    expect(screen.getByText('Manage filters (10 shown)')).toBeTruthy();
    expect((screen.getByLabelText('Device type') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Source coverage') as HTMLInputElement).checked).toBe(true);
  });

  it('2 staged changes need Apply', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });

    const { onApply } = renderDialog();

    fireEvent.click(screen.getByLabelText('Device type'));
    fireEvent.click(screen.getByLabelText('Device model'));

    expect((screen.getByLabelText('Device type') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('Device model') as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0]).toEqual(expect.arrayContaining(['os', 'sourceCoverage', 'model']));
    expect(onApply.mock.calls[0][0]).not.toContain('deviceType');
  });

  it('3 unchecking a default hides the section, clears values, removes the chip', () => {
    renderDialog();

    fireEvent.click(screen.getByLabelText('Risk score'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(screen.getByRole('button', { name: 'Apply' })).toBeTruthy();
    expect((screen.getByLabelText('Risk score') as HTMLInputElement).checked).toBe(false);
  });

  it('4 unchecking an added filter does the same', () => {
    renderDialog({ visibleIds: [...DEFAULT_VISIBLE, 'model'] });

    fireEvent.click(screen.getByLabelText('Device model'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect((screen.getByLabelText('Device model') as HTMLInputElement).checked).toBe(false);
  });

  it('5 Cancel and Esc discard', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });

    const { onOpenChange } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });

  it('6 search and empty state', () => {
    renderDialog();

    fireEvent.change(screen.getByLabelText('Search filters'), { target: { value: 'zzzz' } });
    expect(screen.getByText('No filters match.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Search filters'), { target: { value: 'device' } });
    expect(screen.getByText('Device type')).toBeTruthy();
  });

  it('7 Default view / CAASM View restore hidden defaults', () => {
    const { container } = renderDialog({ visibleIds: ['deviceType', 'os'] });
    expect(container.textContent).toContain('Manage filters');
    expect((screen.getByLabelText('Device type') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('OS') as HTMLInputElement).checked).toBe(true);
  });

  it('8 saved view restores hidden defaults and added sections', () => {
    renderDialog({ visibleIds: ['deviceType', 'os', 'model'] });

    fireEvent.click(screen.getByLabelText('Device model'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect((screen.getByLabelText('Device model') as HTMLInputElement).checked).toBe(false);
  });

  it('9 unchanged detection includes hidden defaults', () => {
    renderDialog({ visibleIds: ['deviceType'] });
    fireEvent.click(screen.getByLabelText('Device type'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect((screen.getByLabelText('Device type') as HTMLInputElement).checked).toBe(false);
  });

  it('10 focus to search on open and back to the button on close', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });

    const TriggerButton = () => {
      const [open, setOpen] = React.useState(true);
      const triggerRef = React.useRef<HTMLButtonElement | null>(null);

      return (
        <>
          <button ref={triggerRef} onClick={() => setOpen(true)} type="button">Manage filters</button>
          <ManageFiltersDialog
            allIds={[...ALL_IDS]}
            entity="devices"
            onApply={() => setOpen(false)}
            onOpenChange={setOpen}
            open={open}
            triggerRef={triggerRef}
            visibleIds={[...DEFAULT_VISIBLE]}
          />
        </>
      );
    };

    render(<TriggerButton />);

    const trigger = screen.getByRole('button', { name: 'Manage filters' });
    const search = screen.getByLabelText('Search filters') as HTMLInputElement;

    expect(document.activeElement).toBe(search);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(document.activeElement).toBe(trigger);
  });
});
