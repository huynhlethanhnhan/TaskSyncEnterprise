# Cross-Browser Evidence Matrix

## Environment

| Browser | Executable evidence | Version | Result |
|---|---|---:|---|
| Google Chrome | `C:/Program Files/Google/Chrome/Application/chrome.exe` | 150.0.7871.181 | Installed; runtime suite blocked by unavailable application |
| Microsoft Edge | `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe` | 150.0.4078.83 | Installed and explicitly launched by Edge suite; runtime blocked |
| Firefox | Expected `C:/Program Files/Mozilla Firefox/firefox.exe` or `FIREFOX_PATH` | Unavailable | Failed prerequisite; not substituted with Chromium |

## Required execution matrix

No current-run screenshots or computed-style rows exist because `http://127.0.0.1/login` returned `ERR_CONNECTION_REFUSED`. Existing images under `docs/image/` predate this independent run and are not accepted as Phase 4.6 proof.

| Browser | Viewport(s) | Screenshot path | Console/network | Overflow/body/styles | Status |
|---|---|---|---|---|---|
| Chrome | 1584x900 | Not produced | Navigation failed before page load | Not measured | Blocked |
| Edge (actual) | 1584x900 | Not produced | Navigation failed before page load | Not measured | Blocked |
| Firefox | 1584x900 | Not produced | Browser executable absent | Not measured | Blocked |
| Chrome responsive | 1920x1080, 1584x900, 1440x900, 1366x768, 1024x768, 768x1024, 390x844, 375x667 | Not produced | Navigation failed before page load | Not measured | Blocked |

## Harness contract

`frontend/e2e-browser-audit.mjs` records, per browser/page/viewport:

- repository-relative screenshot path;
- console errors and failed requests;
- document/body client and scroll dimensions;
- document and element horizontal overflow;
- nested vertical scrollers;
- body, heading, and main `font-family`, `font-size`, `font-weight`, and `line-height`;
- `document.fonts.check('16px "Inter Variable"')`;
- browser version, executable path, viewport, and pass/fail.

Evidence is written to `docs/evidence/phase-4-6/` after a successful run. Until those JSON rows exist, the accepted wording is: **cross-browser functional parity not yet verified**. “100% parity” and pixel identity are not supported.

## Static layout findings

- The active `ApplicationShell.tsx` uses `min-h-screen`; `Sidebar.tsx` uses a sticky `h-screen`. The retired `MainLayout.jsx` contains additional `h-screen` and nested page scrolling but is not routed.
- The active shell does not impose a nested `main` scrollbar.
- Employee and task tables use `DataTableWrapper` with `overflow-x-auto`.
- Dashboard uses a bespoke `overflow-x-auto` wrapper and `min-w-[680px]`.
- Project, department, leave, and notification primary surfaces are cards/lists, not tables; they cannot substantiate a “shared table wrapper” claim.
