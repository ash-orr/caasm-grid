# Changes since the original behavior spec

**Status:** supplement to `design/BEHAVIOR.md`. Where the two disagree, **this file wins**.
**Source of truth for look and feel:** the latest `caasm-console.html` prototype (published version 96 or later).
When the port is stable, merge these rules into `BEHAVIOR.md` and delete this file.

Items marked **(confirm)** are decisions or assumptions that need an answer from the product owner or the backend team.

---

## 1. Rules in BEHAVIOR.md that are replaced

| Original rule | Now |
|---|---|
| "Source correlation" (table on the Overview tab) | Renamed **Source coverage**. It is a card in the left column, not a table on the Overview tab (see section 6). |
| Last-sync cell reads "Awaiting next poll (~Nh)" for Pending | Pending shows **no time** (the next poll time is unknown). |
| Filter section "CAASM status" | Renamed **Source coverage**. Behavior is unchanged. |
| "Created time" is a default filter on Devices | Not shown by default. It is an **addable** filter (section 3). |
| "Saved filters" with Exposure Risk view as the built-in option | Renamed **Saved views**, with Default view, Exposure Risk view and user-saved views (section 4). |
| "Filters are never hidden in a saved view" | Replaced: added filter sections **reset on every visit** unless saved in a view. |
| Column picker is a button at the far right of the table header | Removed from the header. It lives behind the **Columns** icon button (section 5). |
| "Export CSV" button at the far right | Replaced by an **Export** menu button (CSV, PDF) (section 5). |
| Cards above the tables, with a Show/Hide cards button | **The cards and the Show/Hide cards button are removed** from the Devices and Accounts tabs. **Quick filters are removed completely** (high-risk devices, coverage gaps, stale devices, blocked accounts): no cards, no preset chips, no preset state in views. Opening Devices from a group link on the Exposure Summary page only filters by that group. |
| "Every column has a filter, except Device name and Account name" | Still true, but most new columns' filters are addable rather than default (section 3). |
| Account details tabs: Overview, Exposure coverage, Devices | **Overview, Exposure coverage, Alerts.** The Devices tab is removed (the left-column card already lists them). Alerts is a placeholder. |
| Account Overview includes "Device exposure" | Removed. |
| Device Overview includes "Source correlation" and "Source conflicts" | Both removed. Source agreement and conflicts live in the Overview's Sources column. |
| Device Overview and Account Overview use two columns | **One column** of label and value rows. |
| Page subtitles on Assets and CAASM overview, plus the helper lines on the Sources page and the "Coverage gaps by source" card | Removed. No page subtitles remain. |

---

## 2. New fields (Devices and Accounts)

All of these are **columns, hidden by default**, available in the column picker. Defaults for existing columns are unchanged.

**Devices (16, plus Source coverage below):** Authentication repository, NAS site, MAC vendor, Device manufacturer, Device model, Applications, Patches, Processes, Services, Peripherals, Browser, Browser extensions, AgentP version, Risk score violations, NAS IP, AgentP last reported.
**Accounts (3):** Authentication repository, NAS site, Location.

Details:
- **Authentication repository:** a NAC value, one of the identity sources (Active Directory, EntraID, Okta, Google Workspace). MAC-based accounts have none and show "—". A device inherits its account's repository.
- **NAS site and NAS IP:** options will come from the Sites tab. (confirm the real source.) NAS IP filtering is an **exact match**.
- **AgentP last reported:** when AgentP last sent status to Portnox Cloud. It is **not** the same as **Last connected**, which is the last network authentication. (confirm both exist as separate fields in the backend.)
- **List-type columns** (Applications, Patches, Processes, Services, Peripherals, Browser, Browser extensions, Risk score violations): show the first two values, then a hoverable "+N" whose tooltip lists all values ("All N" heading). Empty shows "—".
- **Per-source status columns (CrowdStrike, Intune, Okta, ...) are hidden by default in the Default view** (Devices and Accounts). Users add them from Show/hide columns. They stay **visible in Exposure Risk view**. "Reset to default" in the column picker follows the same rule for the current view.
- **Source coverage column (new, Devices and Accounts, hidden by default in both views):** plain text listing the connected sources that have this record, in the same short names as the per-source columns (for example "CrowdStrike, AgentP, AD, Okta"). Empty shows "—". The cell is capped at **250px** with an ellipsis, with a dotted underline like the other hoverable cells, and a **tooltip with the full text**. Sorting by this column sorts by the number of sources. Placed right after Coverage gaps in the default column order.
- **Column labels:** "NAS site", "AgentP last reported", "Risk score violations", "Peripherals", "Browser extensions".

---

## 3. Filters

### Default filter sections
- **Devices:** Device type, OS, Location, Account type, Group, Risk score, Status, Last connected, Source coverage.
- **Accounts:** Account type, Group, Blocked, Devices, Last login, Source coverage.
- Order in the panel: **Saved views**, then the default sections, then any added sections (in the order they were added), then the **Manage filters** button at the bottom.

### Manage filters (addable sections) — replaces the old "+ Add filter" menu
- A full-width **Manage filters** button sits at the **bottom** of the filter panel. It opens a centered dialog (same style as the "See more" popup). Press Esc, click outside or Cancel to discard.
- The dialog has a title "Manage filters (N shown)" with a live count, a one-line help text, a **search box** ("No filters match." when empty), and checkboxes grouped by:
  - **Default filters:** every default section for the current tab (see the list above), shown first.
  - **General:** Device manufacturer, Device model, Created time (Devices); Location (Accounts).
  - **Network (NAC):** Authentication repository, NAS site, MAC vendor, NAS IP, AgentP last reported (Devices); Authentication repository, NAS site (Accounts).
  - **Risk (NAC):** Risk score violation (Devices).
  - **On this device (NAC):** On this device, AgentP version (Devices).
- Checked = the section is shown in the panel. Selection is **staged**: nothing changes until **Apply**. The dialog opens with the currently shown filters checked.
- **Unchecking a filter removes its section and clears its selection** (so no hidden filter keeps applying). Newly checked sections are added after the existing ones and opened.
- **Default sections can be removed too.** Removing one hides its section and clears its selection. Selecting Default view or Exposure Risk view brings all defaults back.
- Hidden defaults and added sections reset on each visit and when selecting Default view or Exposure Risk view. Saved views store both (a hidden-defaults list and an added-sections list), and "unchanged" detection compares both (section 4).
- Items have **no description text**.

### Filter semantics
- Multi-select: **any of** within a filter, **and** between filters.
- **On this device:** one section containing rows of "[Category] [Value]". Categories: Applications, Patches, Processes, Services, Peripherals, Browser, Browser extensions. Same category rows are any-of. Different categories are all-of. Incomplete rows are ignored. "+ Add condition" adds a row. No helper text is shown.
- **AgentP version:** a checklist of exact versions plus an **"Older than"** dropdown (version comparison, not text comparison).
- **Risk score violation:** any-of across the ten violation categories.
- **AgentP last reported:** buckets (Last 24 hours, 1 to 7 days ago, Over 7 days ago).

### "See more" popup
- Opens from any section with more than 5 options, and includes a **search box** (some filters have 20+ options).
- Selection is **staged**: ticking boxes does not change the table. Buttons are **Cancel** and **Add filter**. Cancel and clicking outside the popup discard changes. Add filter applies them.
- The title shows "(N selected)" and updates live. A search with no match shows "No options match."

### Chips
- Every active filter shows as a removable chip above the table (default and added), including source-coverage conditions and the active card.
- After **5 chips**, a "+N more filters" link expands the rest ("Show fewer" collapses). A **Clear all** link is always at the end.
- The filters toggle is an **icon button** (funnel icon, no text). A small round badge on its top-right corner shows the count of active chips. Tooltip: "Hide filters" / "Show filters". It is highlighted (accent border and tint) while the panel is open, has `aria-pressed` and an `aria-label` ("Hide filters (N active)"), and keeps keyboard focus after toggling.

---

## 4. Saved views

- Shown at the top of the filter panel as radio buttons (single choice): **Default view**, **Exposure Risk view**, then the user's saved views by name. Separate lists for Devices and Accounts.
- **Default view** and **Exposure Risk view** are built in. Choosing either **resets** the table to that view's original layout (filters, added sections, columns, sort).
- A saved view stores: filter values, added filter sections, column visibility and order, sort, and whether it was built on Exposure Risk view.
- Choosing a saved view restores all of it.
- **Saving:** *Views → Save view* opens a dialog asking for a name. If a saved view is already active, the dialog also offers **Update "name"** and the main button becomes **Save as new**. Saving under an existing name updates that view. The new view appears in the radio list as the active view.
- **Unchanged check:** "unchanged" means the current filters, added sections, columns and sort equal the saved snapshot. Undoing a change makes it unchanged again.
- **Shared with everyone in the organization.** The Save dialog says so, and removal affects all users. (confirm: who may edit or remove a shared view, and whether private views are also needed.)
- No "modified" marker on the radio. Update is the way to keep changes.
- Rename is not built. (confirm whether needed.)

---

## 5. Table toolbar and pagination

Toolbar order, left to right: **Filters icon button** (with count badge), search box, selection actions, flexible space, **Columns icon button**, **Views** (menu button), **Export** (menu button).

### Columns (icon button)
- A columns icon button (no text; tooltip "Show/hide columns"; `aria-label` the same; `aria-pressed` while open). It **opens the column picker directly**, anchored under the button's right edge. Clicking it again closes the picker. Opening the Views or Export menu closes the picker.
- Same picker as before (checkboxes, drag handles, arrows, "Reset to default", fixed first column).

### Views (menu button)
Replaces the old "View settings" menu, which mixed table customization with view management. The saved-views list (Default view, Exposure Risk view, saved views) **stays in the filter panel**, because saved views depend on the filters selected.

| Item | Rule |
|---|---|
| Save view | Opens the naming dialog (section 4). |
| Share link | Copies a link to the view and shows "Link copied to clipboard". **Enabled only on a saved view with no unsaved changes.** Otherwise greyed out, with the tooltip "This view must be saved before you can share a link". The prototype does not generate a real link. |
| Remove view | **Enabled only on a saved view with no unsaved changes.** Greyed out on Default view, Exposure Risk view, or a modified view, with the tooltip "This view cannot be removed". Clicking opens a confirmation: removes the view **for everyone in the organization, not just you**, and can't be undone. After removal the table resets to Default view (or Exposure Risk view if the removed view was built on it). |

Disabled menu items use the app's own tooltip so the hint shows on hover.

### Export (menu button)
- **Export (CSV)** and **Export (PDF)**. Both use the selection count if rows are selected, otherwise all rows matching the filters. (The prototype shows a toast only.)

### Pagination
- Footer left: row count and selection count. Footer right: **Rows per page** dropdown, then Prev, "Page X of Y", Next.
- Options: **100 (default), 200, 500, Show all**. Show all puts every row on one page.
- Changing the size returns to page 1 and keeps the selection. Devices and Accounts remember their own size while the page is open.

---

## 6. Detail pages

### Device details
- **Left column, top to bottom:** Device details, **Current risk score** card, **Exposure gaps** card, **Account assignment** card.
- Device details panel: "Last time reported" is now **AgentP last reported**, followed by a new **Last connected** row.
- **Overview tab:** one section, **Device information**, in a single column. "Last reported time" is now **AgentP last reported**, and a new row **Last connected to network** follows it.
- **Overview now carries the source data (replaces the old Normalized/Raw content of the Exposure coverage tab).** The Device information table has three columns: **Field | Value | Sources**. Rows backed by sources show "Agree · N sources" (green pill) or "Conflict" (amber pill) followed by "Source, Source → value · Source → value". Rows with no source data leave the Sources column empty. Added rows: **Hostname** (first), **OS version** (OS and OS version are now separate rows), and **Last seen by sources**, which is not a table row: it sits directly under the "Device information" heading, above the status pill and the column headers, as "Last seen by sources: <time> · Most recent: <source>". Vendor and Device model keep their rows and gain the column.
- **Raw values are per row (no global Normalized/Raw toggle).** Only rows with a **Conflict** show a **View raw values** link under their Sources text (rows that agree have none). It expands the values inside the same row (no separate box, border or background; just monospace lines under the Value and Sources columns, with the differing line tinted amber) listing each reporting source with its raw field name and value (e.g. `Okta  "osVersion": "11.1.721"`); sources whose value differs from the majority are highlighted. The link becomes **Hide raw values**. Several rows can be open at once. Open rows reset when another record is opened. At the top of the Overview card, a single status pill: "N field(s) differ across sources" (amber) or "All sources agree" (green); hidden when no source reports the record.
- **Warning icon:** now shows after the **Overview** tab title when any field conflicts (hover: "N field(s) differ across sources"). It no longer appears on Exposure coverage.
- The inline "Conflict …" notes under Overview fields and under OS in the left column are removed (the Sources column replaces them).
- **No section heading inside tabs:** the "Device information" / "Account details" heading on Overview and the "Exposure gaps" heading on Exposure coverage are removed (the tab title is the heading).
- **Exposure coverage tab (kept):** same Field/rows styling as Overview: a table with column headers **Source | Status | Last seen**, one row per connected source (account sources only on accounts), sorted by status then name, always expanded (no "+N Reporting" link). A **Find a source** search box above the table filters rows live by name (case-insensitive substring); no match shows "No sources match \"…\"". The search clears when another record is opened. More detail columns can be added later.

### Account details
- **Left column:** Account details, **Exposure gaps** card, Associated devices card.
- **Overview tab:** Account details only, in a single column.
- **Overview tab:** same Field | Value | Sources layout and per-row View raw values (conflict rows only) as devices. Rows: Account name (first), Account type, Group (with agreement), Description (**Last login by sources** sits under the heading above the status pill, "<time> · Reported by <sources>"), and the rest. Warning icon on the Overview tab title.
- **Tabs:** Overview (warning icon when sources conflict), Exposure coverage (same content as the Exposure gaps card, always expanded, account sources only), Alerts (placeholder).

### Exposure gaps card (both pages)
- Header text: **Exposure gaps**. Styled like the other left-column cards: muted source name on the left, value on the right.
- Each row is **one line**: a source name, the status pill, then a muted time to the right of the pill, for example "Reporting 1h ago". The label "Last sync" is not shown.
- Time format: "<1h ago", "Nh ago", "Nd ago" once 48 hours or more. **Pending shows no time.** Not applicable and Not present show no time.
- **Order:** by status, then by name (A to Z) within the same status. Status order: **Not present, Stale, Pending, Reporting, Not applicable.**
- **Collapsed by default, issues only.** The card shows only the sources that need attention: **Not present, Stale and Pending**. No row cap. Below the rows a link reads **"+N Reporting"** (N = hidden Reporting sources). If some sources are Not applicable, they are hidden too and the link reads for example **"+2 Reporting, 2 Not applicable"**. Clicking the link expands the card to show every source in the order above, and the link becomes **"Hide details"**.
- **All sources reporting:** when no source has an issue and at least one is Reporting, the card shows the text **"All sources reporting"** and a **"See details"** link. Expanding shows every source (including Not applicable); the link becomes **"Hide details"**.
- **No link** when there is nothing hidden (all rows already shown), and **no collapse** when no source is Reporting and none has an issue (for example a MAC account where every source is Not applicable: all rows shown).
- Resets to collapsed whenever a different device or account is opened.
- **Long source names** are cut off with an ellipsis. Only cut-off names get a tooltip with the full name.
- **Device card:** every connected source.
- **Account card:** only sources that report accounts (Active Directory, EntraID, Okta, Google Workspace). The same collapse rules apply.
- For accounts, the time shown for a Reporting source is that source's last sync time. (confirm the real per-account last-seen time.)

---

## 7. Visual details to match

- **Dropdowns (all `select` elements):** custom chevron, with 30px of space to the right of the chevron so it never touches the border. One shared style for the filter panel, filter conditions, popups and Rows per page.
- **Checkboxes and radios in filter lists** are 15px, vertically centered on their labels, with consistent spacing. Do not let the browser default margins through.
- **Filter-panel links** ("See more", "+ Add condition") use the same font size as the filter options (12.5px).
- **Dark mode:** primary action buttons use **`#1D4954`** (with white text), and link text uses **`#4fb8d4`**. Light mode is unchanged.
- **Grey-out style** for disabled menu items: reduced opacity and a "not-allowed" cursor, with a hover tooltip instead of the browser's.

---

## 8. Updated questions for the backend team

Add these to the original list in `BEHAVIOR.md`:

1. **Saved views:** stored where? Shared with the whole organization (as the Remove dialog says) or per user? Who may update or remove a shared view? Is there an audit log for removals?
2. **Share link:** what does the link contain (the view's id, or the filters themselves)? What happens if the recipient lacks permission, or the view has since been removed?
3. **Sites:** where do NAS site names and NAS IPs come from? The filter options and the Site and NAS IP columns should use the Sites table.
4. **AgentP last reported vs Last connected:** are these two separate fields? Where does each come from?
5. **Authentication repository:** the field is shown for devices as the account's repository. Is that how the backend defines it?
6. **List fields** (applications, patches, processes, services, peripherals, browser, extensions): are they returned as full lists, and are filters evaluated server-side? Large lists may need server-side filtering and a "count" in the table.
7. **AgentP version "older than":** does the backend compare versions numerically? Which version format does it use?
8. **PDF export:** what does the PDF contain (the visible columns, or all)? Is there a row limit?
9. **Rows per page up to "Show all":** is there a maximum the backend allows?

---

## 9. Suggested order for the port

1. Types and mock data for the new fields.
2. Filter logic as pure, unit-tested functions (any-of, and, exact IP, older-than, on-this-device).
3. Filter panel: Manage filters dialog, default sections, See more popup, chips.
4. Table: new hidden columns, list cells, column picker, pagination.
5. Toolbar: Columns icon button, Views menu, Export menu and their dialogs.
6. Saved views (state first, then the backend).
7. Detail pages: Source coverage card, single-column Overview, tab warning icon.
8. Accounts parity, then visual polish.

### Top navigation bar
- Left to right: **Portnox** logo, then **Dashboard, Alerts, Devices, Asset Explorer, Exposure Summary, Zero Trust Resources, Settings, Settings (CAASM), Groups, Policies, Guests, Troubleshooting, Help**.
- **Clickable: Asset Explorer, Exposure Summary and Settings (CAASM).** Settings (CAASM) is the former Settings page (the Sources page: connected and available sources). **Settings** (the new tab) and every other tab are placeholders: plain text, no hover, no pointer cursor, no click. They will link to existing pages later.
- The teal highlight marks the current page (Asset Explorer, Exposure Summary or Settings (CAASM)).
- Below 1440px the tabs tighten their padding; if they still do not fit, the bar scrolls horizontally.
- **Asset Explorer page:** the "Assets" page heading is removed (the nav tab already names the page). The page starts with the Devices / Accounts / Sites tabs. No description line under the tabs in any view (the Exposure Risk view description was removed).
- **Detail-page breadcrumb:** "Asset Explorer / Devices / <name>" (and Accounts), matching the nav tab. The first two parts are links.

### Renames: Exposure gaps (2026-10-19)
- The **Coverage gaps** column (Devices and Accounts tables) is now **Exposure gaps**. The same field label is renamed everywhere it appears as a label: column header and column picker, the "Coverage gap" label in the hover tooltips and the detail-page rows, and the "Coverage gap:" prefix in source status tooltips (now "Exposure gap:").
- On Device and Account details, the **Source coverage** card is now **Exposure gaps** (same content and rules as before).
- **Not renamed:** the **Source coverage** filter section in the filter panel and the new **Source coverage** table column (list of sources); the Exposure Summary page text ("Devices with coverage gaps", "Coverage gaps by group", "Coverage gaps by source"); and the Exposure Risk view description line.

### Opening details in a new tab (final build only, not in the prototype)
The prototype is a single HTML file and opens details in the same view. **In the real build, clicking a row opens the device or account details page in a new browser tab.** The prototype cannot do this, so do not try to imitate it there.
- **Real URLs.** Each device and account details page needs its own address (for example `/asset-explorer/devices/<id>` and `/asset-explorer/accounts/<id>`) that loads directly, including after a refresh or when shared.
- **Row click.** Clicking anywhere on the row opens the new tab, except the row checkbox, the hover tooltips and any other control inside the row. Enter on a focused row does the same.
- **Make the name a real link.** Render the first-column name as an actual anchor (`target="_blank"`, `rel="noopener"`) so Ctrl/Cmd-click, middle-click and "Copy link address" work like any link, and screen readers announce it as a link. The row click can reuse the same address.
- **Where it applies: only the table rows.** Clicking a row in the Devices or Accounts table opens the details page in a new tab. **All other links to details behave as before** (same tab): the Account assignment card, the Associated devices card, the account name link in the table, and links from the Exposure Summary page.
- **Breadcrumb in the new tab.** "Asset Explorer / Devices / <name>": the first two parts are links. They open the list in that tab, in its **default state** (Default view, no filters). The filters and view of the original tab are not carried over. This is accepted.
- **The original tab is unchanged** after the new tab opens: the selection and the filters stay as they were.

### Risk score and status pills share one style
- The **risk score** (a number) uses the same pill style as the status pills: 12px, weight 500, fully rounded (10px radius), 1px 8px padding, about 19px tall. Only the color differs (green, amber or red by band). The number keeps tabular figures and a minimum width of 34px so scores line up in the column.
- This applies everywhere the score pill appears: the table, the device details card, the account details lists and the hover tooltips.
