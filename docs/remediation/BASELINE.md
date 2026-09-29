# Baseline — before remediation

Snapshot of the original site (root commit, message "feat: 48 Hours in Shanghai - cinematic
immersive scroll") taken on 2026-09-27, before any change in this remediation.

## Repository

| Item                             | Value                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Branches                         | `main` only (unprotected), no tags, no releases, no PRs, 0 forks                                       |
| Commits                          | 1 (unsigned)                                                                                           |
| Files                            | 12: `index.html`, `src/app.js`, `styles/main.css`, 8 JPEGs, `assets/favicon.svg`                       |
| Build / package manager          | none (zero-build; Lenis 1.1.14 imported from jsDelivr via import map)                                  |
| Deployment                       | GitHub Pages, legacy "Deploy from a branch" (`main`, root) built by Jekyll; one deployment, 2026-06-04 |
| CI, tests, lint, README, LICENSE | none                                                                                                   |

## Source images

| File          | Pixels    |                    Bytes |
| ------------- | --------- | -----------------------: |
| `garden.jpg`  | 2944×1664 |                1,101,302 |
| `nanjing.jpg` | 2944×1664 |                  822,326 |
| `pudong.jpg`  | 2944×1664 |                  546,856 |
| `bund.jpg`    | 2944×1664 |                  451,446 |
| `outro.jpg`   | 1920×1072 |                  398,898 |
| `hero.jpg`    | 2560×1440 |                  361,438 |
| `alley.jpg`   | 2944×1664 |                  257,659 |
| `food.jpg`    | 1920×1072 |                  203,142 |
| **Total**     |           | **4,143,067 (3.95 MiB)** |

All baseline (non-progressive) JPEGs. Embedded metadata is limited to three GDI+ resolution
tags (`0x5110`–`0x5112`): no GPS, camera, software, author, XMP, IPTC, ICC or C2PA data.

## Runtime measurements

Method: headless Chromium 141 (Playwright), original files served by a local static server. The
test browser cannot reach jsDelivr, so Lenis 1.1.14 was served from its npm tarball (the same
file jsDelivr serves). Google Fonts were mirrored locally so rendering matches production.
Network timings are therefore best-case; ratios, request counts and behaviors are the point.

| Measurement (desktop 1440×900)               | Result                                                                                                          |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| DOMContentLoaded / load                      | 43 ms / 109 ms                                                                                                  |
| Loader starts fading / fully gone            | 1,859 ms / 2,766 ms                                                                                             |
| Largest Contentful Paint                     | 2,896 ms — the `<h1>` span. Chrome excludes the full-viewport hero image from LCP, so LCP waits for the loader. |
| CLS                                          | 0.0044                                                                                                          |
| Scene images requested with **no scrolling** | all 8 (plus a duplicate `bund.jpg`), 4,594,513 bytes, before the loader finishes                                |
| Image formats served                         | `image/jpeg` only                                                                                               |
| Console errors / page errors                 | none (with dependencies reachable)                                                                              |
| Production globals                           | `window.__frame`, `window.__lenis`                                                                              |

| Behavior                      | Result                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Main module fails to load     | Loader still covering the page at 8 s; chapter text and headings at `opacity: 0`                                   |
| Hero request stalls           | Loader still covering the page at 8 s                                                                              |
| One scene image 404s          | Image stays at `opacity: 0`; no error state                                                                        |
| Skip link (Tab, Enter)        | Targets `#bund`; scrolls, but hash stays empty and focus stays on the skip link; next Tab goes to the Sound button |
| Trail link click              | Scrolls correctly; URL hash never updates (no shareable chapter URL)                                               |
| Deep link `/#pudong` on load  | Works: lands on chapter 03, HUD shows `03 Lujiazui`                                                                |
| "Scroll it again"             | Returns to top; hash unchanged                                                                                     |
| Keyboard focus on a trail dot | Label stays hidden (`opacity: 0`) unless that chapter is active                                                    |
| Sound on/off                  | Works; `aria-pressed` toggles                                                                                      |
| Sound with no Web Audio       | `TypeError: (window.AudioContext \|\| window.webkitAudioContext) is not a constructor`; button stays visible       |
| Reduced motion                | Loader gone at 752 ms, reveals visible, no Lenis, no parallax — correct                                            |
| Mobile 375/390/430/768 wide   | Chapter navigation `display: none`; no horizontal overflow; all images requested (up to 5.4 MB with duplicates)    |
| Phone landscape 844×390       | Fixed HUD overlaps the chapter tip line; chapter title 12 px from the top edge                                     |

## Scroll cost (one identical synthetic scroll pass, top to 90 %)

| Metric                             | Desktop, 4× CPU throttle | Mobile 390×844, 6× CPU throttle |
| ---------------------------------- | -----------------------: | ------------------------------: |
| Layouts                            |                  322–328 |                             356 |
| Style recalculations               |                  699–704 |                           1,271 |
| Layout time                        |               127–151 ms |                          219 ms |
| Style time                         |               353–362 ms |                          305 ms |
| Script time                        |               339–381 ms |                          869 ms |
| Frames over 33 ms                  |               91 of ~230 |                        0 of 439 |
| Compositor layers (drawing) / area |        31 (20) / 50.3 MP |               41 (26) / 15.3 MP |

Frame times in headless mode include software compositing, so GPU-side effects (blend modes,
grain, vignette) cannot be judged from this environment. Main-thread metrics are comparable
between runs; the two desktop runs agreed within about 10 %.
