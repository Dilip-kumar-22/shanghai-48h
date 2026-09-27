# Audit Remediation Ledger

Tracks every finding from the 2026-09-27 audit package (files `00`–`10` plus `MASTER_AUDIT.md`,
supplied outside the repository) and issues found while verifying it. Evidence for "Verified"
is in [docs/remediation/BASELINE.md](docs/remediation/BASELINE.md).

Verified: `CONFIRMED` (reproduced), `NEW` (found during verification), `CLEAN` (checked, no issue).

| ID    | Priority | Finding                                                                                        | Verified                            | Status | Files Changed | Verification |
| ----- | -------- | ---------------------------------------------------------------------------------------------- | ----------------------------------- | ------ | ------------- | ------------ |
| R-001 | P0       | Loader fails closed (module failure or stalled hero leaves it up)                              | CONFIRMED                           | TODO   | -             | -            |
| R-002 | P0       | Chapter text hidden by CSS unless JS runs (`.reveal`/`.kinetic` at opacity 0)                  | NEW                                 | TODO   | -             | -            |
| R-003 | P1       | Random loader progress + fixed 1.5 s minimum; LCP 2.9 s on a local server                      | CONFIRMED                           | TODO   | -             | -            |
| R-004 | P1       | Failed scene image stays invisible with no error state                                         | CONFIRMED                           | TODO   | -             | -            |
| R-005 | P1       | Web Audio not feature-detected (`TypeError` on click)                                          | CONFIRMED                           | TODO   | -             | -            |
| R-006 | P0       | Skip link targets `#bund`, is intercepted, never moves focus                                   | CONFIRMED                           | TODO   | -             | -            |
| R-007 | P1       | In-page links suppress hash/history updates                                                    | CONFIRMED                           | TODO   | -             | -            |
| R-008 | P2       | Debug globals `window.__frame` / `window.__lenis`                                              | CONFIRMED                           | TODO   | -             | -            |
| R-009 | P0       | `warmImages()` requests every scene image before the loader exits                              | CONFIRMED                           | TODO   | -             | -            |
| R-010 | P1       | JPEG-only, no `srcset`/`sizes`/`<picture>`/AVIF/WebP/intrinsic size                            | CONFIRMED                           | TODO   | -             | -            |
| R-011 | P2       | Per-frame `getBoundingClientRect()` reads (~325 layouts / 700 style recalcs per scroll pass)   | CONFIRMED                           | TODO   | -             | -            |
| R-012 | P2       | Progress bar and trail fill animate `width`/`height` (layout every frame)                      | NEW                                 | TODO   | -             | -            |
| R-013 | P2       | Permanent `will-change` on all scenes (31 layers, 50.3 MP)                                     | CONFIRMED                           | TODO   | -             | -            |
| R-014 | P3       | Full-screen blend/filter overlays may be costly on low-end GPUs                                | CONFIRMED (not measurable headless) | TODO   | -             | -            |
| R-015 | P0       | Lenis executed from jsDelivr at runtime                                                        | CONFIRMED                           | TODO   | -             | -            |
| R-016 | P1       | Lenis 1.1.14 outdated (current 1.3.26)                                                         | CONFIRMED                           | TODO   | -             | -            |
| R-017 | P1       | No package manifest or lockfile                                                                | CONFIRMED                           | TODO   | -             | -            |
| R-018 | P2       | Google Fonts loaded from third-party origins                                                   | CONFIRMED                           | TODO   | -             | -            |
| R-019 | P2       | No Content Security Policy                                                                     | CONFIRMED                           | TODO   | -             | -            |
| R-020 | P2       | No Dependabot                                                                                  | CONFIRMED                           | TODO   | -             | -            |
| R-021 | P2       | No CodeQL / automated security analysis                                                        | CONFIRMED                           | TODO   | -             | -            |
| R-022 | P2       | `main` unprotected, no rulesets                                                                | CONFIRMED                           | TODO   | -             | -            |
| R-023 | P3       | No `SECURITY.md`                                                                               | CONFIRMED                           | TODO   | -             | -            |
| R-024 | P3       | JPEG metadata unverified (GPS/author/tool)                                                     | CLEAN                               | TODO   | -             | -            |
| R-025 | P0       | Root commit carries `Co-Authored-By: Claude …` trailer (owner requested removal)               | CONFIRMED                           | TODO   | -             | -            |
| R-026 | P1       | Personal email exposed in public commit metadata                                               | CONFIRMED                           | TODO   | -             | -            |
| R-027 | P3       | Root commit unsigned                                                                           | CONFIRMED                           | TODO   | -             | -            |
| R-028 | P1       | Session git identity defaults to "Claude"; new commits would be misattributed                  | NEW                                 | TODO   | -             | -            |
| R-029 | P1       | Trail labels hidden on keyboard focus                                                          | CONFIRMED                           | TODO   | -             | -            |
| R-030 | P1       | Chapter navigation removed below 900 px                                                        | CONFIRMED                           | TODO   | -             | -            |
| R-031 | P2       | Trail hit targets small (10 px dot, ~18 px link box)                                           | CONFIRMED                           | TODO   | -             | -            |
| R-032 | P2       | Phone landscape (844×390): HUD overlaps chapter content                                        | NEW                                 | TODO   | -             | -            |
| R-033 | P3       | `viewport-fit=cover` without safe-area insets                                                  | NEW                                 | TODO   | -             | -            |
| R-034 | P3       | Forced-colors / high-contrast not handled or tested                                            | CONFIRMED                           | TODO   | -             | -            |
| R-035 | P3       | No reduced-data behavior                                                                       | CONFIRMED                           | TODO   | -             | -            |
| R-036 | P2       | Text contrast over imagery untested                                                            | CONFIRMED                           | TODO   | -             | -            |
| R-037 | —        | Reduced-motion support (strength to preserve)                                                  | CONFIRMED                           | TODO   | -             | -            |
| R-038 | P2       | Missing canonical, `og:url`/`type`/`site_name`, absolute `og:image`, Twitter card, theme color | CONFIRMED                           | TODO   | -             | -            |
| R-039 | P3       | No robots.txt / sitemap                                                                        | CONFIRMED                           | TODO   | -             | -            |
| R-040 | P3       | No structured data                                                                             | CONFIRMED                           | TODO   | -             | -            |
| R-041 | P2       | No dedicated 1200×630 social card                                                              | CONFIRMED                           | TODO   | -             | -            |
| R-042 | P1       | No README                                                                                      | CONFIRMED                           | TODO   | -             | -            |
| R-043 | P1       | No LICENSE                                                                                     | CONFIRMED                           | TODO   | -             | -            |
| R-044 | P2       | No asset provenance documentation                                                              | CONFIRMED                           | TODO   | -             | -            |
| R-045 | P1       | No CI, tests, linting or formatting                                                            | CONFIRMED                           | TODO   | -             | -            |
| R-046 | P2       | No reproducible build (Vite/TypeScript)                                                        | CONFIRMED                           | TODO   | -             | -            |
| R-047 | P2       | No performance budget / Lighthouse automation                                                  | CONFIRMED                           | TODO   | -             | -            |
| R-048 | P1       | Pages publishes the raw branch via Jekyll; a build step requires Actions deployment            | NEW                                 | TODO   | -             | -            |
| R-049 | P3       | Repository topics and homepage empty                                                           | CONFIRMED                           | TODO   | -             | -            |
| R-050 | P3       | No `.gitignore` / `.editorconfig`                                                              | CONFIRMED                           | TODO   | -             | -            |
| R-051 | P3       | 2026-06-04 Pages workflow run still displays the original commit message                       | NEW                                 | TODO   | -             | -            |
| R-052 | P3       | No cross-browser visual regression coverage                                                    | CONFIRMED                           | TODO   | -             | -            |
