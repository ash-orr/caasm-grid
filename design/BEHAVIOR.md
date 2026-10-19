# Behavior Spec

Screenshots for read-only reference capture: `design/screenshots/`.

Supplemental design changes: see `design/CHANGES-SINCE-SPEC.md` for later overrides and implementation notes. Where the two files disagree, the changes file wins.

The rulebook (behavior spec)
Terminology
Use Sources, not Integrations.
Stale is a source status: a device is in a source but hasn't sent data in the last day. A stale device is one where no connected source is Reporting.
Say Risk score whenever the number is meant. The cards say "Risk Policy score 70 or higher".
Supported sources
CrowdStrike, SentinelOne, Intune, Jamf, SOTI, Absolute Secure Endpoint, Portnox AgentP, EntraID, Active Directory, Okta, Google Workspace.
Short names in table headers: ASE (Absolute Secure Endpoint), AgentP, AD, Google. Hovering a header shows the full name. Everywhere else, use full names.
Order by type: EDR, then MDM, then Identity, then Directory, then NAC. (confirm) Absolute Secure Endpoint is filed under EDR as an approximation.
Which source applies to which device type (for example ASE for laptops and desktops, SOTI for mobile) is sample logic. (confirm)
Source statuses (per device or account, per source)
Status
Meaning
Color
Tooltip
Reporting
Present, and sent data within the last day
Green
This source sent data for the device within the last day.
Stale
Present, but nothing in the last day
Amber
The device is in this source, but it hasn't sent data in the last day.
Not present
The source has no record of it (a coverage gap)
Red
Coverage gap: This source has no record of the device.
Pending
First seen after the source's last poll; waiting for the next poll
Light grey
Waiting for this source's next sync.
Not applicable
The source doesn't cover this type
Light grey
This source doesn't cover this type of device.
The one-day threshold is a setting (confirm the real value, and whether it varies by source).
Pending is not a gap, not stale, and is left out of coverage percentages. In the source correlation table, the last-sync cell says "Awaiting next poll (~Nh)", where N is hours until that source's next scheduled poll.
Accounts only use Reporting, Not present and Not applicable. Account tooltips say "account" instead of "device".
Coverage gap means "Not present" sources only. It is shown as plain red text, listing the first two sources then "+N". Hovering "+N" lists all missing sources. "None" is in the normal text color.
Coverage percentages use applicable assets only: Not applicable and Pending are excluded from the denominator.
Risk
Risk score categories: Access (under 40, no issues), Alert (40 to 69, the device can connect but the admin is alerted), Blocked (70 and over, blocked for high risk). (confirm thresholds)
The risk score tooltip lists changes in the last 7 days, each as "time: old (category) → new (category)", or "No changes in the last 7 days".
Violations use these ten categories only: Administrator privileges, Antivirus, Applications, Certificates, Geolocation, Peripheral devices, Rootkit, Running services, Windows registry, Generative AI.
The access policy field shows a policy name, not "Block".
Risk information appears only on the Devices side. The CAASM dashboard shows no risk data.
Device status and blocking
Device Status column: Blocked, Archived, No issues. Archived takes priority over Blocked. (confirm) No issues is a light grey pill.
The Blocked pill tooltip lists only the reasons that apply: Blocked by Admin: name; Blocked by Policy: policy name; Blocked by Risk Score: score; Account blocked.
Accounts have a Blocked column: Blocked (red) or Not blocked (light grey). The tooltip lists Blocked by Admin and Blocked by Policy where they apply.
Assets page
Tabs: Devices, Accounts, Sites (a placeholder reading "NAS Sites table would go here"). No counts on the tab names.
A "Hide cards / Show cards" text button sits at the far right of the tab row on Devices and Accounts, separately for each.
Cards above the tables stay the same whatever view is selected:
Devices: Total devices, High-risk devices, Devices with coverage gaps, Stale devices.
Accounts: Total accounts, Blocked accounts, Accounts with coverage gaps.
Clicking a card applies it as a filter, and clicking it again clears it. If the cards are hidden while one is active, it shows as a removable chip above the table.
Table columns
Devices: Device name (fixed), Type, OS, Location, Account, Account type (plain text), Group, Risk score, Status, Last connected, Created time, Coverage gaps, then one column per connected source in type order.
Accounts: Account name (fixed), Account type (plain text), Group, Devices, Blocked, Last login, Coverage gaps, then one column per connected source that reports accounts (Okta, Google Workspace, Active Directory, EntraID).
Source columns show the status pill. They are sortable (Reporting first, then Stale, Pending, Not present, Not applicable). The pills are not clickable.
Hovering the account count in the Devices column shows up to three devices (highest risk first, then most gaps, then alphabetical) and "+N more". Hovering a device's Account shows account details. These tooltips are display-only.
Column picker: a button at the far right of the header. It lists every column, with checkboxes, drag handles and up/down arrows, and a "Reset to default" link. The fixed column is locked. Source columns are labeled "CAASM - [full source name]" in the picker only.
Saved filters and CAASM View
The top of the filter panel has Saved filters, with CAASM View as the built-in option. It is separate for Devices and Accounts.
CAASM View hides these columns by default (they stay in the picker):
Devices: Type, OS, Location, Group, Account type, Risk score, Status, Last connected, Created time.
Accounts: Account type, Group, Blocked, Last login.
Filters are never hidden in a saved view. A saved view stores filters, visible columns and sort order, so people's own saved views can be added later.
Filters
Every column has a filter, except Device name and Account name, which are found with the search box (which matches names, account, OS, location and group).
Multi-select sections are collapsible. Choices within one section are "any of". Different sections are "and".
A section with more than 5 options shows 5 and a "See more" link that opens a popup with all of them.
Devices: Device type, OS, Location, Account type, Group, Risk score (Access, Alert, Blocked), Status, Last connected (Last 24 hours, 1 to 7 days ago, Over 7 days ago), Created time (Last 7 days, 7 to 30, 30 to 90, Over 90 days ago), CAASM status.
Accounts: Account type, Group, Blocked, Devices (No devices, 1 to 2, 3 to 5, 6 or more), Last login (Today, 1 to 7 days ago, 8 to 30, Over 30), CAASM status.
CAASM status is a condition builder. Each row reads "[Source] is [Status]", rows combine with "and", and there is an "+ Add condition" button. Devices can choose Present (Reporting or Stale), Reporting, Stale, Pending or Not present. Accounts can choose Reporting or Not present. Active conditions also appear as removable chips above the table. Incomplete rows are ignored.
Selecting rows and actions
The header checkbox selects the current page. When a full page is selected and more rows exist, a bar offers "Select all N [devices/accounts]", which selects everything matching the current filters across all pages. Then it offers "Clear selection".
Selection survives sorting and paging, and resets when filters or search change.
Actions sit to the right of the search box and appear depending on how many rows are selected:
Action
Accounts
Devices
Add
Always
Not offered
Edit, Change group
Exactly 1 selected
Not offered
Block, Deactivate
1 or more
1 or more
Delete (red)
1 or more
1 or more
Export CSV stays at the far right and uses the selection count when there is one.
Device details
Left side: Device details, Current risk score (score, risk policy, violations, access policy), Account assignment (account, type, group, MFA removed, coverage gap, device list).
Tabs: Overview, Source data, On this device, Alerts, ZTNA access, Connection history (the last four are placeholders).
Overview: Device information (18 fields), Source correlation (Source, Status, Last sync), Source conflicts.
Conflicts: when sources disagree about a field, the Overview shows a Conflict pill with the details (for example "CrowdStrike, Okta → 20.1.374 · Portnox AgentP → 19.1.374"). Clicking it opens the Source data tab.
Source data: a Normalized / Raw toggle. Normalized shows merged values and agreement. Raw shows each source's own record, with disagreeing values highlighted.
Account details
Left side: Account details and Associated devices (name, type, last connected, risk score, coverage gap in red).
Tabs: Overview, Source data, Devices.
Overview: Account details (type, description, credentials expiry, created by, allow devices without AgentP, and for MAC-based accounts the MAC and vendor counts), Source correlation (same layout as devices), Device exposure.
MFA and privileged-account information was removed because that data isn't available. (confirm)
Sources page
Connected and Available sections, a search box and type filter chips (EDR, MDM, Identity, Directory, NAC).
Connected cards show status (Healthy, Syncing, Credentials expired) and last sync. All actions are in a three-dot menu: View devices, View accounts, Sync now, Edit credentials, Disconnect.
Adding a source: a dialog with the fields that source needs (API Source ID and API Shared Secret for now; each source will get its own form), a Test connection step that must pass, and a note that secrets are stored encrypted and can't be viewed again.
"Manage sources" on the CAASM dashboard goes to this page. Disconnecting warns how many assets will lose that source.
CAASM dashboard
Cards: Total assets, Devices with coverage gaps, Stale devices.
Coverage gaps by source: for each connected source, percentage and count of applicable devices and accounts that are Not present. Clicking a figure opens the matching filtered table.
Coverage gaps by group: percentage and count of devices with gaps per group, sorted highest first.
