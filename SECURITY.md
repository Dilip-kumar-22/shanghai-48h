# Security policy

## Reporting a vulnerability

Report privately through GitHub: open the repository's **Security** tab and choose **Report a
vulnerability**. Please do not open a public issue for security problems.

## Scope

The deployed static site and the build, test and deployment tooling in this repository. The site
has no backend, accounts, forms, cookies or client-side storage.

## Measures in place

- No third-party code at runtime: JavaScript and fonts are bundled from locked npm dependencies.
- Content Security Policy, delivered as a `<meta>` element: same-origin scripts, styles, fonts and
  images only; Trusted Types required for script sinks; no plugins, frames or form targets.
- Dependabot version updates (new releases wait seven days; security updates do not) and CodeQL
  analysis of the TypeScript and the GitHub Actions workflows.
- Deployment only after linting, type checks, browser tests and Lighthouse budgets pass.

## Known limitation

GitHub Pages cannot set response headers, so protections that only work as headers
(`frame-ancestors`, `X-Frame-Options`, CSP reporting) are not available on this host.
