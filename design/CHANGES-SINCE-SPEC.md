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
| "Saved filters" with CAASM View as the built-in option | Renamed **Saved views**, with Default view, CAASM View and user-saved views (section 4). |
| "Filters are never hidden in a saved view" | Replaced: added filter sections **reset on every visit** unless saved in a view. |
| Column picker is a button at the far right of the table header | Removed from the header. It lives in the **View settings** menu (section 5). |
| "Export CSV" button at the far right | Replaced by an **Export** menu button (CSV, PDF) (section 5). |
| Cards above the tables are shown by default | Cards are **hidden by default**. The "Show cards" button still works. |
| "Every column has a filter, except Device name and Account name" | Still true, but most new columns' filters are addable rather than default (section 3). |
| Account details tabs: Overview, Source data, Devices | **Overview, Source data, Alerts.** The Devices tab is removed (the left-column card already lists them). Alerts is a placeholder. |
| Account Overview includes "Device exposure" | Removed. |
| Device Overview includes "Source correlation" and "Source conflicts" | Both removed from the Overview. Conflicts live on the Source data tab. |
| Device Overview and Account Overview use two columns | **One column** of label and value rows. |
| Page subtitles on Assets and CAASM overview, plus the helper lines on the Sources page and the "Coverage gaps by source" card | Removed. The only subtitle left is on the Assets page when CAASM View is selected. |

---

## 2. New fields (Devices and Accounts)

All of these are **columns, hidden by default**, available in the column picker. Defaults for existing columns are unchanged.

**Devices (16):** Authentication repository, NAS site, MAC vendor, Device manufacturer, Device model, Applications, Patches, Processes, Services, Peripherals, Browser, Browser extensions, AgentP version, Risk score violations, NAS IP, AgentP last reported.
**Accounts (3):** Authentication repository, NAS site, Location.

Details:
- **Authentication repository:** a NAC value, one of the identity sources (Active Directory, EntraID, Okta, Google Workspace). MAC-based accounts have none and show "—". A device inherits its account's repository.
- **NAS site and NAS IP:** options will come from the Sites tab. (confirm the real source.) NAS IP filtering is an **exact match**.
- **AgentP last reported:** when AgentP last sent status to Portnox Cloud. It is **not** the same as **Last connected**, which is the last network authentication. (confirm both exist as separate fields in the backend.)
- **List-type columns** (Applications, Patches, Processes, Services, Peripherals, Browser, Browser extensions, Risk score violations): show the first two values, then a hoverable "+N" whose tooltip lists all values ("All N" heading). Empty shows "—".
- **Column labels:** "NAS site", "AgentP last reported", "Risk score violations", "Peripherals", "Browser extensions".

---

## 3. Filters

### Default filter sections
- **Devices:** Device type, OS, Location, Account type, Group, Risk score, Status, Last connected, Source coverage.
- **Accounts:** Account type, Group, Blocked, Devices, Last login, Source coverage.
- Order in the panel: **+ Add filter** button, **Saved views**, then the default sections, then any added sections (in the order they were added).

### Add filter (addable sections)
- The "+ Add filter" button is the first thing in the filter panel. It opens a menu with a **search box** and groups:
  - **General:** Device manufacturer, Device model, Created time (Devices); Location (Accounts).
  - **Network (NAC):** Authentication repository, NAS site, MAC vendor, NAS IP, AgentP last reported (Devices); Authentication repository, NAS site (Accounts).
  - **Risk (NAC):** Risk score violation (Devices).
  - **On this device (NAC):** On this device, AgentP version (Devices).
- Choosing an item adds that section to the panel and opens it. Items already added show a check and cannot be clicked again.
- **There is no way to remove an added section.** The panel resets to the defaults on each visit. To keep a section, save a view (section 4). Values can still be cleared with the chips, "Clear" and "Clear all".
- Menu items have **no description text**. The names carry the meaning.

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
- The **Filters / Hide filters** button shows the count of active chips.

---

## 4. Saved views

- Shown at the top of the filter panel as radio buttons (single choice): **Default view**, **CAASM View**, then the user's saved views by name. Separate lists for Devices and Accounts.
- **Default view** and **CAASM View** are built in. Choosing either **resets** the table to that view's original layout (filters, added sections, columns, sort).
- A saved view stores: filter values, added filter sections, column visibility and order, sort, and whether it was built on CAASM View.
- Choosing a saved view restores all of it.
- **Saving:** *View settings → Save view* opens a dialog asking for a name. If a saved view is already active, the dialog also offers **Update "name"** and the main button becomes **Save as new**. Saving under an existing name updates that view. The new view appears in the radio list as the active view.
- **Unchanged check:** "unchanged" means the current filters, added sections, columns and sort equal the saved snapshot. Undoing a change makes it unchanged again.
- **Shared with everyone in the organization.** The Save dialog says so, and removal affects all users. (confirm: who may edit or remove a shared view, and whether private views are also needed.)
- No "modified" marker on the radio. Update is the way to keep changes.
- Rename is not built. (confirm whether needed.)

---

## 5. Table toolbar and pagination

Toolbar order, left to right: **Hide/Show filters** (with count), search box, selection actions, flexible space, **View settings**, **Export**.

### View settings (menu button)
| Item | Rule |
|---|---|
| Show/hide columns | Opens the column picker, anchored under the View settings button. Same picker as before (checkboxes, drag handles, arrows, "Reset to default", fixed first column). |
| Save view | Opens the naming dialog (section 4). |
| Share link | Copies a link to the view and shows "Link copied to clipboard". **Enabled only on a saved view with no unsaved changes.** Otherwise greyed out, with the tooltip "This view must be saved before you can share a link". The prototype does not generate a real link. |
| Remove view | **Enabled only on a saved view with no unsaved changes.** Greyed out on Default view, CAASM View, or a modified view, with the tooltip "This view cannot be removed". Clicking opens a confirmation: removes the view **for everyone in the organization, not just you**, and can't be undone. After removal the table resets to Default view (or CAASM View if the removed view was built on it). |

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
- **Left column, top to bottom:** Device details, **Current risk score** card, **Source coverage** card, **Account assignment** card.
- Device details panel: "Last time reported" is now **AgentP last reported**, followed by a new **Last connected** row.
- **Overview tab:** one section, **Device information**, in a single column. "Last reported time" is now **AgentP last reported**, and a new row **Last connected to network** follows it.
- **Source data tab:** if any field has a source conflict, an amber **warning icon** shows after the tab title ("Source data ⚠"). Hover text: "N field(s) differ across sources". No icon when sources agree. Conflict pills on individual Overview fields still link to this tab.

### Account details
- **Left column:** Account details, **Source coverage** card, Associated devices card.
- **Overview tab:** Account details only, in a single column.
- **Tabs:** Overview, Source data (with the same warning icon rule), Alerts (placeholder).

### Source coverage card (both pages)
- Header text: **Source coverage**. Styled like the other left-column cards: muted source name on the left, value on the right.
- Each row is **one line**: a source name, the status pill, then a muted time to the right of the pill, for example "Reporting 1h ago". The label "Last sync" is not shown.
- Time format: "<1h ago", "Nh ago", "Nd ago" once 48 hours or more. **Pending shows no time.** Not applicable and Not present show no time.
- **Max 5 rows.** If there are more, a link under the rows reads **"Show all (+N)"** (N = extra rows) and becomes **"Collapse"** when expanded. The card grows to fit. It resets to collapsed whenever a different device or account is opened.
- **Long source names** are cut off with an ellipsis. Only cut-off names get a tooltip with the full name.
- **Device card:** every connected source, in the connection order used elsewhere.
- **Account card:** only sources that report accounts (Active Directory, EntraID, Okta, Google Workspace), in type order. The "Show all" rule applies if more account sources are added later.
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
3. Filter panel: Add filter menu, default sections, See more popup, chips.
4. Table: new hidden columns, list cells, column picker, pagination.
5. Toolbar menus (View settings, Export) and their dialogs.
6. Saved views (state first, then the backend).
7. Detail pages: Source coverage card, single-column Overview, tab warning icon.
8. Accounts parity, then visual polish.
