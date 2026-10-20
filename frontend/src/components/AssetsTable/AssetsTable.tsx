import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { accounts, devices, type AccountRecord, type DeviceRecord, type RiskViolation, type SourceName } from '../../mocks/generated/prototype-data';
import { applyAccountFilters, applyDeviceFilters, compareVersionsNumeric, type AccountFilterRow } from '../../filters/engine';
import {
  FILTER_SCHEMA,
  type AccountFilterState,
  type DeviceFilterState,
  type FilterEntity,
  type OnThisDeviceCategory,
  type SourceCoverageConditionStatus,
} from '../../filters/schema';
import {
  LocalStorageSavedViewStore,
  isSavedViewUnchanged,
  upsertSavedViewByName,
  type SavedView,
  type SavedViewBase,
  type SavedViewEntity,
  type SavedViewSnapshot,
  type SavedViewSort,
} from '../../views/savedViews';
import { nextSort, sortRowsBy } from './sort';
import { selectAllMatchingRows } from './selection';
import { ColumnPickerPopover, type ColumnPickerItem } from './ColumnPickerPopover';
import { ManageFiltersDialog } from './ManageFiltersDialog';
import { moveColumnById } from './columnOrder';
import { SourceCoverageCard } from './SourceCoverageCard';
import type { SourceCoverageRow } from './sourceCoverage';
import { getSelectionBannerState } from './selection';
import { buildSourceColumns } from './sourceColumns';
import { StatusPill } from '../StatusPill';
import styles from './AssetsTable.module.css';

type TabKey = 'devices' | 'accounts' | 'sites';

type Option = {
  value: string;
  label: string;
};

type Chip = {
  id: string;
  text: string;
  remove: () => void;
};

type AnyRow = DeviceRecord | AccountFilterRow;

type TableColumn<Row extends AnyRow> = {
  id: string;
  label: string;
  fixed?: boolean;
  defaultVisible: boolean;
  render: (row: Row) => ReactNode;
  exportValue: (row: Row) => string;
};

type SaveViewAction = 'update' | 'saveAsNew';

type ActiveViewKey = 'default' | 'caasm' | string;

type DetailViewState =
  | { kind: 'device'; record: DeviceRecord }
  | { kind: 'account'; record: AccountFilterRow }
  | null;

const savedViewStore = new LocalStorageSavedViewStore();

const DEVICE_CAASM_HIDDEN_COLUMNS = ['type', 'os', 'location', 'group', 'accountType', 'riskScore', 'status', 'lastConnected', 'createdTime'];
const ACCOUNT_CAASM_HIDDEN_COLUMNS = ['accountType', 'group', 'blocked', 'lastLogin'];

const DEFAULT_SORT_BY_TAB: Record<TabKey, SavedViewSort> = {
  devices: { columnId: 'name', direction: 'asc' },
  accounts: { columnId: 'name', direction: 'asc' },
  sites: { columnId: 'name', direction: 'asc' },
};

const CAASM_SORT_BY_TAB: Record<TabKey, SavedViewSort> = {
  devices: { columnId: 'coverageGaps', direction: 'desc' },
  accounts: { columnId: 'coverageGaps', direction: 'desc' },
  sites: { columnId: 'name', direction: 'asc' },
};

const PAGE_SIZE_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 100, label: '100' },
  { value: 200, label: '200' },
  { value: 500, label: '500' },
  { value: -1, label: 'Show all' },
];

const DEVICE_TARGET_ROW_COUNT = 1000;
const ACCOUNT_TARGET_ROW_COUNT = 1000;

const DEVICE_DEFAULT_SECTION_IDS = [
  'deviceType',
  'os',
  'location',
  'accountType',
  'group',
  'riskScore',
  'status',
  'lastConnected',
  'sourceCoverage',
] as const;

const ACCOUNT_DEFAULT_SECTION_IDS = [
  'accountType',
  'group',
  'blocked',
  'devices',
  'lastLogin',
  'sourceCoverage',
] as const;

const SOURCE_OPTIONS: SourceName[] = [
  'CrowdStrike',
  'SentinelOne',
  'Intune',
  'Jamf',
  'SOTI',
  'Absolute Secure Endpoint',
  'Portnox AgentP',
  'EntraID',
  'Active Directory',
  'Okta',
  'Google Workspace',
];

const ACCOUNT_ONLY_SOURCES: SourceName[] = ['Active Directory', 'EntraID', 'Okta', 'Google Workspace'];

const DEVICE_SOURCE_STATUS_OPTIONS: Option[] = [
  { value: 'Present', label: 'Present (Reporting or Stale)' },
  { value: 'Reporting', label: 'Reporting' },
  { value: 'Stale', label: 'Stale' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Not present', label: 'Not present' },
];

const ACCOUNT_SOURCE_STATUS_OPTIONS: Option[] = [
  { value: 'Reporting', label: 'Reporting' },
  { value: 'Not present', label: 'Not present' },
];

const ON_THIS_DEVICE_CATEGORIES: Array<{ value: OnThisDeviceCategory; label: string }> = [
  { value: 'applications', label: 'Applications' },
  { value: 'patches', label: 'Patches' },
  { value: 'processes', label: 'Processes' },
  { value: 'services', label: 'Services' },
  { value: 'peripherals', label: 'Peripherals' },
  { value: 'browser', label: 'Browser' },
  { value: 'browserExtensions', label: 'Browser extensions' },
];

const TIME_BUCKET_OPTIONS: Option[] = [
  { value: 'last24h', label: 'Last 24 hours' },
  { value: 'days1to7', label: '1 to 7 days ago' },
  { value: 'over7d', label: 'Over 7 days ago' },
];

const CREATED_BUCKET_OPTIONS: Option[] = [
  { value: 'last7d', label: 'Last 7 days' },
  { value: 'days7to30', label: '7 to 30 days ago' },
  { value: 'days30to90', label: '30 to 90 days ago' },
  { value: 'over90d', label: 'Over 90 days ago' },
];

const ACCOUNT_DEVICES_BUCKET_OPTIONS: Option[] = [
  { value: 'none', label: 'No devices' },
  { value: 'oneToTwo', label: '1 to 2' },
  { value: 'threeToFive', label: '3 to 5' },
  { value: 'sixPlus', label: '6 or more' },
];

const ACCOUNT_LAST_LOGIN_OPTIONS: Option[] = [
  { value: 'today', label: 'Today' },
  { value: 'days1to7', label: '1 to 7 days ago' },
  { value: 'days8to30', label: '8 to 30 days ago' },
  { value: 'over30d', label: 'Over 30 days ago' },
];

function expandDeviceRows(seedRows: DeviceRecord[], targetCount: number): DeviceRecord[] {
  if (seedRows.length >= targetCount) return seedRows;

  const rows: DeviceRecord[] = [];
  for (let index = 0; index < targetCount; index += 1) {
    const seed = seedRows[index % seedRows.length];
    rows.push({
      ...seed,
      id: index + 1,
      name: `${seed.name} #${index + 1}`,
    });
  }
  return rows;
}

function expandAccountRows(seedRows: AccountFilterRow[], targetCount: number): AccountFilterRow[] {
  if (seedRows.length >= targetCount) return seedRows;

  const rows: AccountFilterRow[] = [];
  for (let index = 0; index < targetCount; index += 1) {
    const seed = seedRows[index % seedRows.length];
    rows.push({
      ...seed,
      id: index + 1,
      name: `${seed.name} #${index + 1}`,
    });
  }
  return rows;
}

import { Tooltip } from './Tooltip';

function renderListValues(values: string[]): ReactNode {
  if (values.length === 0) return '—';
  if (values.length <= 2) return values.join(', ');

  const preview = values.slice(0, 2).join(', ');
  const remaining = values.length - 2;
  const title = `All ${values.length}\n${values.join('\n')}`;

  return (
    <>
      {preview}{' '}
      <Tooltip content={title}>
        <span className={styles.moreValues}>+{remaining}</span>
      </Tooltip>
    </>
  );
}

function uniqSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function toOption(value: string): Option {
  return { value, label: value };
}

function findSectionLabel(entity: FilterEntity, id: string): string {
  const match = FILTER_SCHEMA.find((item) => item.id === id && item.entities.includes(entity));
  return match?.label ?? id;
}

function computeAccountRows(): AccountFilterRow[] {
  const nowMs = Date.now();
  const byAccount = new Map<string, DeviceRecord[]>();

  devices.forEach((device) => {
    const list = byAccount.get(device.account) ?? [];
    list.push(device);
    byAccount.set(device.account, list);
  });

  return accounts.map((account) => {
    const accountDevices = byAccount.get(account.name) ?? [];
    const blocked = accountDevices.some((item) => item.status === 'Blocked');
    const latestConnectedMs = accountDevices.length > 0
      ? Math.max(...accountDevices.map((item) => Date.parse(item.lastConnectedAt)))
      : Number.NaN;

    const lastLoginDays = Number.isNaN(latestConnectedMs)
      ? undefined
      : Math.max(0, Math.floor((nowMs - latestConnectedMs) / (1000 * 60 * 60 * 24)));

    return {
      ...account,
      blocked,
      deviceCount: accountDevices.length,
      lastLoginDays,
    };
  });
}

function riskBand(score: number): 'Access' | 'Alert' | 'Blocked' {
  if (score >= 70) return 'Blocked';
  if (score >= 40) return 'Alert';
  return 'Access';
}

function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const time = Date.parse(isoDate);
  const diffHours = Math.max(0, Math.floor((now - time) / (1000 * 60 * 60)));

  if (diffHours < 1) return 'Under 1h ago';
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function formatCoverageGapsFromSourceCoverage(row: AccountRecord | DeviceRecord): string {
  const gaps = Object.entries(row.sourceCoverage)
    .filter((entry) => entry[1].status === 'Not present')
    .map((entry) => entry[0]);

  if (gaps.length === 0) return 'None';
  if (gaps.length <= 2) return gaps.join(', ');
  return `${gaps[0]}, ${gaps[1]} +${gaps.length - 2}`;
}

function countCoverageGaps(row: AccountRecord | DeviceRecord): number {
  return Object.values(row.sourceCoverage).filter((entry) => entry.status === 'Not present').length;
}

function deviceSortValue(row: DeviceRecord, columnId: string): string | number | null {
  if (columnId.startsWith('source:')) {
    const sourceName = columnId.slice(7) as SourceName;
    return row.sourceCoverage[sourceName]?.status ?? null;
  }

  switch (columnId) {
    case 'name':
      return row.name;
    case 'type':
      return row.type;
    case 'os':
      return row.os;
    case 'location':
      return row.location;
    case 'account':
      return row.account;
    case 'accountType':
      return row.accountType;
    case 'group':
      return row.group;
    case 'riskScore':
      return row.riskScore;
    case 'status':
      return row.status;
    case 'lastConnected':
      return Date.parse(row.lastConnectedAt);
    case 'createdTime':
      return Date.parse(row.createdAt);
    case 'coverageGaps':
      return row.coverageGaps.length;
    case 'authRepo':
      return row.authRepo ?? null;
    case 'nasSite':
      return row.nasSite;
    case 'macVendor':
      return row.macVendor;
    case 'manufacturer':
      return row.manufacturer;
    case 'model':
      return row.model;
    case 'applications':
      return row.applications.length;
    case 'patches':
      return row.patches.length;
    case 'processes':
      return row.processes.length;
    case 'services':
      return row.services.length;
    case 'peripherals':
      return row.peripherals.length;
    case 'browser':
      return row.browser.length;
    case 'browserExtensions':
      return row.browserExtensions.length;
    case 'agentpVersion':
      return row.agentpVersion;
    case 'riskViolations':
      return row.riskViolations.length;
    case 'nasIp':
      return row.nasIp;
    case 'agentpLastReported':
      return Date.parse(row.agentpLastReported);
    default:
      return null;
  }
}

function accountSortValue(row: AccountFilterRow, columnId: string): string | number | null {
  if (columnId.startsWith('source:')) {
    const sourceName = columnId.slice(7) as SourceName;
    return row.sourceCoverage[sourceName]?.status ?? null;
  }

  switch (columnId) {
    case 'name':
      return row.name;
    case 'accountType':
      return row.accountType;
    case 'group':
      return row.group;
    case 'deviceCount':
      return row.deviceCount ?? 0;
    case 'blocked':
      return row.blocked ? 1 : 0;
    case 'lastLogin':
      return row.lastLoginDays ?? null;
    case 'coverageGaps':
      return countCoverageGaps(row);
    case 'authRepo':
      return row.authRepo ?? null;
    case 'nasSite':
      return row.nasSite;
    case 'location':
      return row.location;
    default:
      return null;
  }
}

function stripSyntheticSuffix(value: string): string {
  return value.replace(/ #\d+$/, '');
}

function toSourceCoverageRows(
  row: AccountRecord | DeviceRecord,
  options?: { accountOnly?: boolean; omitNotApplicable?: boolean }
): SourceCoverageRow[] {
  const sourceNames = options?.accountOnly ? ACCOUNT_ONLY_SOURCES : SOURCE_OPTIONS;

  return sourceNames
    .map((source) => ({
      source,
      status: row.sourceCoverage[source].status,
      lastSyncAt: row.sourceCoverage[source].lastSyncAt,
    }))
    .filter((entry) => (options?.omitNotApplicable ? entry.status !== 'N/A' : true));
}

function estimateSourceConflictCount(rows: SourceCoverageRow[]): number {
  const statuses = rows.map((row) => row.status).filter((status) => status !== 'N/A');
  if (statuses.length === 0) return 0;

  const unique = new Set(statuses);
  let count = 0;

  if (unique.has('Reporting') && unique.has('Stale')) count += 1;
  if (unique.has('Reporting') && unique.has('Not present')) count += 1;
  if (unique.has('Stale') && unique.has('Not present')) count += 1;
  if (unique.has('Pending')) count += 1;

  return count;
}

function defaultDeviceFilters(): DeviceFilterState {
  return {
    sourceCoverage: [],
    onThisDevice: [],
    agentpVersionOlderThan: null,
  };
}

function defaultAccountFilters(): AccountFilterState {
  return {
    sourceCoverage: [],
  };
}

export function AssetsTable() {
  const [tab, setTab] = useState<TabKey>('devices');
  const [detailView, setDetailView] = useState<DetailViewState>(null);
  const [detailTabByKind, setDetailTabByKind] = useState<Record<'device' | 'account', string>>({
    device: 'Overview',
    account: 'Overview',
  });
  const [showFilters, setShowFilters] = useState(true);

  const [deviceFilters, setDeviceFilters] = useState<DeviceFilterState>(defaultDeviceFilters());
  const [accountFilters, setAccountFilters] = useState<AccountFilterState>(defaultAccountFilters());

  const [addedDeviceSections, setAddedDeviceSections] = useState<string[]>([]);
  const [addedAccountSections, setAddedAccountSections] = useState<string[]>([]);
  const [hiddenDeviceSections, setHiddenDeviceSections] = useState<string[]>([]);
  const [hiddenAccountSections, setHiddenAccountSections] = useState<string[]>([]);

  const [savedViewsByTab, setSavedViewsByTab] = useState<Record<TabKey, SavedView[]>>(() => ({
    devices: savedViewStore.list('devices'),
    accounts: savedViewStore.list('accounts'),
    sites: [],
  }));
  const [activeViewByTab, setActiveViewByTab] = useState<Record<TabKey, ActiveViewKey>>({
    devices: 'default',
    accounts: 'default',
    sites: 'default',
  });
  const [sortByTab, setSortByTab] = useState<Record<TabKey, SavedViewSort>>(DEFAULT_SORT_BY_TAB);

  const [expandedChipList, setExpandedChipList] = useState(false);

  const [manageFiltersOpen, setManageFiltersOpen] = useState(false);

  const [seeMoreOpenFor, setSeeMoreOpenFor] = useState<string | null>(null);
  const [seeMoreQuery, setSeeMoreQuery] = useState('');
  const [seeMoreDraftValues, setSeeMoreDraftValues] = useState<string[]>([]);

  const [sourceCoverageOpenDevice, setSourceCoverageOpenDevice] = useState(false);
  const [sourceCoverageOpenAccount, setSourceCoverageOpenAccount] = useState(false);

  const [onThisDeviceOpen, setOnThisDeviceOpen] = useState(false);

  const manageFiltersButtonRef = useRef<HTMLButtonElement | null>(null);

  const seeMoreTriggerRef = useRef<HTMLButtonElement | null>(null);
  const seeMoreMenuRef = useRef<HTMLDivElement | null>(null);
  const popupSearchRef = useRef<HTMLInputElement | null>(null);
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const [columnPickerAnchorEl, setColumnPickerAnchorEl] = useState<HTMLElement | null>(null);
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [removeViewDialogOpen, setRemoveViewDialogOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [seeMorePosition, setSeeMorePosition] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [pageByTab, setPageByTab] = useState<Record<TabKey, number>>({ devices: 0, accounts: 0, sites: 0 });
  const [pageSizeByTab, setPageSizeByTab] = useState<Record<TabKey, number>>({ devices: 100, accounts: 100, sites: 100 });
  const [selectedRowIdsByTab, setSelectedRowIdsByTab] = useState<Record<TabKey, number[]>>({ devices: [], accounts: [], sites: [] });
  const [searchByTab, setSearchByTab] = useState<Record<TabKey, string>>({ devices: '', accounts: '', sites: '' });

  const tableShellRef = useRef<HTMLDivElement | null>(null);
  const viewSettingsButtonRef = useRef<HTMLButtonElement | null>(null);

  function isRectVisible(rect: DOMRect | null) {
    if (!rect) return false;
    return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
  }

  function shouldIgnoreScrollTarget(target: EventTarget | null, ref: HTMLElement | null) {
    return !!(ref && target instanceof Node && ref.contains(target));
  }

  function clampPopoverPosition(
    anchorRect: DOMRect,
    popoverWidth: number,
    popoverHeight: number,
    margin: number,
    gap: number,
    alignLeft = false,
  ) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - anchorRect.bottom - margin;
    const spaceAbove = anchorRect.top - margin;
    const preferBelow = spaceBelow >= popoverHeight || spaceBelow >= spaceAbove;

    let left = alignLeft ? anchorRect.left : anchorRect.left + (anchorRect.width - popoverWidth) / 2;
    left = Math.min(Math.max(margin, left), viewportWidth - popoverWidth - margin);

    let top = preferBelow ? anchorRect.bottom + gap : anchorRect.top - popoverHeight - gap;
    if (top < margin) top = margin;
    if (top + popoverHeight > viewportHeight - margin) top = Math.max(margin, viewportHeight - popoverHeight - margin);

    return { left, top };
  }

  const [deviceColumnOrder, setDeviceColumnOrder] = useState<string[]>([
    'name', 'type', 'os', 'location', 'account', 'accountType', 'group', 'riskScore', 'status', 'lastConnected', 'createdTime', 'coverageGaps',
    ...buildSourceColumns('device').map((column) => column.id),
    'authRepo', 'nasSite', 'macVendor', 'manufacturer', 'model', 'applications', 'patches', 'processes', 'services',
    'peripherals', 'browser', 'browserExtensions', 'agentpVersion', 'riskViolations', 'nasIp', 'agentpLastReported',
  ]);
  const [accountColumnOrder, setAccountColumnOrder] = useState<string[]>([
    'name', 'accountType', 'group', 'deviceCount', 'blocked', 'lastLogin', 'coverageGaps',
    ...buildSourceColumns('account').map((column) => column.id),
    'authRepo', 'nasSite', 'location',
  ]);

  const [hiddenDeviceColumns, setHiddenDeviceColumns] = useState<string[]>([
    'authRepo', 'nasSite', 'macVendor', 'manufacturer', 'model', 'applications', 'patches', 'processes',
    'services', 'peripherals', 'browser', 'browserExtensions', 'agentpVersion', 'riskViolations', 'nasIp', 'agentpLastReported',
  ]);
  const [hiddenAccountColumns, setHiddenAccountColumns] = useState<string[]>(['authRepo', 'nasSite', 'location']);

  useEffect(() => {
    if (seeMoreOpenFor) {
      setTimeout(() => {
        popupSearchRef.current?.focus();
      }, 0);
    }
  }, [seeMoreOpenFor]);

  useEffect(() => {
    if (!toast) return;

    const timeoutId = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!seeMoreOpenFor && !columnPickerOpen) return;

    const tableShell = tableShellRef.current;

    const handleResize = () => {
      if (seeMoreOpenFor && seeMoreTriggerRef.current) {
        const rect = seeMoreTriggerRef.current.getBoundingClientRect();
        if (!isRectVisible(rect)) {
          setSeeMoreOpenFor(null);
          return;
        }
        const width = 580;
        const height = Math.min(window.innerHeight * 0.7, 440);
        const next = clampPopoverPosition(rect, width, height, 8, 6);
        setSeeMorePosition(next);
      }

      if (columnPickerOpen && columnPickerAnchorEl) {
        const rect = columnPickerAnchorEl.getBoundingClientRect();
        if (!isRectVisible(rect)) {
          setColumnPickerOpen(false);
        }
      }
    };

    const handleScroll = (event: Event) => {
      const target = event.target;

      if (shouldIgnoreScrollTarget(target, seeMoreMenuRef.current)) return;

      if (seeMoreOpenFor && seeMoreTriggerRef.current) {
        const rect = seeMoreTriggerRef.current.getBoundingClientRect();
        if (!isRectVisible(rect)) {
          setSeeMoreOpenFor(null);
          return;
        }
        const width = 580;
        const height = Math.min(window.innerHeight * 0.7, 440);
        setSeeMorePosition(clampPopoverPosition(rect, width, height, 8, 6));
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    tableShell?.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, { capture: true });
      tableShell?.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [columnPickerAnchorEl, columnPickerOpen, seeMoreOpenFor]);

  const accountRows = useMemo(() => computeAccountRows(), []);
  const deviceRowsForTable = useMemo(() => expandDeviceRows(devices, DEVICE_TARGET_ROW_COUNT), []);
  const accountRowsForTable = useMemo(() => expandAccountRows(accountRows, ACCOUNT_TARGET_ROW_COUNT), [accountRows]);

  const filteredDeviceRows = useMemo(
    () => applyDeviceFilters(deviceRowsForTable, deviceFilters),
    [deviceRowsForTable, deviceFilters]
  );

  const filteredAccountRows = useMemo(
    () => applyAccountFilters(accountRowsForTable, accountFilters),
    [accountRowsForTable, accountFilters]
  );

  const isDevices = tab === 'devices';
  const isAccounts = tab === 'accounts';
  const isSites = tab === 'sites';
  const activeDeviceFilters = deviceFilters;
  const activeAccountFilters = accountFilters;

  const deviceOptions = useMemo(() => {
    const byId = new Map<string, Option[]>();

    byId.set('deviceType', uniqSorted(devices.map((item) => item.type)).map(toOption));
    byId.set('os', uniqSorted(devices.map((item) => item.os)).map(toOption));
    byId.set('location', uniqSorted(devices.map((item) => item.location)).map(toOption));
    byId.set('accountType', uniqSorted(devices.map((item) => item.accountType)).map(toOption));
    byId.set('group', uniqSorted(devices.map((item) => item.group)).map(toOption));
    byId.set('riskScore', ['Access', 'Alert', 'Blocked'].map(toOption));
    byId.set('status', ['Blocked', 'Archived', 'No issues'].map(toOption));
    byId.set('lastConnected', TIME_BUCKET_OPTIONS);
    byId.set('manufacturer', uniqSorted(devices.map((item) => item.manufacturer)).map(toOption));
    byId.set('model', uniqSorted(devices.map((item) => item.model)).map(toOption));
    byId.set('createdTime', CREATED_BUCKET_OPTIONS);
    byId.set('authRepo', uniqSorted(devices.map((item) => item.authRepo ?? '').filter((value) => value !== '')).map(toOption));
    byId.set('nasSite', uniqSorted(devices.map((item) => item.nasSite)).map(toOption));
    byId.set('macVendor', uniqSorted(devices.map((item) => item.macVendor)).map(toOption));
    byId.set('nasIp', uniqSorted(devices.map((item) => item.nasIp)).map(toOption));
    byId.set('agentpLastReported', TIME_BUCKET_OPTIONS);
    byId.set('riskViolation', uniqSorted(devices.flatMap((item) => item.riskViolations as RiskViolation[])).map(toOption));
    byId.set('agentpVersion', uniqSorted(devices.map((item) => item.agentpVersion)).sort(compareVersionsNumeric).map(toOption));

    return byId;
  }, []);

  const accountOptions = useMemo(() => {
    const byId = new Map<string, Option[]>();

    byId.set('accountType', uniqSorted(accountRows.map((item) => item.accountType)).map(toOption));
    byId.set('group', uniqSorted(accountRows.map((item) => item.group)).map(toOption));
    byId.set('blocked', ['Blocked', 'Not blocked'].map(toOption));
    byId.set('devices', ACCOUNT_DEVICES_BUCKET_OPTIONS);
    byId.set('lastLogin', ACCOUNT_LAST_LOGIN_OPTIONS);
    byId.set('location', uniqSorted(accountRows.map((item) => item.location)).map(toOption));
    byId.set('authRepo', uniqSorted(accountRows.map((item) => item.authRepo ?? '').filter((value) => value !== '')).map(toOption));
    byId.set('nasSite', uniqSorted(accountRows.map((item) => item.nasSite)).map(toOption));

    return byId;
  }, [accountRows]);

  const onThisDeviceValueOptions = useMemo(() => {
    const map = new Map<OnThisDeviceCategory, Option[]>();

    map.set('applications', uniqSorted(devices.flatMap((item) => item.applications)).map(toOption));
    map.set('patches', uniqSorted(devices.flatMap((item) => item.patches)).map(toOption));
    map.set('processes', uniqSorted(devices.flatMap((item) => item.processes)).map(toOption));
    map.set('services', uniqSorted(devices.flatMap((item) => item.services)).map(toOption));
    map.set('peripherals', uniqSorted(devices.flatMap((item) => item.peripherals)).map(toOption));
    map.set('browser', uniqSorted(devices.flatMap((item) => item.browser)).map(toOption));
    map.set('browserExtensions', uniqSorted(devices.flatMap((item) => item.browserExtensions)).map(toOption));

    return map;
  }, []);

  const addedSectionIds = isDevices ? addedDeviceSections : addedAccountSections;

  const defaultSectionIds = isDevices ? DEVICE_DEFAULT_SECTION_IDS : ACCOUNT_DEFAULT_SECTION_IDS;
  const hiddenSectionIds = isDevices ? hiddenDeviceSections : hiddenAccountSections;
  const visibleSectionIds = [...defaultSectionIds, ...addedSectionIds].filter((id) => !hiddenSectionIds.includes(id));

  function getAllManageableSectionIds(entity: SavedViewEntity): string[] {
    const definitions = FILTER_SCHEMA.filter((item) => item.entities.includes(entity));
    return Array.from(new Set(definitions.map((item) => item.id)));
  }

  function clearFilterSectionValues(id: string) {
    if (isDevices) {
      safeSetDeviceFilters((prev) => {
        const next: DeviceFilterState = { ...prev };
        if ('deviceType' in next && id === 'deviceType') next.deviceType = [];
        if ('os' in next && id === 'os') next.os = [];
        if ('location' in next && id === 'location') next.location = [];
        if ('accountType' in next && id === 'accountType') next.accountType = [];
        if ('group' in next && id === 'group') next.group = [];
        if ('riskScore' in next && id === 'riskScore') next.riskScore = [];
        if ('status' in next && id === 'status') next.status = [];
        if ('lastConnected' in next && id === 'lastConnected') next.lastConnected = [];
        if ('sourceCoverage' in next && id === 'sourceCoverage') next.sourceCoverage = [];
        if ('manufacturer' in next && id === 'manufacturer') next.manufacturer = [];
        if ('model' in next && id === 'model') next.model = [];
        if ('createdTime' in next && id === 'createdTime') next.createdTime = [];
        if ('authRepo' in next && id === 'authRepo') next.authRepo = [];
        if ('nasSite' in next && id === 'nasSite') next.nasSite = [];
        if ('macVendor' in next && id === 'macVendor') next.macVendor = [];
        if ('nasIp' in next && id === 'nasIp') next.nasIp = [];
        if ('agentpLastReported' in next && id === 'agentpLastReported') next.agentpLastReported = [];
        if ('riskViolation' in next && id === 'riskViolation') next.riskViolation = [];
        if ('onThisDevice' in next && id === 'onThisDevice') next.onThisDevice = [];
        if ('agentpVersion' in next && id === 'agentpVersion') next.agentpVersion = [];
        if ('agentpVersionOlderThan' in next && id === 'agentpVersion') next.agentpVersionOlderThan = null;
        return next;
      });
      return;
    }

    safeSetAccountFilters((prev) => {
      const next: AccountFilterState = { ...prev };
      if ('accountType' in next && id === 'accountType') next.accountType = [];
      if ('group' in next && id === 'group') next.group = [];
      if ('blocked' in next && id === 'blocked') next.blocked = [];
      if ('devices' in next && id === 'devices') next.devices = [];
      if ('lastLogin' in next && id === 'lastLogin') next.lastLogin = [];
      if ('sourceCoverage' in next && id === 'sourceCoverage') next.sourceCoverage = [];
      if ('location' in next && id === 'location') next.location = [];
      if ('authRepo' in next && id === 'authRepo') next.authRepo = [];
      if ('nasSite' in next && id === 'nasSite') next.nasSite = [];
      return next;
    });
  }

  const safeSetDeviceFilters = useCallback((updater: React.SetStateAction<DeviceFilterState>) => {
    setSelectedRowIdsByTab((prev) => ({ ...prev, [tab]: [] }));
    setDeviceFilters(updater);
  }, [tab]);

  const safeSetAccountFilters = useCallback((updater: React.SetStateAction<AccountFilterState>) => {
    setSelectedRowIdsByTab((prev) => ({ ...prev, [tab]: [] }));
    setAccountFilters(updater);
  }, [tab]);

  const chips = useMemo(() => {
    const result: Chip[] = [];

    if (isDevices) {
      const pushArrayChip = (id: keyof DeviceFilterState, label: string) => {
        const values = activeDeviceFilters[id] as string[] | undefined;
        if (!values || values.length === 0) return;

        result.push({
          id: String(id),
          text: `${label}: ${values.join(', ')}`,
          remove: () => {
            safeSetDeviceFilters((prev) => ({ ...prev, [id]: [] }));
          },
        });
      };

      pushArrayChip('deviceType', 'Device type');
      pushArrayChip('os', 'OS');
      pushArrayChip('location', 'Location');
      pushArrayChip('accountType', 'Account type');
      pushArrayChip('group', 'Group');
      pushArrayChip('riskScore', 'Risk score');
      pushArrayChip('status', 'Status');
      pushArrayChip('lastConnected', 'Last connected');
      pushArrayChip('manufacturer', 'Device manufacturer');
      pushArrayChip('model', 'Device model');
      pushArrayChip('createdTime', 'Created time');
      pushArrayChip('authRepo', 'Authentication repository');
      pushArrayChip('nasSite', 'NAS site');
      pushArrayChip('macVendor', 'MAC vendor');
      pushArrayChip('nasIp', 'NAS IP');
      pushArrayChip('agentpLastReported', 'AgentP last reported');
      pushArrayChip('riskViolation', 'Risk score violation');
      pushArrayChip('agentpVersion', 'AgentP version');

      if (activeDeviceFilters.agentpVersionOlderThan) {
        result.push({
          id: 'agentpVersionOlderThan',
          text: `AgentP version: older than ${activeDeviceFilters.agentpVersionOlderThan}`,
          remove: () => {
            safeSetDeviceFilters((prev) => ({ ...prev, agentpVersionOlderThan: null }));
          },
        });
      }

      (activeDeviceFilters.sourceCoverage ?? []).forEach((condition, index) => {
        if (!condition.source || !condition.status) return;

        result.push({
          id: `sourceCoverage-${index}`,
          text: `${condition.source} is ${condition.status}`,
          remove: () => {
            safeSetDeviceFilters((prev) => ({
              ...prev,
              sourceCoverage: (prev.sourceCoverage ?? []).filter((_, idx) => idx !== index),
            }));
          },
        });
      });

      (activeDeviceFilters.onThisDevice ?? []).forEach((condition, index) => {
        if (!condition.category || !condition.value) return;

        const categoryLabel = ON_THIS_DEVICE_CATEGORIES.find((item) => item.value === condition.category)?.label ?? condition.category;
        result.push({
          id: `onThisDevice-${index}`,
          text: `${categoryLabel}: ${condition.value}`,
          remove: () => {
            safeSetDeviceFilters((prev) => ({
              ...prev,
              onThisDevice: (prev.onThisDevice ?? []).filter((_, idx) => idx !== index),
            }));
          },
        });
      });
    } else {
      const pushArrayChip = (id: keyof AccountFilterState, label: string) => {
        const values = activeAccountFilters[id] as string[] | undefined;
        if (!values || values.length === 0) return;

        result.push({
          id: String(id),
          text: `${label}: ${values.join(', ')}`,
          remove: () => {
            safeSetAccountFilters((prev) => ({ ...prev, [id]: [] }));
          },
        });
      };

      pushArrayChip('accountType', 'Account type');
      pushArrayChip('group', 'Group');
      pushArrayChip('blocked', 'Blocked');
      pushArrayChip('devices', 'Devices');
      pushArrayChip('lastLogin', 'Last login');
      pushArrayChip('location', 'Location');
      pushArrayChip('authRepo', 'Authentication repository');
      pushArrayChip('nasSite', 'NAS site');

      (activeAccountFilters.sourceCoverage ?? []).forEach((condition, index) => {
        if (!condition.source || !condition.status) return;

        result.push({
          id: `sourceCoverage-${index}`,
          text: `${condition.source} is ${condition.status}`,
          remove: () => {
            safeSetAccountFilters((prev) => ({
              ...prev,
              sourceCoverage: (prev.sourceCoverage ?? []).filter((_, idx) => idx !== index),
            }));
          },
        });
      });
    }

    return result;
  }, [
    isDevices,
    activeDeviceFilters,
    activeAccountFilters,
    safeSetDeviceFilters,
    safeSetAccountFilters,
  ]);

  const visibleChips = expandedChipList ? chips : chips.slice(0, 5);

  const hiddenChipCount = chips.length - visibleChips.length;


  function setChecklistValues(id: string, values: string[]) {
    if (isDevices) {
      safeSetDeviceFilters((prev) => ({ ...prev, [id]: values }));
      return;
    }

    safeSetAccountFilters((prev) => ({ ...prev, [id]: values }));
  }

  function getChecklistValues(id: string): string[] {
    if (isDevices) {
      const value = activeDeviceFilters[id as keyof DeviceFilterState];
      return Array.isArray(value) ? (value as string[]) : [];
    }

    const value = activeAccountFilters[id as keyof AccountFilterState];
    return Array.isArray(value) ? (value as string[]) : [];
  }

  function getOptionsForSection(id: string): Option[] {
    if (isDevices) {
      return deviceOptions.get(id) ?? [];
    }

    return accountOptions.get(id) ?? [];
  }

  function toggleChecklistValue(id: string, optionValue: string) {
    const current = getChecklistValues(id);
    const exists = current.includes(optionValue);
    const next = exists ? current.filter((item) => item !== optionValue) : [...current, optionValue];
    setChecklistValues(id, next);
  }

  function openSeeMore(sectionId: string, trigger: HTMLButtonElement) {
    seeMoreTriggerRef.current = trigger;
    const rect = trigger.getBoundingClientRect();
    setSeeMorePosition(clampPopoverPosition(rect, 580, Math.min(window.innerHeight * 0.7, 440), 8, 6));
    setSeeMoreOpenFor(sectionId);
    setSeeMoreQuery('');
    setSeeMoreDraftValues(getChecklistValues(sectionId));
  }

  function closeSeeMore() {
    setSeeMoreOpenFor(null);
    setSeeMoreQuery('');
    setSeeMoreDraftValues([]);
    setTimeout(() => {
      seeMoreTriggerRef.current?.focus();
    }, 0);
  }

  function clearAllFilters() {
    if (isDevices) {
      safeSetDeviceFilters(defaultDeviceFilters());
      return;
    }

    safeSetAccountFilters(defaultAccountFilters());
  }

  function renderChecklistSection(sectionId: string) {
    const label = findSectionLabel(isDevices ? 'devices' : 'accounts', sectionId);
    const selectedValues = getChecklistValues(sectionId);
    const options = getOptionsForSection(sectionId);

    const showSeeMore = options.length > 5;
    const quickOptions = showSeeMore ? options.slice(0, 5) : options;

    return (
      <details className={styles.section} key={sectionId}>
        <summary className={styles.sectionSummary}>
          {label}
          {selectedValues.length > 0 ? <span className={styles.countBadge}>{selectedValues.length}</span> : null}
        </summary>
        <div className={styles.sectionBody}>
          {quickOptions.map((option) => (
            <label className={styles.optionRow} key={option.value}>
              <input
                checked={selectedValues.includes(option.value)}
                onChange={() => toggleChecklistValue(sectionId, option.value)}
                type="checkbox"
              />
              {option.label}
            </label>
          ))}
          {showSeeMore ? (
            <button
              className={`${styles.linkBtn} ${styles.smallLink}`}
              onClick={(event) => openSeeMore(sectionId, event.currentTarget)}
              type="button"
            >
              See more
            </button>
          ) : null}
        </div>
      </details>
    );
  }

  function renderSourceCoverageSection() {
    const label = 'Source coverage';
    const conditions = isDevices
      ? (activeDeviceFilters.sourceCoverage ?? [])
      : (activeAccountFilters.sourceCoverage ?? []);

    const open = isDevices ? sourceCoverageOpenDevice : sourceCoverageOpenAccount;

    const setOpen = isDevices ? setSourceCoverageOpenDevice : setSourceCoverageOpenAccount;

    return (
      <details className={styles.section} key="sourceCoverage" open={open} onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}>
        <summary className={styles.sectionSummary}>
          {label}
          {conditions.filter((item) => item.source && item.status).length > 0 ? (
            <span className={styles.countBadge}>{conditions.filter((item) => item.source && item.status).length}</span>
          ) : null}
        </summary>
        <div className={styles.sectionBody}>
          {conditions.map((condition, index) => (
            <div className={styles.conditionRow} key={`coverage-${index}`}>
              <select
                aria-label="Source"
                className={styles.select}
                onChange={(event) => {
                  const source = event.target.value || null;
                  if (isDevices) {
                    safeSetDeviceFilters((prev) => {
                      const next = [...(prev.sourceCoverage ?? [])];
                      next[index] = { ...next[index], source: source as SourceName | null };
                      return { ...prev, sourceCoverage: next };
                    });
                  } else {
                    safeSetAccountFilters((prev) => {
                      const next = [...(prev.sourceCoverage ?? [])];
                      next[index] = { ...next[index], source: source as SourceName | null };
                      return { ...prev, sourceCoverage: next };
                    });
                  }
                }}
                value={condition.source ?? ''}
              >
                <option value="">Source</option>
                {SOURCE_OPTIONS.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>

              <div className={styles.conditionInline}>
                <select
                  aria-label="Status"
                  className={styles.select}
                  onChange={(event) => {
                    const status = (event.target.value || null) as SourceCoverageConditionStatus | null;
                    if (isDevices) {
                      safeSetDeviceFilters((prev) => {
                        const next = [...(prev.sourceCoverage ?? [])];
                        next[index] = { ...next[index], status };
                        return { ...prev, sourceCoverage: next };
                      });
                    } else {
                      safeSetAccountFilters((prev) => {
                        const next = [...(prev.sourceCoverage ?? [])];
                        next[index] = { ...next[index], status };
                        return { ...prev, sourceCoverage: next };
                      });
                    }
                  }}
                  value={condition.status ?? ''}
                >
                  <option value="">Status</option>
                  {(isDevices ? DEVICE_SOURCE_STATUS_OPTIONS : ACCOUNT_SOURCE_STATUS_OPTIONS).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button
                  aria-label="Remove condition"
                  className={styles.removeCondition}
                  onClick={() => {
                    if (isDevices) {
                      safeSetDeviceFilters((prev) => ({
                        ...prev,
                        sourceCoverage: (prev.sourceCoverage ?? []).filter((_, idx) => idx !== index),
                      }));
                    } else {
                      safeSetAccountFilters((prev) => ({
                        ...prev,
                        sourceCoverage: (prev.sourceCoverage ?? []).filter((_, idx) => idx !== index),
                      }));
                    }
                  }}
                  type="button"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          <button
            className={`${styles.linkBtn} ${styles.smallLink}`}
            onClick={() => {
              if (isDevices) {
                safeSetDeviceFilters((prev) => ({
                  ...prev,
                  sourceCoverage: [...(prev.sourceCoverage ?? []), { source: null, status: null }],
                }));
              } else {
                safeSetAccountFilters((prev) => ({
                  ...prev,
                  sourceCoverage: [...(prev.sourceCoverage ?? []), { source: null, status: null }],
                }));
              }
            }}
            type="button"
          >
            + Add condition
          </button>
        </div>
      </details>
    );
  }

  function renderOnThisDeviceSection() {
    const rows = activeDeviceFilters.onThisDevice ?? [];

    return (
      <details className={styles.section} key="onThisDevice" open={onThisDeviceOpen} onToggle={(event) => setOnThisDeviceOpen((event.currentTarget as HTMLDetailsElement).open)}>
        <summary className={styles.sectionSummary}>
          On this device
          {rows.filter((row) => row.category && row.value).length > 0 ? (
            <span className={styles.countBadge}>{rows.filter((row) => row.category && row.value).length}</span>
          ) : null}
        </summary>
        <div className={styles.sectionBody}>
          {rows.map((row, index) => (
            <div className={styles.conditionRow} key={`otd-${index}`}>
              <select
                aria-label="Category"
                className={styles.select}
                onChange={(event) => {
                  const category = (event.target.value || null) as OnThisDeviceCategory | null;
                  safeSetDeviceFilters((prev) => {
                    const next = [...(prev.onThisDevice ?? [])];
                    next[index] = { category, value: null };
                    return { ...prev, onThisDevice: next };
                  });
                }}
                value={row.category ?? ''}
              >
                <option value="">Category</option>
                {ON_THIS_DEVICE_CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>

              <div className={styles.conditionInline}>
                <select
                  aria-label="Value"
                  className={styles.select}
                  disabled={!row.category}
                  onChange={(event) => {
                    const value = event.target.value || null;
                    safeSetDeviceFilters((prev) => {
                      const next = [...(prev.onThisDevice ?? [])];
                      next[index] = { ...next[index], value };
                      return { ...prev, onThisDevice: next };
                    });
                  }}
                  value={row.value ?? ''}
                >
                  <option value="">Value</option>
                  {(row.category ? onThisDeviceValueOptions.get(row.category) : [])?.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button
                  aria-label="Remove condition"
                  className={styles.removeCondition}
                  onClick={() => {
                    safeSetDeviceFilters((prev) => ({
                      ...prev,
                      onThisDevice: (prev.onThisDevice ?? []).filter((_, idx) => idx !== index),
                    }));
                  }}
                  type="button"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          <button
            className={`${styles.linkBtn} ${styles.smallLink}`}
            onClick={() => {
              safeSetDeviceFilters((prev) => ({
                ...prev,
                onThisDevice: [...(prev.onThisDevice ?? []), { category: null, value: null }],
              }));
            }}
            type="button"
          >
            + Add condition
          </button>
        </div>
      </details>
    );
  }

  function renderAgentpVersionSection() {
    const versions = deviceOptions.get('agentpVersion') ?? [];
    const selected = activeDeviceFilters.agentpVersion ?? [];

    return (
      <details className={styles.section} key="agentpVersion">
        <summary className={styles.sectionSummary}>
          AgentP version
          {selected.length > 0 || activeDeviceFilters.agentpVersionOlderThan ? (
            <span className={styles.countBadge}>{selected.length + (activeDeviceFilters.agentpVersionOlderThan ? 1 : 0)}</span>
          ) : null}
        </summary>
        <div className={styles.sectionBody}>
          {versions.slice(0, 5).map((option) => (
            <label className={styles.optionRow} key={option.value}>
              <input
                checked={selected.includes(option.value)}
                onChange={() => toggleChecklistValue('agentpVersion', option.value)}
                type="checkbox"
              />
              {option.label}
            </label>
          ))}
          {versions.length > 5 ? (
            <button
              className={`${styles.linkBtn} ${styles.smallLink}`}
              onClick={(event) => openSeeMore('agentpVersion', event.currentTarget)}
              type="button"
            >
              See more
            </button>
          ) : null}

          <div className={styles.sectionSummary}>Older than</div>
          <select
            aria-label="Older than"
            className={styles.select}
            onChange={(event) => {
              const value = event.target.value || null;
              safeSetDeviceFilters((prev) => ({ ...prev, agentpVersionOlderThan: value }));
            }}
            value={activeDeviceFilters.agentpVersionOlderThan ?? ''}
          >
            <option value="">Any version</option>
            {versions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </details>
    );
  }

  function renderSection(id: string) {
    if (id === 'sourceCoverage') return renderSourceCoverageSection();
    if (id === 'onThisDevice' && isDevices) return renderOnThisDeviceSection();
    if (id === 'agentpVersion' && isDevices) return renderAgentpVersionSection();
    return renderChecklistSection(id);
  }

  const filterCount = chips.length;

  function openManageFilters() {
    setManageFiltersOpen(true);
  }

  function applyManageFilters(nextIds: string[]) {
    const entity = isDevices ? 'devices' : 'accounts';
    const all = getAllManageableSectionIds(entity);
    const nextVisible = new Set(nextIds);
    const hiddenNext = all.filter((id) => !nextVisible.has(id));
    const defaultSet = new Set<string>(defaultSectionIds as readonly string[]);
    const currentAdded = new Set(addedSectionIds);
    const addableNext = [
      ...addedSectionIds.filter((id) => nextVisible.has(id) && !defaultSet.has(id)),
      ...all.filter((id) => !defaultSet.has(id) && nextVisible.has(id) && !currentAdded.has(id)),
    ];

    if (isDevices) {
      setHiddenDeviceSections(hiddenNext);
      setAddedDeviceSections(addableNext);
    } else {
      setHiddenAccountSections(hiddenNext);
      setAddedAccountSections(addableNext);
    }

    all.forEach((id) => {
      if (!nextVisible.has(id)) {
        clearFilterSectionValues(id);
      }
    });
  }

  const deviceColumns = useMemo<TableColumn<DeviceRecord>[]>(() => {
    const sourceColumns = buildSourceColumns('device').map(({ id, label }) => ({
      id,
      label,
      defaultVisible: true,
      render: (row: DeviceRecord) => {
        const status = row.sourceCoverage[id.slice('source:'.length) as SourceName]?.status ?? 'N/A';
        return <StatusPill kind="device" status={status} />;
      },
      exportValue: (row: DeviceRecord) => row.sourceCoverage[id.slice('source:'.length) as SourceName]?.status ?? 'N/A',
    }));

    return [
      { id: 'name', label: 'Device name', fixed: true, defaultVisible: true, render: (row) => <strong>{row.name}</strong>, exportValue: (row) => row.name },
      { id: 'type', label: 'Type', defaultVisible: true, render: (row) => row.type, exportValue: (row) => row.type },
      { id: 'os', label: 'OS', defaultVisible: true, render: (row) => row.os, exportValue: (row) => row.os },
      { id: 'location', label: 'Location', defaultVisible: true, render: (row) => row.location, exportValue: (row) => row.location },
      { id: 'account', label: 'Account', defaultVisible: true, render: (row) => row.account, exportValue: (row) => row.account },
      { id: 'accountType', label: 'Account type', defaultVisible: true, render: (row) => row.accountType, exportValue: (row) => row.accountType },
      { id: 'group', label: 'Group', defaultVisible: true, render: (row) => row.group, exportValue: (row) => row.group },
      { id: 'riskScore', label: 'Risk score', defaultVisible: true, render: (row) => `${row.riskScore} (${riskBand(row.riskScore)})`, exportValue: (row) => `${row.riskScore}` },
      { id: 'status', label: 'Status', defaultVisible: true, render: (row) => row.status, exportValue: (row) => row.status },
      { id: 'lastConnected', label: 'Last connected', defaultVisible: true, render: (row) => formatRelativeTime(row.lastConnectedAt), exportValue: (row) => row.lastConnectedAt },
      { id: 'createdTime', label: 'Created time', defaultVisible: true, render: (row) => formatRelativeTime(row.createdAt), exportValue: (row) => row.createdAt },
      { id: 'coverageGaps', label: 'Coverage gaps', defaultVisible: true, render: (row) => formatCoverageGapsFromSourceCoverage(row), exportValue: (row) => row.coverageGaps.length > 0 ? row.coverageGaps.join(', ') : 'None' },
      ...sourceColumns,
      { id: 'authRepo', label: 'Authentication repository', defaultVisible: false, render: (row) => row.authRepo ?? '—', exportValue: (row) => row.authRepo ?? '—' },
      { id: 'nasSite', label: 'NAS site', defaultVisible: false, render: (row) => row.nasSite, exportValue: (row) => row.nasSite },
      { id: 'macVendor', label: 'MAC vendor', defaultVisible: false, render: (row) => row.macVendor, exportValue: (row) => row.macVendor },
      { id: 'manufacturer', label: 'Device manufacturer', defaultVisible: false, render: (row) => row.manufacturer, exportValue: (row) => row.manufacturer },
      { id: 'model', label: 'Device model', defaultVisible: false, render: (row) => row.model, exportValue: (row) => row.model },
      { id: 'applications', label: 'Applications', defaultVisible: false, render: (row) => renderListValues(row.applications), exportValue: (row) => row.applications.length > 0 ? row.applications.join(', ') : '—' },
      { id: 'patches', label: 'Patches', defaultVisible: false, render: (row) => renderListValues(row.patches), exportValue: (row) => row.patches.length > 0 ? row.patches.join(', ') : '—' },
      { id: 'processes', label: 'Processes', defaultVisible: false, render: (row) => renderListValues(row.processes), exportValue: (row) => row.processes.length > 0 ? row.processes.join(', ') : '—' },
      { id: 'services', label: 'Services', defaultVisible: false, render: (row) => renderListValues(row.services), exportValue: (row) => row.services.length > 0 ? row.services.join(', ') : '—' },
      { id: 'peripherals', label: 'Peripherals', defaultVisible: false, render: (row) => renderListValues(row.peripherals), exportValue: (row) => row.peripherals.length > 0 ? row.peripherals.join(', ') : '—' },
      { id: 'browser', label: 'Browser', defaultVisible: false, render: (row) => renderListValues(row.browser), exportValue: (row) => row.browser.length > 0 ? row.browser.join(', ') : '—' },
      { id: 'browserExtensions', label: 'Browser extensions', defaultVisible: false, render: (row) => renderListValues(row.browserExtensions), exportValue: (row) => row.browserExtensions.length > 0 ? row.browserExtensions.join(', ') : '—' },
      { id: 'agentpVersion', label: 'AgentP version', defaultVisible: false, render: (row) => row.agentpVersion, exportValue: (row) => row.agentpVersion },
      { id: 'riskViolations', label: 'Risk score violations', defaultVisible: false, render: (row) => renderListValues(row.riskViolations), exportValue: (row) => row.riskViolations.length > 0 ? row.riskViolations.join(', ') : '—' },
      { id: 'nasIp', label: 'NAS IP', defaultVisible: false, render: (row) => row.nasIp, exportValue: (row) => row.nasIp },
      { id: 'agentpLastReported', label: 'AgentP last reported', defaultVisible: false, render: (row) => formatRelativeTime(row.agentpLastReported), exportValue: (row) => row.agentpLastReported },
    ];
  }, []);

  const accountColumns = useMemo<TableColumn<AccountFilterRow>[]>(() => {
    const sourceColumns = buildSourceColumns('account').map(({ id, label }) => ({
      id,
      label,
      defaultVisible: true,
      render: (row: AccountFilterRow) => {
        const status = row.sourceCoverage[id.slice('source:'.length) as SourceName]?.status ?? 'N/A';
        return <StatusPill kind="account" status={status} />;
      },
      exportValue: (row: AccountFilterRow) => row.sourceCoverage[id.slice('source:'.length) as SourceName]?.status ?? 'N/A',
    }));

    return [
      { id: 'name', label: 'Account name', fixed: true, defaultVisible: true, render: (row) => <strong>{row.name}</strong>, exportValue: (row) => row.name },
      { id: 'accountType', label: 'Account type', defaultVisible: true, render: (row) => row.accountType, exportValue: (row) => row.accountType },
      { id: 'group', label: 'Group', defaultVisible: true, render: (row) => row.group, exportValue: (row) => row.group },
      { id: 'deviceCount', label: 'Devices', defaultVisible: true, render: (row) => row.deviceCount ?? 0, exportValue: (row) => `${row.deviceCount ?? 0}` },
      { id: 'blocked', label: 'Blocked', defaultVisible: true, render: (row) => (row.blocked ? 'Blocked' : 'Not blocked'), exportValue: (row) => (row.blocked ? 'Blocked' : 'Not blocked') },
      { id: 'lastLogin', label: 'Last login', defaultVisible: true, render: (row) => (row.lastLoginDays == null ? '—' : row.lastLoginDays === 0 ? 'Today' : `${row.lastLoginDays}d ago`), exportValue: (row) => row.lastLoginDays == null ? '—' : `${row.lastLoginDays}` },
      { id: 'coverageGaps', label: 'Coverage gaps', defaultVisible: true, render: (row) => formatCoverageGapsFromSourceCoverage(row), exportValue: (row) => formatCoverageGapsFromSourceCoverage(row) },
      ...sourceColumns,
      { id: 'authRepo', label: 'Authentication repository', defaultVisible: false, render: (row) => row.authRepo ?? '—', exportValue: (row) => row.authRepo ?? '—' },
      { id: 'nasSite', label: 'NAS site', defaultVisible: false, render: (row) => row.nasSite, exportValue: (row) => row.nasSite },
      { id: 'location', label: 'Location', defaultVisible: false, render: (row) => row.location, exportValue: (row) => row.location },
    ];
  }, []);

  const rows = isDevices ? filteredDeviceRows : filteredAccountRows;
  const activeSort = isDevices ? sortByTab.devices : sortByTab.accounts;
  const searchQuery = searchByTab[tab].trim().toLowerCase();
  const searchedRows = useMemo(() => {
    if (!searchQuery) return rows;

    if (isDevices) {
      return (rows as DeviceRecord[]).filter((row) => {
        const haystack = [row.name, row.account, row.os, row.location, row.group].join(' ').toLowerCase();
        return haystack.includes(searchQuery);
      });
    }

    return (rows as AccountFilterRow[]).filter((row) => {
      const haystack = [row.name, row.group].join(' ').toLowerCase();
      return haystack.includes(searchQuery);
    });
  }, [rows, searchQuery, isDevices]);
  const sortedRows = useMemo(() => {
    if (isDevices) {
      return sortRowsBy(searchedRows as DeviceRecord[], activeSort, deviceSortValue);
    }

    return sortRowsBy(searchedRows as AccountFilterRow[], activeSort, accountSortValue);
  }, [searchedRows, activeSort, isDevices]);
  const activeColumns = isDevices ? (deviceColumns as TableColumn<AnyRow>[]) : (accountColumns as TableColumn<AnyRow>[]);
  const activeOrder = isDevices ? deviceColumnOrder : accountColumnOrder;
  const activeHidden = isDevices ? hiddenDeviceColumns : hiddenAccountColumns;

  const columnsById = new Map(activeColumns.map((column) => [column.id, column]));
  const orderedColumns = activeOrder
    .map((id) => columnsById.get(id))
    .filter((column): column is TableColumn<AnyRow> => Boolean(column));
  const visibleColumns = orderedColumns.filter((column) => !activeHidden.includes(column.id));

  const selectedRowIds = selectedRowIdsByTab[tab];
  const pageSize = pageSizeByTab[tab];
  const totalRows = sortedRows.length;
  const totalPages = Math.max(1, pageSize === -1 ? 1 : Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(pageByTab[tab], totalPages - 1);
  const startIndex = pageSize === -1 ? 0 : currentPage * pageSize;
  const endIndex = pageSize === -1 ? totalRows : Math.min(totalRows, startIndex + pageSize);
  const pagedRows = sortedRows.slice(startIndex, endIndex);
  const pageIds = pagedRows.map((row) => row.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedRowIds.includes(id));
  const selectionBannerState = getSelectionBannerState({
    selectedIds: selectedRowIds,
    pageIds,
    totalMatchingIds: sortedRows.map((row) => row.id),
  });

  const activeView = activeViewByTab[tab];
  const activeSavedView = savedViewsByTab[tab].find((savedView) => savedView.id === activeView) ?? null;
  const activeSavedViewName = activeSavedView?.name ?? null;

  const pickerColumns: ColumnPickerItem[] = activeColumns.map((column) => ({
    id: column.id,
    label: column.label,
    fixed: column.fixed,
  }));

  function cloneJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  function getDefaultHiddenColumns(entity: SavedViewEntity): string[] {
    const columns = entity === 'devices' ? deviceColumns : accountColumns;
    return columns.filter((column) => !column.defaultVisible).map((column) => column.id);
  }

  function getCaasmHiddenColumns(entity: SavedViewEntity): string[] {
    const defaults = getDefaultHiddenColumns(entity);
    const extras = entity === 'devices' ? DEVICE_CAASM_HIDDEN_COLUMNS : ACCOUNT_CAASM_HIDDEN_COLUMNS;
    return Array.from(new Set([...defaults, ...extras]));
  }

  function buildSnapshot(entity: SavedViewEntity): SavedViewSnapshot {
    const currentFilters = entity === 'devices' ? deviceFilters : accountFilters;
    const currentAddedSections = entity === 'devices' ? addedDeviceSections : addedAccountSections;
    const currentHiddenSections = entity === 'devices' ? hiddenDeviceSections : hiddenAccountSections;
    const currentOrder = entity === 'devices' ? deviceColumnOrder : accountColumnOrder;
    const currentHidden = entity === 'devices' ? hiddenDeviceColumns : hiddenAccountColumns;
    const currentSort = entity === 'devices' ? sortByTab.devices : sortByTab.accounts;

    return {
      filters: cloneJson(currentFilters),
      addedSections: [...currentAddedSections],
      hiddenSections: [...currentHiddenSections],
      columns: {
        hidden: [...currentHidden],
        order: [...currentOrder],
      },
      sort: cloneJson(currentSort),
    };
  }

  const currentSnapshot = isSites ? null : buildSnapshot(tab);

  const activeViewSavedAndUnchanged = !isSites && activeSavedView && currentSnapshot
    ? isSavedViewUnchanged(activeSavedView, currentSnapshot)
    : false;

  function applySnapshot(entity: SavedViewEntity, snapshot: SavedViewSnapshot) {
    if (entity === 'devices') {
      safeSetDeviceFilters(snapshot.filters as DeviceFilterState);
      setAddedDeviceSections([...snapshot.addedSections]);
      setHiddenDeviceSections(snapshot.hiddenSections ?? []);
      setDeviceColumnOrder([...snapshot.columns.order]);
      setHiddenDeviceColumns([...snapshot.columns.hidden]);
      setSortByTab((prev) => ({ ...prev, devices: snapshot.sort }));
      setPageByTab((prev) => ({ ...prev, devices: 0 }));
      setSelectedRowIdsByTab((prev) => ({ ...prev, devices: [] }));
      return;
    }

    safeSetAccountFilters(snapshot.filters as AccountFilterState);
    setAddedAccountSections([...snapshot.addedSections]);
    setHiddenAccountSections(snapshot.hiddenSections ?? []);
    setAccountColumnOrder([...snapshot.columns.order]);
    setHiddenAccountColumns([...snapshot.columns.hidden]);
    setSortByTab((prev) => ({ ...prev, accounts: snapshot.sort }));
    setPageByTab((prev) => ({ ...prev, accounts: 0 }));
    setSelectedRowIdsByTab((prev) => ({ ...prev, accounts: [] }));
  }

  function resetToBuiltIn(entity: SavedViewEntity, baseView: SavedViewBase) {
    const order = (entity === 'devices' ? deviceColumns : accountColumns).map((column) => column.id);
    const hidden = baseView === 'caasm' ? getCaasmHiddenColumns(entity) : getDefaultHiddenColumns(entity);

    if (entity === 'devices') {
      safeSetDeviceFilters(defaultDeviceFilters());
      setAddedDeviceSections([]);
      setHiddenDeviceSections([]);
      setDeviceColumnOrder(order);
      setHiddenDeviceColumns(hidden);
      setSortByTab((prev) => ({
        ...prev,
        devices: baseView === 'caasm' ? CAASM_SORT_BY_TAB.devices : DEFAULT_SORT_BY_TAB.devices,
      }));
      setPageByTab((prev) => ({ ...prev, devices: 0 }));
      setSelectedRowIdsByTab((prev) => ({ ...prev, devices: [] }));
      return;
    }

    safeSetAccountFilters(defaultAccountFilters());
    setAddedAccountSections([]);
    setHiddenAccountSections([]);
    setAccountColumnOrder(order);
    setHiddenAccountColumns(hidden);
    setSortByTab((prev) => ({
      ...prev,
      accounts: baseView === 'caasm' ? CAASM_SORT_BY_TAB.accounts : DEFAULT_SORT_BY_TAB.accounts,
    }));
    setPageByTab((prev) => ({ ...prev, accounts: 0 }));
    setSelectedRowIdsByTab((prev) => ({ ...prev, accounts: [] }));
  }

  function selectView(entity: SavedViewEntity, viewKey: ActiveViewKey) {
    if (viewKey === 'default' || viewKey === 'caasm') {
      resetToBuiltIn(entity, viewKey);
      setActiveViewByTab((prev) => ({ ...prev, [entity]: viewKey }));
      return;
    }

    const target = savedViewsByTab[entity].find((savedView) => savedView.id === viewKey);
    if (!target) return;

    applySnapshot(entity, target);
    setActiveViewByTab((prev) => ({ ...prev, [entity]: target.id }));
  }

  function setColumnVisibility(columnId: string, visible: boolean) {
    if (isDevices) {
      setHiddenDeviceColumns((prev) => {
        const hidden = prev.includes(columnId);
        if (visible && hidden) return prev.filter((id) => id !== columnId);
        if (!visible && !hidden) return [...prev, columnId];
        return prev;
      });
      return;
    }

    setHiddenAccountColumns((prev) => {
      const hidden = prev.includes(columnId);
      if (visible && hidden) return prev.filter((id) => id !== columnId);
      if (!visible && !hidden) return [...prev, columnId];
      return prev;
    });
  }

  function moveColumn(columnId: string, direction: -1 | 1) {
    const setOrder = isDevices ? setDeviceColumnOrder : setAccountColumnOrder;
    const fixedFirstColumnId = isDevices ? 'name' : 'name';
    setOrder((prev) => {
      const from = prev.indexOf(columnId);
      if (from < 0) return prev;
      if (fixedFirstColumnId && from === 0) return prev;

      const nextIndex = Math.max(
        fixedFirstColumnId ? 1 : 0,
        Math.min(from + direction, prev.length - 1)
      );

      return moveColumnById(prev, columnId, nextIndex, fixedFirstColumnId);
    });
  }

  function reorderColumn(columnId: string, targetColumnId: string) {
    const setOrder = isDevices ? setDeviceColumnOrder : setAccountColumnOrder;
    const fixedFirstColumnId = isDevices ? 'name' : 'name';
    setOrder((prev) => {
      const from = prev.indexOf(columnId);
      const target = prev.indexOf(targetColumnId);
      if (from < 0 || target < 0) return prev;
      if (fixedFirstColumnId && (from === 0 || target === 0)) return prev;
      return moveColumnById(prev, columnId, target, fixedFirstColumnId);
    });
  }

  function resetColumnsToDefault() {
    if (isDevices) {
      setDeviceColumnOrder(deviceColumns.map((column) => column.id));
      setHiddenDeviceColumns(deviceColumns.filter((column) => !column.defaultVisible).map((column) => column.id));
      return;
    }

    setAccountColumnOrder(accountColumns.map((column) => column.id));
    setHiddenAccountColumns(accountColumns.filter((column) => !column.defaultVisible).map((column) => column.id));
  }

  function toggleRowSelection(id: number) {
    setSelectedRowIdsByTab((prev) => {
      const current = prev[tab];
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      return { ...prev, [tab]: next };
    });
  }

  function togglePageSelection() {
    setSelectedRowIdsByTab((prev) => {
      const current = prev[tab];
      const currentSet = new Set(current);
      if (allPageSelected) {
        pageIds.forEach((id) => currentSet.delete(id));
      } else {
        pageIds.forEach((id) => currentSet.add(id));
      }
      return { ...prev, [tab]: Array.from(currentSet) };
    });
  }

  function clearSelectionForTab(nextTab: TabKey = tab) {
    setSelectedRowIdsByTab((prev) => ({ ...prev, [nextTab]: [] }));
  }

  function selectAllMatching() {
    setSelectedRowIdsByTab((prev) => ({
      ...prev,
      [tab]: selectAllMatchingRows(prev[tab], pageIds, sortedRows.map((row) => row.id)),
    }));
  }

  function setPageSize(nextSize: number) {
    setPageSizeByTab((prev) => ({ ...prev, [tab]: nextSize }));
    setPageByTab((prev) => ({ ...prev, [tab]: 0 }));
  }

  function handleSort(columnId: string) {
    setSortByTab((prev) => {
      const current = tab === 'devices' ? prev.devices : prev.accounts;
      const next = nextSort(current, columnId);
      return tab === 'devices' ? { ...prev, devices: next } : { ...prev, accounts: next };
    });
    setPageByTab((prev) => ({ ...prev, [tab]: 0 }));
  }

  function exportCsv() {
    const sourceRows = selectedRowIds.length > 0
      ? sortedRows.filter((row) => selectedRowIds.includes(row.id))
      : sortedRows;

    const csvColumns = visibleColumns;
    const lines: string[] = [];

    lines.push(csvColumns.map((column) => `"${column.label.replaceAll('"', '""')}"`).join(','));

    sourceRows.forEach((row) => {
      const line = csvColumns
        .map((column) => {
          const raw = column.exportValue(row);
          return `"${raw.replaceAll('"', '""')}"`;
        })
        .join(',');
      lines.push(line);
    });

    const blob = new Blob([`${lines.join('\n')}\n`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${tab}-export.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportPdfPlaceholder() {
    const count = selectedRowIds.length > 0 ? selectedRowIds.length : totalRows;
    setToast(`PDF export queued for ${count.toLocaleString()} ${tab}.`);
  }

  function runSelectionAction(action: string) {
    const selectedCount = selectedRowIds.length;

    if (selectedCount < 1) {
      setToast(`Select at least 1 ${tab === 'devices' ? 'device' : 'account'}.`);
      return;
    }

    setToast(`Action: ${action} on ${selectedCount.toLocaleString()} ${tab}.`);
  }

  const selectionActions = useMemo(() => {
    const count = selectedRowIds.length;

    if (isDevices) {
      return [
        { label: 'Block', visible: count >= 1, danger: false },
        { label: 'Deactivate', visible: count >= 1, danger: false },
        { label: 'Delete', visible: count >= 1, danger: true },
      ].filter((item) => item.visible);
    }

    return [
      { label: 'Edit', visible: count === 1, danger: false },
      { label: 'Change group', visible: count === 1, danger: false },
      { label: 'Block', visible: count >= 1, danger: false },
      { label: 'Deactivate', visible: count >= 1, danger: false },
      { label: 'Delete', visible: count >= 1, danger: true },
    ].filter((item) => item.visible);
  }, [isDevices, selectedRowIds.length]);

  function openColumnPickerFromViewSettings() {
    if (!viewSettingsButtonRef.current) return;
    setColumnPickerAnchorEl(viewSettingsButtonRef.current);
    setColumnPickerOpen(true);
  }

  function handleSaveView(action: SaveViewAction) {
    if (tab === 'sites') return;
    if (!saveViewName.trim()) return;

    const entity: SavedViewEntity = tab;
    const baseView: SavedViewBase = activeSavedView?.baseView ?? (activeView === 'caasm' ? 'caasm' : 'default');
    const snapshot = buildSnapshot(entity);

    let saved: SavedView | null = null;

    if (action === 'update' && activeSavedView) {
      saved = savedViewStore.update(activeSavedView.id, {
        name: activeSavedView.name,
        entity,
        baseView,
        ...snapshot,
      });
    } else {
      saved = upsertSavedViewByName(savedViewStore, {
        name: saveViewName.trim(),
        entity,
        baseView,
        ...snapshot,
      });
    }

    if (!saved) {
      setToast('Unable to save view.');
      return;
    }

    setSavedViewsByTab((prev) => ({ ...prev, [entity]: savedViewStore.list(entity) }));
    setActiveViewByTab((prev) => ({ ...prev, [entity]: saved.id }));
    setSaveViewDialogOpen(false);
    setToast(action === 'update' ? 'View updated.' : 'View saved as new.');
  }

  function handleRemoveViewConfirmed() {
    if (tab === 'sites') return;
    if (!activeSavedView) return;

    const entity: SavedViewEntity = tab;
    const removed = savedViewStore.delete(activeSavedView.id);

    if (!removed) {
      setToast('Unable to remove view.');
      return;
    }

    setSavedViewsByTab((prev) => ({ ...prev, [entity]: savedViewStore.list(entity) }));
    setActiveViewByTab((prev) => ({ ...prev, [entity]: removed.baseView }));
    resetToBuiltIn(entity, removed.baseView);
    setRemoveViewDialogOpen(false);
    setToast('View removed.');
  }

  async function handleShareLink() {
    if (!activeSavedView) return;

    const link = `${window.location.origin}${window.location.pathname}#view=${activeSavedView.id}`;

    try {
      await navigator.clipboard.writeText(link);
      setToast('Link copied to clipboard.');
    } catch {
      setToast('Could not copy link.');
    }
  }

  function switchTab(nextTab: TabKey) {
    setExpandedChipList(false);
    setColumnPickerOpen(false);
    setDetailView(null);
    clearSelectionForTab(nextTab);

    setTab(nextTab);
  }

  function openDeviceDetail(record: DeviceRecord) {
    setDetailTabByKind((prev) => ({ ...prev, device: 'Overview' }));
    setDetailView({ kind: 'device', record });
  }

  function openAccountDetail(record: AccountFilterRow) {
    setDetailTabByKind((prev) => ({ ...prev, account: 'Overview' }));
    setDetailView({ kind: 'account', record });
  }

  function renderSourceDataContent(rows: SourceCoverageRow[]) {
    if (rows.length === 0) {
      return <p className={styles.detailMuted}>No source data available.</p>;
    }

    return (
      <div className={styles.detailRows}>
        {rows.map((row) => (
          <div className={styles.detailRow} key={row.source}>
            <span className={styles.detailRowLabel}>{row.source}</span>
            <span>
              {row.status === 'N/A' ? 'Not applicable' : row.status}
              {row.lastSyncAt ? ` • ${formatRelativeTime(row.lastSyncAt)}` : ''}
            </span>
          </div>
        ))}
      </div>
    );
  }

  function renderDetailPage() {
    if (!detailView) return null;

    if (detailView.kind === 'device') {
      const deviceRecord = detailView.record;
      const accountName = stripSyntheticSuffix(deviceRecord.account);
      const linkedAccount = accountRows.find((account) => stripSyntheticSuffix(account.name) === accountName) ?? null;
      const detailTabs = ['Overview', 'Source data', 'On this device', 'Alerts', 'ZTNA access', 'Connection history'];
      const activeDetailTab = detailTabByKind.device;
      const sourceRows = toSourceCoverageRows(deviceRecord, { omitNotApplicable: true });
      const conflictCount = estimateSourceConflictCount(sourceRows);

      return (
        <div className={styles.detailPage}>
          <div className={styles.detailCrumb}>
            <button className={styles.detailLink} onClick={() => setDetailView(null)} type="button">Assets</button>
            {' / '}
            <span>Devices</span>
            {' / '}
            <span className={styles.detailCrumbCurrent}>{deviceRecord.name}</span>
          </div>

          <div className={styles.detailLayout}>
            <div className={styles.detailRail}>
              <div className={styles.detailCard}>
                <h3 className={styles.detailCardTitle}>Device details</h3>
                <dl className={styles.detailKv}>
                  <dt>Type</dt><dd>{deviceRecord.type}</dd>
                  <dt>OS</dt><dd>{deviceRecord.os}</dd>
                  <dt>Location</dt><dd>{deviceRecord.location}</dd>
                  <dt>AgentP last reported</dt><dd>{formatRelativeTime(deviceRecord.agentpLastReported)}</dd>
                  <dt>Last connected</dt><dd>{formatRelativeTime(deviceRecord.lastConnectedAt)}</dd>
                </dl>
              </div>

              <div className={styles.detailCard}>
                <h3 className={styles.detailCardTitle}>Current risk score</h3>
                <dl className={styles.detailKv}>
                  <dt>Risk score</dt><dd>{deviceRecord.riskScore}</dd>
                  <dt>Violations</dt>
                  <dd>
                    {deviceRecord.riskViolations.length > 0 ? (
                      <ul className={styles.detailList}>
                        {deviceRecord.riskViolations.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    ) : 'None'}
                  </dd>
                </dl>
              </div>

              <SourceCoverageCard key={`device-${deviceRecord.id}`} rows={sourceRows} />

              <div className={styles.detailCard}>
                <h3 className={styles.detailCardTitle}>Account assignment</h3>
                <dl className={styles.detailKv}>
                  <dt>Account</dt>
                  <dd>
                    {linkedAccount ? (
                      <button className={styles.detailLink} onClick={() => openAccountDetail(linkedAccount)} type="button">
                        {linkedAccount.name}
                      </button>
                    ) : accountName}
                  </dd>
                  <dt>Account type</dt><dd>{deviceRecord.accountType}</dd>
                  <dt>Group</dt><dd>{deviceRecord.group}</dd>
                </dl>
              </div>
            </div>

            <div className={styles.detailMainCard}>
              <div className={styles.detailTabs}>
                {detailTabs.map((tabName) => (
                  <button
                    className={`${styles.detailTab} ${activeDetailTab === tabName ? styles.detailTabActive : ''}`}
                    key={tabName}
                    onClick={() => setDetailTabByKind((prev) => ({ ...prev, device: tabName }))}
                    type="button"
                  >
                    {tabName}
                    {tabName === 'Source data' && conflictCount > 0 ? (
                      <Tooltip content={`${conflictCount} field(s) differ across sources`}>
                        <span className={styles.detailWarnIcon}>⚠</span>
                      </Tooltip>
                    ) : null}
                  </button>
                ))}
              </div>

              {activeDetailTab === 'Overview' ? (
                <section className={styles.detailSection}>
                  <h3 className={styles.detailSectionTitle}>Device information</h3>
                  <div className={styles.detailRows}>
                    <div className={styles.detailRow}><span className={styles.detailRowLabel}>Device type</span><span>{deviceRecord.type}</span></div>
                    <div className={styles.detailRow}><span className={styles.detailRowLabel}>Vendor</span><span>{deviceRecord.manufacturer}</span></div>
                    <div className={styles.detailRow}><span className={styles.detailRowLabel}>Device model</span><span>{deviceRecord.model}</span></div>
                    <div className={styles.detailRow}><span className={styles.detailRowLabel}>OS</span><span>{deviceRecord.os}</span></div>
                    <div className={styles.detailRow}><span className={styles.detailRowLabel}>Location</span><span>{deviceRecord.location}</span></div>
                    <div className={styles.detailRow}><span className={styles.detailRowLabel}>AgentP last reported</span><span>{formatRelativeTime(deviceRecord.agentpLastReported)}</span></div>
                    <div className={styles.detailRow}><span className={styles.detailRowLabel}>Last connected to network</span><span>{formatRelativeTime(deviceRecord.lastConnectedAt)}</span></div>
                  </div>
                </section>
              ) : null}

              {activeDetailTab === 'Source data' ? renderSourceDataContent(sourceRows) : null}

              {activeDetailTab !== 'Overview' && activeDetailTab !== 'Source data' ? (
                <p className={styles.detailMuted}>{activeDetailTab} is a placeholder for now.</p>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    const accountRecord = detailView.record;
    const baseAccountName = stripSyntheticSuffix(accountRecord.name);
    const linkedDevices = devices
      .filter((device) => stripSyntheticSuffix(device.account) === baseAccountName)
      .sort((left, right) => right.riskScore - left.riskScore || left.name.localeCompare(right.name));
    const detailTabs = ['Overview', 'Source data', 'Alerts'];
    const activeDetailTab = detailTabByKind.account;
    const sourceRows = toSourceCoverageRows(accountRecord, { accountOnly: true });
    const conflictCount = estimateSourceConflictCount(sourceRows);

    return (
      <div className={styles.detailPage}>
        <div className={styles.detailCrumb}>
          <button className={styles.detailLink} onClick={() => setDetailView(null)} type="button">Assets</button>
          {' / '}
          <span>Accounts</span>
          {' / '}
          <span className={styles.detailCrumbCurrent}>{accountRecord.name}</span>
        </div>

        <div className={styles.detailLayout}>
          <div className={styles.detailRail}>
            <div className={styles.detailCard}>
              <h3 className={styles.detailCardTitle}>Account details</h3>
              <dl className={styles.detailKv}>
                <dt>Type</dt><dd>{accountRecord.accountType}</dd>
                <dt>Group</dt><dd>{accountRecord.group}</dd>
                <dt>Last login</dt><dd>{accountRecord.lastLoginDays == null ? '—' : accountRecord.lastLoginDays === 0 ? 'Today' : `${accountRecord.lastLoginDays} days ago`}</dd>
              </dl>
            </div>

            <SourceCoverageCard key={`account-${accountRecord.id}`} rows={sourceRows} />

            <div className={styles.detailCard}>
              <h3 className={styles.detailCardTitle}>Associated devices ({linkedDevices.length})</h3>
              {linkedDevices.length === 0 ? (
                <p className={styles.detailMuted}>None</p>
              ) : (
                linkedDevices.map((device) => (
                  <div className={styles.detailAssociatedItem} key={device.id}>
                    <button className={styles.detailLink} onClick={() => openDeviceDetail(device)} type="button">{device.name}</button>
                    <div className={styles.detailAssociatedMeta}>{device.type} • Last connected {formatRelativeTime(device.lastConnectedAt)}</div>
                    <div className={styles.detailAssociatedMeta}>Risk score {device.riskScore}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={styles.detailMainCard}>
            <div className={styles.detailTabs}>
              {detailTabs.map((tabName) => (
                <button
                  className={`${styles.detailTab} ${activeDetailTab === tabName ? styles.detailTabActive : ''}`}
                  key={tabName}
                  onClick={() => setDetailTabByKind((prev) => ({ ...prev, account: tabName }))}
                  type="button"
                >
                  {tabName}
                  {tabName === 'Source data' && conflictCount > 0 ? (
                    <Tooltip content={`${conflictCount} field(s) differ across sources`}>
                      <span className={styles.detailWarnIcon}>⚠</span>
                    </Tooltip>
                  ) : null}
                </button>
              ))}
            </div>

            {activeDetailTab === 'Overview' ? (
              <section className={styles.detailSection}>
                <h3 className={styles.detailSectionTitle}>Account details</h3>
                <div className={styles.detailRows}>
                  <div className={styles.detailRow}><span className={styles.detailRowLabel}>Account type</span><span>{accountRecord.accountType}</span></div>
                  <div className={styles.detailRow}><span className={styles.detailRowLabel}>Group</span><span>{accountRecord.group}</span></div>
                  <div className={styles.detailRow}><span className={styles.detailRowLabel}>Location</span><span>{accountRecord.location}</span></div>
                  <div className={styles.detailRow}><span className={styles.detailRowLabel}>Authentication repository</span><span>{accountRecord.authRepo ?? '—'}</span></div>
                  <div className={styles.detailRow}><span className={styles.detailRowLabel}>NAS site</span><span>{accountRecord.nasSite}</span></div>
                </div>
              </section>
            ) : null}

            {activeDetailTab === 'Source data' ? renderSourceDataContent(sourceRows) : null}

            {activeDetailTab === 'Alerts' ? <p className={styles.detailMuted}>Alerts is a placeholder for now.</p> : null}
          </div>
        </div>
      </div>
    );
  }

  if (detailView) {
    return renderDetailPage();
  }

  if (isSites) {
    return (
      <div>
        <div className={styles.tabs}>
          <button className={styles.tab} onClick={() => switchTab('devices')} type="button">
            Devices
          </button>
          <button className={styles.tab} onClick={() => switchTab('accounts')} type="button">
            Accounts
          </button>
          <button className={`${styles.tab} ${styles.tabActive}`} onClick={() => switchTab('sites')} type="button">
            Sites
          </button>
        </div>

        <div className={styles.placeholderPanel}>
          <p className={styles.placeholderText}>NAS Sites table would go here</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${isDevices ? styles.tabActive : ''}`} onClick={() => switchTab('devices')} type="button">
          Devices
        </button>
        <button className={`${styles.tab} ${isAccounts ? styles.tabActive : ''}`} onClick={() => switchTab('accounts')} type="button">
          Accounts
        </button>
        <button className={`${styles.tab} ${isSites ? styles.tabActive : ''}`} onClick={() => switchTab('sites')} type="button">
          Sites
        </button>
      </div>

      <div className={styles.toolbar}>
        <button
          className={`${styles.btn} ${showFilters ? styles.btnActive : ''}`}
          onClick={() => setShowFilters((prev) => !prev)}
          type="button"
        >
          {showFilters ? 'Hide filters' : 'Show filters'}
          {filterCount > 0 ? <span className={styles.countBadge}>{filterCount}</span> : null}
        </button>

        <input
          aria-label="Search"
          className={styles.searchInput}
          onChange={(event) => {
            const value = event.target.value;
            setSearchByTab((prev) => ({ ...prev, [tab]: value }));
            setPageByTab((prev) => ({ ...prev, [tab]: 0 }));
            clearSelectionForTab();
          }}
          placeholder={isDevices ? 'Search devices, accounts, OS, location' : 'Search accounts or groups'}
          type="search"
          value={searchByTab[tab]}
        />

        <div className={styles.selectionActions}>
          {selectionActions.map((action) => (
            <button
              className={`${styles.btn} ${action.danger ? styles.btnDanger : ''}`}
              key={action.label}
              onClick={() => runSelectionAction(action.label)}
              type="button"
            >
              {action.label}
            </button>
          ))}
        </div>

        <div className={styles.toolbarSpacer} />

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className={styles.btn} ref={viewSettingsButtonRef} type="button">
              View settings
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" className={styles.dropdownMenu} sideOffset={6}>
              <DropdownMenu.Item className={styles.dropdownItem} onSelect={openColumnPickerFromViewSettings}>
                Show/hide columns
              </DropdownMenu.Item>
              <DropdownMenu.Item className={styles.dropdownItem} onSelect={() => setSaveViewDialogOpen(true)}>
                Save view
              </DropdownMenu.Item>
              <Tooltip
                content={!activeViewSavedAndUnchanged ? 'This view must be saved before you can share a link' : undefined}
                disabled={activeViewSavedAndUnchanged}
              >
                <DropdownMenu.Item
                  aria-disabled={!activeViewSavedAndUnchanged}
                  className={`${styles.dropdownItem} ${!activeViewSavedAndUnchanged ? styles.dropdownItemDisabled : ''}`}
                  onSelect={(event) => {
                    if (!activeViewSavedAndUnchanged) {
                      event.preventDefault();
                      return;
                    }

                    void handleShareLink();
                  }}
                >
                  Share link
                </DropdownMenu.Item>
              </Tooltip>
              <Tooltip
                content={!activeViewSavedAndUnchanged ? 'This view cannot be removed' : undefined}
                disabled={activeViewSavedAndUnchanged}
              >
                <DropdownMenu.Item
                  aria-disabled={!activeViewSavedAndUnchanged}
                  className={`${styles.dropdownItem} ${!activeViewSavedAndUnchanged ? styles.dropdownItemDisabled : ''}`}
                  onSelect={(event) => {
                    if (!activeViewSavedAndUnchanged) {
                      event.preventDefault();
                      return;
                    }

                    setRemoveViewDialogOpen(true);
                  }}
                >
                  Remove view
                </DropdownMenu.Item>
              </Tooltip>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className={`${styles.btn} ${styles.btnPrimary}`} type="button">
              Export
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" className={styles.dropdownMenu} sideOffset={6}>
              <DropdownMenu.Item className={styles.dropdownItem} onSelect={exportCsv}>
                Export (CSV)
              </DropdownMenu.Item>
              <DropdownMenu.Item className={styles.dropdownItem} onSelect={exportPdfPlaceholder}>
                Export (PDF)
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {chips.length > 0 ? (
        <div className={styles.chips}>
          {visibleChips.map((chip) => (
            <span className={styles.chip} key={chip.id}>
              {chip.text}
              <button className={styles.chipRemove} onClick={chip.remove} type="button">×</button>
            </span>
          ))}
          {hiddenChipCount > 0 ? (
            <button className={styles.linkBtn} onClick={() => setExpandedChipList(true)} type="button">
              +{hiddenChipCount} more filters
            </button>
          ) : null}
          {expandedChipList && chips.length > 5 ? (
            <button className={styles.linkBtn} onClick={() => setExpandedChipList(false)} type="button">
              Show fewer
            </button>
          ) : null}
          <button className={styles.linkBtn} onClick={clearAllFilters} type="button">Clear all</button>
        </div>
      ) : null}

      {selectionBannerState ? (
        <div className={styles.selectionBanner}>
          {selectionBannerState.type === 'pageSelected' ? (
            <>
              <span>
                All {selectionBannerState.pageCount.toLocaleString()} {isDevices ? 'devices' : 'accounts'} on this page are selected.
              </span>
              <button
                className={styles.linkBtn}
                onClick={selectAllMatching}
                type="button"
              >
                Select all {selectionBannerState.totalCount.toLocaleString()}
              </button>
            </>
          ) : (
            <>
              <span>
                All {selectionBannerState.totalCount.toLocaleString()} {isDevices ? 'devices' : 'accounts'} are selected.
              </span>
              <button className={styles.linkBtn} onClick={() => clearSelectionForTab()} type="button">
                Clear selection
              </button>
            </>
          )}
        </div>
      ) : null}

      <div className={styles.layout}>
        <div className={`${styles.filters} ${showFilters ? '' : styles.filtersHidden}`}>
          <div className={styles.headerRow}>
            <span className={styles.headerLabel}>Filters</span>
            <button className={styles.clearLink} onClick={clearAllFilters} type="button">Clear</button>
          </div>

          <button
            className={`${styles.btn} ${styles.addFilterButton}`}
            onClick={openManageFilters}
            ref={manageFiltersButtonRef}
            type="button"
          >
            Manage filters
          </button>

          <details className={styles.section} open>
            <summary className={styles.sectionSummary}>Saved views</summary>
            <div className={styles.sectionBody}>
              <label className={styles.savedOption}>
                <input
                  checked={activeView === 'default'}
                  onChange={() => selectView(tab, 'default')}
                  type="radio"
                />
                Default view
              </label>
              <label className={styles.savedOption}>
                <input
                  checked={activeView === 'caasm'}
                  onChange={() => selectView(tab, 'caasm')}
                  type="radio"
                />
                CAASM View
              </label>
              {savedViewsByTab[tab].map((savedView) => (
                <label className={styles.savedOption} key={savedView.id}>
                  <input
                    checked={activeView === savedView.id}
                    onChange={() => selectView(tab, savedView.id)}
                    type="radio"
                  />
                  {savedView.name}
                </label>
              ))}
            </div>
          </details>

          {visibleSectionIds.map((id) => renderSection(id))}
        </div>

        <div className={styles.tableShell} ref={tableShellRef}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.head}>
                  <input
                    aria-label="Select page rows"
                    checked={allPageSelected}
                    onChange={togglePageSelection}
                    type="checkbox"
                  />
                </th>
                {visibleColumns.map((column) => {
                  const isSorted = activeSort.columnId === column.id;
                  const indicator = isSorted ? (activeSort.direction === 'asc' ? ' ▲' : ' ▼') : '';
                  return (
                    <th
                      aria-sort={isSorted ? (activeSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className={styles.head}
                      key={column.id}
                    >
                      <button
                        className={styles.headSortBtn}
                        onClick={() => handleSort(column.id)}
                        type="button"
                      >
                        {column.label}{indicator}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td className={styles.empty} colSpan={visibleColumns.length + 1}>
                    No {isDevices ? 'devices' : 'accounts'} match these filters. Clear filters to see all.
                  </td>
                </tr>
              ) : null}

              {pagedRows.map((row) => (
                <tr
                  className={styles.row}
                  key={row.id}
                  onClick={() => {
                    if (isDevices) {
                      openDeviceDetail(row as DeviceRecord);
                    } else {
                      openAccountDetail(row as AccountFilterRow);
                    }
                  }}
                >
                  <td className={styles.cell}>
                    <input
                      aria-label={`Select row ${row.id}`}
                      checked={selectedRowIds.includes(row.id)}
                      onChange={() => toggleRowSelection(row.id)}
                      onClick={(event) => event.stopPropagation()}
                      type="checkbox"
                    />
                  </td>
                  {visibleColumns.map((column) => (
                    <td className={styles.cell} key={`${row.id}-${column.id}`}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className={`${styles.tableFooter} tableFooter`}>
            <div className={`${styles.footerCount} footerCount`}>
              {totalRows.toLocaleString()} rows
              {selectedRowIds.length > 0 ? ` • ${selectedRowIds.length.toLocaleString()} selected` : ''}
            </div>
            <div className={styles.footerActions}>
              <label className={styles.footerLabel}>
                Rows per page
                <select
                  className={styles.select}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  value={pageSize}
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <button
                className={styles.btn}
                disabled={currentPage <= 0}
                onClick={() => setPageByTab((prev) => ({ ...prev, [tab]: Math.max(0, prev[tab] - 1) }))}
                type="button"
              >
                Prev
              </button>
              <span className={styles.footerPage}>Page {currentPage + 1} of {totalPages}</span>
              <button
                className={styles.btn}
                disabled={currentPage >= totalPages - 1}
                onClick={() => setPageByTab((prev) => ({ ...prev, [tab]: Math.min(totalPages - 1, prev[tab] + 1) }))}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {columnPickerOpen ? (
        <ColumnPickerPopover
          anchorEl={columnPickerAnchorEl}
          columns={pickerColumns}
          hidden={activeHidden}
          onClose={() => setColumnPickerOpen(false)}
          onMove={moveColumn}
          onReorder={reorderColumn}
          onReset={resetColumnsToDefault}
          onToggle={setColumnVisibility}
          order={activeOrder}
        />
      ) : null}

      <Dialog.Root
        onOpenChange={(open) => {
          setSaveViewDialogOpen(open);
          if (open) {
            setSaveViewName(activeSavedViewName ?? '');
          }
        }}
        open={saveViewDialogOpen}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={styles.dialogContent}>
            <Dialog.Title className={styles.dialogTitle}>Save view</Dialog.Title>
            <p className={styles.dialogNote}>This view will be shared with everyone in your organization.</p>
            <label className={styles.dialogLabel} htmlFor="save-view-name">View name</label>
            <input
              className={styles.dialogInput}
              id="save-view-name"
              onChange={(event) => setSaveViewName(event.target.value)}
              placeholder="View name"
              value={saveViewName}
            />
            <div className={styles.dialogActions}>
              <button className={styles.btn} onClick={() => setSaveViewDialogOpen(false)} type="button">Cancel</button>
              {activeSavedViewName ? (
                <button className={styles.btn} onClick={() => handleSaveView('update')} type="button">
                  Update "{activeSavedViewName}"
                </button>
              ) : null}
              <button className={styles.btn} disabled={!saveViewName.trim()} onClick={() => handleSaveView('saveAsNew')} type="button">
                Save as new
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root onOpenChange={setRemoveViewDialogOpen} open={removeViewDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={styles.dialogContent}>
            <Dialog.Title className={styles.dialogTitle}>Remove view</Dialog.Title>
            <p className={styles.dialogNote}>
              This removes the view for everyone in the organization, not just you, and cannot be undone.
            </p>
            <div className={styles.dialogActions}>
              <button className={styles.btn} onClick={() => setRemoveViewDialogOpen(false)} type="button">Cancel</button>
              <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleRemoveViewConfirmed} type="button">
                Remove view
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {toast ? <div className={styles.toast}>{toast}</div> : null}

      <ManageFiltersDialog
        allIds={getAllManageableSectionIds(tab)}
        entity={isDevices ? 'devices' : 'accounts'}
        onApply={applyManageFilters}
        onOpenChange={setManageFiltersOpen}
        open={manageFiltersOpen}
        triggerRef={manageFiltersButtonRef}
        visibleIds={[...defaultSectionIds, ...addedSectionIds].filter((id) => !hiddenSectionIds.includes(id))}
      />

      {seeMoreOpenFor ? (
        <div
          className={styles.popoverAnchor}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeSeeMore();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              closeSeeMore();
            }
          }}
          role="presentation"
        >
          <div
            aria-label="See more options"
            className={styles.popup}
            role="dialog"
            style={{
              position: 'fixed',
              left: seeMorePosition.left,
              top: seeMorePosition.top,
            }}
          >
            <h2 className={styles.popupTitle}>
              {findSectionLabel(isDevices ? 'devices' : 'accounts', seeMoreOpenFor)} ({seeMoreDraftValues.length} selected)
            </h2>
            <input
              className={styles.popupSearch}
              onChange={(event) => setSeeMoreQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation();
                  closeSeeMore();
                }
              }}
              placeholder={`Search ${findSectionLabel(isDevices ? 'devices' : 'accounts', seeMoreOpenFor).toLowerCase()}`}
              ref={popupSearchRef}
              value={seeMoreQuery}
            />

            <div className={styles.popupGrid}>
              {getOptionsForSection(seeMoreOpenFor)
                .filter((option) => option.label.toLowerCase().includes(seeMoreQuery.trim().toLowerCase()))
                .map((option) => (
                  <label className={styles.optionRow} key={option.value}>
                    <input
                      checked={seeMoreDraftValues.includes(option.value)}
                      onChange={() => {
                        const exists = seeMoreDraftValues.includes(option.value);
                        setSeeMoreDraftValues((prev) => (exists ? prev.filter((value) => value !== option.value) : [...prev, option.value]));
                      }}
                      type="checkbox"
                    />
                    {option.label}
                  </label>
                ))}

              {getOptionsForSection(seeMoreOpenFor).filter((option) => option.label.toLowerCase().includes(seeMoreQuery.trim().toLowerCase())).length === 0 ? (
                <p className={styles.muted}>No options match.</p>
              ) : null}
            </div>

            <div className={styles.popupActions}>
              <button className={styles.btn} onClick={closeSeeMore} type="button">Cancel</button>
              <button
                className={styles.btn}
                onClick={() => {
                  setChecklistValues(seeMoreOpenFor, seeMoreDraftValues);
                  closeSeeMore();
                }}
                type="button"
              >
                Add filter
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
