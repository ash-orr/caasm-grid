# Behavior Spec

Screenshots for read-only reference capture: `design/screenshots/`.

The rulebook (behavior spec)

## Terminology
Use Sources, not Integrations.
Stale is a source status: a device is in a source but hasn't sent data in the last day. A stale device is one where no connected source is Reporting.
Say Risk score whenever the number is meant. The cards say "Risk Policy score 70 or higher".

## Supported sources
CrowdStrike, SentinelOne, Intune, Jamf, SOTI, Absolute Secure Endpoint, Portnox AgentP, EntraID, Active Directory, Okta, Google Workspace.
Short names in table headers: ASE (Absolute Secure Endpoint), AgentP, AD, Google. Hovering a header shows the full name. Everywhere else, use full names.
Order by type: EDR, then MDM, then Identity, then Directory, then NAC. (confirm) Absolute Secure Endpoint is filed under EDR as an approximation.
Which source applies to which device type (for example ASE for laptops and desktops, SOTI for mobile) is sample logic. (confirm)

## Source statuses
Source statuses (per device or account, per source):

- Reporting: Present, and sent data within the last day. Green. This source sent data for the device within the last day.
- Stale: Present, but nothing in the last day. Amber. The device is in this source, but it hasn't sent data in the last day.
- Not present: The source has no record of it (an exposure gap). Red. Exposure gap: This source has no record of the device.
- Pending: First seen after the source's last poll; waiting for the next poll. Light grey. Waiting for this source's next sync.
- Not applicable: The source doesn't cover this type. Light grey. This source doesn't cover this type of device.

The one-day threshold is a setting (confirm the real value, and whether it varies by source).
Pending is not a gap, not stale, and is left out of coverage percentages. In the source correlation table, the last-sync cell says "Awaiting next poll (~Nh)", where N is hours until that source's next scheduled poll.
Accounts only use Reporting, Not present and Not applicable. Account tooltips say "account" instead of "device".
Exposure gap means "Not present" sources only. It is shown as plain red text, listing the first two sources then "+N". Hovering "+N" lists all missing sources. "None" is in the normal text color.
Coverage percentages use applicable assets only: Not applicable and Pending are excluded from the denominator.

## Risk
Risk score categories: Access (under 40, no issues), Alert (40 to 69, the device can connect but the admin is alerted), Blocked (70 and over, blocked for high risk). (confirm thresholds)
The risk score tooltip lists changes in the last 7 days, each as "time: old (category) → new (category)", or "No changes in the last 7 days".
Violations use these ten categories only: Administrator privileges, Antivirus, Applications, Certificates, Geolocation, Peripheral devices, Rootkit, Running services, Windows registry, Generative AI.
The access policy field shows a policy name, not "Block".
Risk information appears only on the Devices side. The CAASM dashboard shows no risk data.

## Device status and blocking
Device Status column: Blocked, Archived, No issues. Archived takes priority over Blocked. (confirm) No issues is a light grey pill.
The Blocked pill tooltip lists only the reasons that apply: Blocked by Admin: name; Blocked by Policy: policy name; Blocked by Risk Score: score; Account blocked.
Accounts have a Blocked column: Blocked (red) or Not blocked (light grey). The tooltip lists Blocked by Admin and Blocked by Policy where they apply.

## Assets page
Tabs: Devices, Accounts, Sites (a placeholder reading "NAS Sites table would go here"). No counts on the tab names.
The card controls were removed. The page starts with the table for the selected tab, with no quick filters or preset cards. Opening Devices from a group link on the Exposure Summary page only filters by that group.

## Table columns
Devices: Device name (fixed), Type, OS, Location, Account, Account type (plain text), Group, Risk score, Status, Last connected, Created time, Exposure gaps, then one column per connected source in type order.
Accounts: Account name (fixed), Account type (plain text), Group, Devices, Blocked, Last login, Exposure gaps, then one column per connected source that reports accounts (Okta, Google Workspace, Active Directory, EntraID).
Source columns show the status pill. They are sortable (Reporting first, then Stale, Pending, Not present, Not applicable). The pills are not clickable.
Hovering the account count in the Devices column shows up to three devices (highest risk first, then most gaps, then alphabetical) and "+N more". Hovering a device's Account shows account details. These tooltips are display-only.
Column picker: a button at the far right of the header. It lists every column, with checkboxes, drag handles and up/down arrows, and a "Reset to default" link. The fixed column is locked. Source columns are labeled "CAASM - [full source name]" in the picker only.

## Selection checkbox column width (Devices and Accounts tables)
The select-all / row checkbox column is a fixed 44px wide on both tables (Devices and Accounts), with 12px padding each side, so the distance from the checkbox to the first data column is the same on both. Sites is a placeholder and has no table yet.

## Fields
All of these are columns, hidden by default, available in the column picker. Defaults for existing columns are unchanged.

### Devices
Devices (16, plus Source coverage below): Authentication repository, NAS site, MAC vendor, Device manufacturer, Device model, Applications, Patches, Processes, Services, Peripherals, Browser, Browser extensions, AgentP version, Risk score violations, NAS IP, AgentP last reported.

- Authentication repository: a NAC value, one of the identity sources (Active Directory, EntraID, Okta, Google Workspace). MAC-based accounts have none and show "—". A device inherits its account's repository.
- NAS site and NAS IP: options will come from the Sites tab. (confirm the real source.) NAS IP filtering is an exact match.
- AgentP last reported: when AgentP last sent status to Portnox Cloud. It is not the same as Last connected, which is the last network authentication. (confirm both exist as separate fields in the backend.)
- List-type columns (Applications, Patches, Processes, Services, Peripherals, Browser, Browser extensions, Risk score violations): show the first two values, then a hoverable "+N" whose tooltip lists all values ("All N" heading). Empty shows "—".
- Per-source status columns are hidden by default in the Default view and visible in Exposure Risk view. "Reset to default" follows the same rule for the current view.
- Source coverage column (new, Devices and Accounts, hidden by default in both views): plain text listing the connected sources that have this record, in the same short names as the per-source columns. Empty shows "—". The cell is capped at 250px with an ellipsis, with a dotted underline and a tooltip with the full text. Sorting by this column sorts by the number of sources. Placed right after Exposure gaps in the default column order.
- Column labels: "NAS site", "AgentP last reported", "Risk score violations", "Peripherals", "Browser extensions".

### Accounts
Accounts (3): Authentication repository, NAS site, Location.

### Overview Sources column
The Overview Sources column uses a green "Agree" pill followed by "N source(s)". The singular form is used when N is 1. The older compact phrasing is not used.

## Filters
Saved filters and CAASM View are now Saved views. The top of the filter panel shows radio buttons for Default view, Exposure Risk view and saved views, separate for Devices and Accounts.

### Default filter sections
- Devices: Device type, OS, Location, Account type, Group, Risk score, Status, Last connected, Source coverage.
- Accounts: Account type, Group, Blocked, Devices, Last login, Source coverage.
- Order in the panel: Saved views, then the default sections, then any added sections in the order they were added, then the Manage filters button at the bottom.

### Manage filters
A full-width Manage filters button sits at the bottom of the filter panel. It opens a centered dialog with a title "Manage filters (N shown)", a live count, a one-line help text, a search box and checkboxes grouped by default filters, general, network, risk and on-this-device sections.
Checked means the section is shown in the panel. Selection is staged until Apply. The dialog opens with the currently shown filters checked. Unchecking removes the section and clears its selection. Hidden defaults and added sections reset on each visit and when selecting Default view or Exposure Risk view. Saved views store both a hidden-defaults list and an added-sections list, and unchanged detection compares both.

### Filter semantics
- Every column has a filter, except Device name and Account name, which are found with the search box (matching names, account, OS, location and group).
- Multi-select: any of within a filter, and between filters.
- On this device: one section containing rows of "[Category] [Value]". Categories include Applications, Patches, Processes, Services, Peripherals, Browser and Browser extensions. Same category rows are any-of. Different categories are all-of. Incomplete rows are ignored.
- AgentP version: a checklist of exact versions plus an "Older than" dropdown (version comparison, not text comparison).
- Risk score violation: any-of across the ten violation categories.
- AgentP last reported: buckets (Last 24 hours, 1 to 7 days ago, Over 7 days ago).

### See more popup
A section with more than five options shows a "See more" link. The popup includes a search box, Cancel and Add filter actions, and a live title with the selected count. A search with no match shows "No options match."

### Chips
Every active filter shows as a removable chip above the table, including source-coverage conditions and the active card. After five chips, a "+N more filters" link expands the rest and "Show fewer" collapses it. A Clear all link sits at the end. The filters toggle is an icon button with a badge that shows the count of active chips, a tooltip and aria state.

## Selecting rows and actions
The header checkbox selects the current page. When a full page is selected and more rows exist, a bar offers "Select all N [devices/accounts]", which selects everything matching the current filters across all pages. Then it offers "Clear selection".
Selection survives sorting and paging, and resets when filters or search change.
Actions sit to the right of the search box and appear depending on how many rows are selected:

| Action | Accounts | Devices |
|---|---|---|
| Add | Always | Not offered |
| Edit, Change group | Exactly 1 selected | Not offered |
| Block, Deactivate | 1 or more | 1 or more |
| Delete (red) | 1 or more | 1 or more |

The toolbar includes an Export menu button (CSV, PDF). Both use the selection count if rows are selected, otherwise all rows matching the filtersunt if rows are selected, otherwise all rows matching the filters.

## Saved views
- Shown at the top of the filter panel as radio buttons: Default view, Exposure Risk view, then user-saved views by name. Separate lists for Devices and Accounts.
- Default view and Exposure Risk view are built in. Choosing either resets the table to that view's original layout (filters, added sections, columns, sort).
- A saved view stores: filter values, added filter sections, column visibility and order, sort, and whether it was built on Exposure Risk view.
- Choosing a saved view restores all of it.
- Saving: Views → Save view opens a dialog asking for a name. If a saved view is already active, the dialog also offers Update "name" and the main button becomes Save as new. Saving under an existing name updates that view. The new view appears in the radio list as the active view.
- Unchanged means the current filters, added sections, columns and sort equal the saved snapshot. Undoing a change makes it unchanged again.
- Shared with everyone in the organization. The Save dialog says so, and removal affects all users. (confirm: who may edit or remove a shared view, and whether private views are also needed.)
- Rename is not built. (confirm whether needed.)

## Toolbar and pagination
Toolbar order, left to right: Filters icon button with count badge, search box, selection actions, flexible space, Columns icon button, Views menu button, Export menu button.

### Columns (icon button)
A columns icon button opens the column picker directly under the button's right edge. Clicking it again closes the picker. Opening Views or Export closes the picker. The picker supports checkboxes, drag handles, arrows, Reset to default and a fixed first column.

### Views (menu button)
The saved-views list stays in the filter panel because it depends on the filters selected. The menu replaces the old View settings menu.

- Save view: opens the naming dialog.
- Share link: copies a link to the view and shows "Link copied to clipboard". Enabled only on a saved view with no unsaved changes. Otherwise it is greyed out with the tooltip "This view must be saved before you can share a link".
- Remove view: enabled only on a saved view with no unsaved changes. Greyed out on Default view, Exposure Risk view or a modified view, with the tooltip "This view cannot be removed". Clicking opens a confirmation. Removal affects everyone in the organization and cannot be undone. After removal the table resets to Default view or Exposure Risk view if the removed view was built on it.

### Export (menu button)
Export (CSV) and Export (PDF). Both use the selection count if rows are selected, otherwise all rows matching the filters.

### Pagination
Footer left: row count and selection count. Footer right: Rows per page dropdown, then Prev, Page X of Y, Next.
Options: 50 (default), 100, 200, 500, Show all. Show all puts every row on one page. Changing the size returns to page 1 and keeps the selection. Devices and Accounts remember their own size while the page is open.

## Detail pages
### Device details
Left column, top to bottom: Device details, Current risk score card, Exposure gaps card, Account assignment card.
Device details panel: "Last time reported" is now AgentP last reported, followed by a new Last connected row.
Overview tab: one section, Device information, in a single column. "Last reported time" is now AgentP last reported, and a new row Last connected to network follows it.
The Overview card has a single status pill at the top: "N field(s) differ across sources" (amber) or "All sources agree" (green), hidden when no source reports the record. The inline Conflict notes are removed and replaced by the Sources column.
Rows backed by sources show a green "Agree" pill followed by "N source(s)" or an amber Conflict pill followed by the source details. Rows with no source data leave the Sources column empty. Added rows include Hostname, OS version and Last seen by sources, which sits directly under the section heading above the status pill and the column headers as "Last seen by sources: <time> · Most recent: <source>". Vendor and Device model keep their rows and gain the column.
Raw values are per row and do not use a global Normalized / Raw toggle. Only rows with a Conflict show a View raw values link under their Sources text. It expands the values inside the same row, with differing lines tinted amber. It lists each reporting source with its raw field name and value, such as `Okta  "osVersion": "11.1.721"`. The link becomes Hide raw values. Several rows can be open at once. Open rows reset when another record is opened.
Warning icon: shows after the Overview tab title when any field conflicts; hover text is "N field(s) differ across sources". It no longer appears on Exposure coverage.
No section heading appears inside tabs: the Device information or Account details heading on Overview and the Exposure gaps heading on Exposure coverage are removed; the tab title is the heading.
Exposure coverage tab: stays, with a table of Source, Status and Last seen. One row per connected source, sorted by status then name. Always expanded. A Find a source search box filters rows live by name. No match shows "No sources match \"…\"". The search clears when another record is opened.

### Account details
Left column: Account details, Exposure gaps card, Associated devices card.
Overview tab: Account details only, in a single column. Same Field | Value | Sources layout and per-row View raw values as devices. Rows include Account name, Account type, Group, Description, and the rest. Warning icon on the Overview tab title when sources conflict. "Last login by sources" sits directly under the heading, above the status pill, as "<time> · Reported by <sources>" (time reads "Today" or "N days ago").
Tabs: Overview, Exposure coverage, Alerts. The Devices tab is removed because the left-column card already lists them. Alerts is a placeholder.
MFA and privileged-account information was removed because that data isn't available. (confirm)

## Row hover on detail pages
Rows in the detail page tables (the Overview Field / Value / Sources rows, the "Last seen by sources" row, and the Exposure coverage source rows) get a very light grey background on hover, using a new token `--row-hover` (light `#f5f7f9`, dark `#1b2733`). The highlight extends 8px past the row's text on both sides (drawn outside the layout, so nothing moves). Header rows (Field / Value / Sources, Source / Status / Last seen) do not highlight. These rows are not clickable, so the pointer stays the default arrow and the hover is only a reading aid. This is deliberately different from the Devices/Accounts tables, whose rows are clickable and use the accent tint (`--acc-s`).

### Exposure gaps card (both pages)
Header text: Exposure gaps. Styled like the other left-column cards: muted source name on the left, value on the right.
Each row is one line: a source name, the status pill, then a muted time to the right of the pill. Time format: "<1h ago", "Nh ago", "Nd ago" once 48 hours or more. Pending shows no time. Not applicable and Not present show no time.
Order: by status then by name within the same status. Status order: Not present, Stale, Pending, Reporting, Not applicable.
Collapsed by default, issues only. The card shows only sources that need attention: Not present, Stale and Pending. No row cap. Below the rows a link reads "+N Reporting" or "+N Reporting, M Not applicable" when some rows are hidden. Clicking expands the card to show every source in the order above, and the link becomes Hide details.
All sources reporting: when no source has an issue and at least one is Reporting, the card shows "All sources reporting" and a See details link. Expanding shows every source, including Not applicable; the link becomes Hide details.
No link when there is nothing hidden, and no collapse when no source is Reporting and none has an issue.
Resets to collapsed whenever a different device or account is opened.
Long source names are cut off with an ellipsis. Only cut-off names get a tooltip with the full name.
Device card: every connected source.
Account card: only sources that report accounts (Active Directory, EntraID, Okta, Google Workspace). The same collapse rules apply.
For accounts, the time shown for a Reporting source is that source's last sync time. (confirm the real per-account last-seen time.)

## Sources page
Connected and Available sections, a search box and type filter chips (EDR, MDM, Identity, Directory, NAC).
Connected cards show status (Healthy, Syncing, Credentials expired) and last sync. All actions are in a three-dot menu: View devices, View accounts, Sync now, Edit credentials, Disconnect.
Adding a source: a dialog with the fields that source needs (API Source ID and API Shared Secret for now; each source will get its own form), a Test connection step that must pass, and a note that secrets are stored encrypted and can't be viewed again.
"Manage sources" on the CAASM dashboard goes to this page. Disconnecting warns how many assets will lose that source.

## CAASM dashboard
Cards: Total assets, Devices with coverage gaps, Stale devices.
Coverage gaps by source: for each connected source, percentage and count of applicable devices and accounts that are Not present. Clicking a figure opens the matching filtered table.
Coverage gaps by group: percentage and count of devices with gaps per group, sorted highest first.

## Visual details to match
- Dropdowns (all select elements): custom chevron, with 30px of space to the right of the chevron so it never touches the border. One shared style for the filter panel, filter conditions, popups and Rows per page.
- Checkboxes and radios in filter lists are 15px, vertically centered on their labels, with consistent spacing. Do not let the browser default margins through.
- Filter-panel links (See more, + Add condition) use the same font size as the filter options (12.5px).
- Dark mode: primary action buttons use #1D4954 (with white text), and link text uses #4fb8d4. Light mode is unchanged.
- Grey-out style for disabled menu items: reduced opacity and a not-allowed cursor, with a hover tooltip instead of the browser default.

## Button styling (Figma Button v2)
The shared button contract follows the prototype in `design/prototype/caasm-console.html`.

- Secondary buttons are the default style: outlined cyan border and text, with a very light cyan hover and pressed fill; disabled secondary buttons use the muted disabled token set.
- Primary buttons use the solid teal background (`--b-pri`), with hover/pressed variants (`--b-pri-h`, `--b-pri-p`) and white text. Dark mode keeps the same layout but swaps to the dark teal values.
- Tertiary buttons are transparent, borderless, and have no visible background unless hovered/pressed; disabled tertiary buttons remain transparent with the disabled token palette.
- Destructive buttons use red text and red hover/pressed surfaces, or a solid red primary destructive button. Every delete action uses the destructive style.
- Icon buttons keep the tighter padding `7px 9px`; text buttons stay at `7px 12px`.
- The border radius is `4px` and the button heights remain the existing fixed heights from the prototype.
- The button system does not adopt the Open Sans/28px small-size variant or the loading-state button pattern from the old design.
- A tertiary destructive style is defined in the shared tokens and can exist, but it is intentionally unused in the current UI.

## Backend questions
Add these to the original questions and assumptions:

1. Saved views: stored where? Shared with the whole organization or per user? Who may update or remove a shared view? Is there an audit log for removals?
2. Share link: what does the link contain (the view's id, or the filters themselves)? What happens if the recipient lacks permission, or the view has since been removed?
3. Sites: where do NAS site names and NAS IPs come from? The filter options and the Site and NAS IP columns should use the Sites table.
5. Authentication repository: the field is shown for devices as the account's repository. Is that how the backend defines it?
6. List fields (applications, patches, processes, services, peripherals, browser, extensions): are they returned as full lists, and are filters evaluated server-side? Large lists may need server-side filtering and a count in the table.
7. AgentP version "older than": does the backend compare versions numerically? Which version format does it use?
8. PDF export: what does the PDF contain (the visible columns, or all)? Is there a row limit?
9. Rows per page up to Show all: is there a maximum the backend allows?

## Top navigation bar
Not part of this repo's UI: provided by the host app.

## Renames: Exposure gaps (2026-10-19)
The Coverage gaps column (Devices and Accounts tables) is now Exposure gaps. The same field label is renamed everywhere it appears as a label: column header and column picker, the "Coverage gap" label in the hover tooltips and the detail-page rows, and the "Coverage gap:" prefix in source status tooltips (now "Exposure gap:").
On Device and Account details, the Source coverage card is now Exposure gaps (same content and rules as before).
Not renamed: the Source coverage filter section in the filter panel and the new Source coverage table column (list of sources); the Exposure Summary page text ("Devices with coverage gaps", "Coverage gaps by group", "Coverage gaps by source"); and the Exposure Risk view description line.

## Opening details in a new tab
The prototype is a single HTML file and opens details in the same view. In the real build, clicking a row opens the device or account details page in a new browser tab. The prototype cannot do this, so do not try to imitate it there.

- Real URLs: each device and account details page needs its own address (for example `/asset-explorer/devices/<id>` and `/asset-explorer/accounts/<id>`) that loads directly, including after a refresh or when shared.
- Row click: clicking anywhere on the row opens the new tab, except the row checkbox, the hover tooltips and any other control inside the row. Enter on a focused row does the same.
- Make the name a real link: render the first-column name as an actual anchor (`target="_blank"`, `rel="noopener"`) so Ctrl/Cmd-click, middle-click and Copy link address work like any link, and screen readers announce it as a link. The row click can reuse the same address.
- Where it applies: only the table rows. Clicking a row in the Devices or Accounts table opens the details page in a new tab. All other links to details behave as before (same tab): the Account assignment card, Associated devices card, account name link in the table, and links from the Exposure Summary page.
- Breadcrumb in the new tab: "Asset Explorer / Devices / <name>": the first two parts are links. They open the list in that tab in its default state (Default view, no filters). The filters and view of the original tab are not carried over.
- The original tab is unchanged after the new tab opens: the selection and the filters stay as they were.

## Risk score and status pills share one style
The risk score uses the same pill style as the status pills: 12px, weight 500, fully rounded (10px radius), 1px 8px padding, about 19px tall. Only the color differs (green, amber or red by band). The number keeps tabular figures and a minimum width of 34px so scores line up in the column.
This applies everywhere the score pill appears: the table, the device details card, the account details lists and the hover tooltips.

## Devices not covered by Portnox AgentP
Some devices (about 1 in 9 in the prototype, for example SRV-1028, MB-1091, IOT-1154) are not covered by Portnox AgentP. They only have data from the connected sources.
For these devices, Risk score, Status, Location, Account type, Group, AgentP last reported, Last connected, Last network authentication type, AgentP version and Stale all show "—" (table and detail). Never show "null", 0 or "No".
The device panel's Current risk score card is replaced with: "Not available. This device is not covered by Portnox AgentP, so only data from your connected sources is shown."
The Exposure gaps card lists "Portnox AgentP: Not present" for them.
Risk score filters and sorting must tolerate empty scores (empty sorts last).
Source columns and Source coverage text list Portnox first, then the other sources in the existing order. The AgentP source column header is now Portnox (short name). Other "AgentP ..." labels remain unchanged.
Location, Account type, Group and Status come from AgentP/NAC, so they are empty for these devices (table, filters, device panel, Overview). Filters on those fields never match them.
Sorting: empty values always sort last, in both ascending and descending order, for example Risk score on uncovered devices.

## Suggested order for the port
1. Types and mock data for the new fields.
2. Filter logic as pure, unit-tested functions (any-of, and, exact IP, older-than, on-this-device).
3. Filter panel: Manage filters dialog, default sections, See more popup, chips.
4. Table: new hidden columns, list cells, column picker, pagination.
5. Toolbar: Columns icon button, Views menu, Export menu and their dialogs.
6. Saved views (state first, then the backend).
7. Detail pages: Source coverage card, single-column Overview, tab warning icon.
8. Accounts parity, then visual polish.

## Backend notes and source of truth
The source of truth for look and feel is `design/prototype/caasm-console.html`.

