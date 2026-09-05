# GitHub Pages Auditor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static GitHub Pages auditor that compares student repositories against this CAPSTONE APT122 base structure.

**Architecture:** Use a static HTML/CSS/JavaScript app. Keep comparison logic in a pure ES module so it can be tested with Node and reused by the browser UI.

**Tech Stack:** HTML, CSS, browser Fetch API, ES modules, `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-05-github-pages-auditor-design.md`

## Global Constraints

- Preserve the exact evidence names from the base repository.
- Do not add student application example code.
- Keep the expected structure ordered by phase and by the user-provided evidence order.
- Use `.gitkeep` only for empty directories that must be preserved by Git.
- Support public GitHub repositories without a backend.

---

### Task 1: Expected Structure And Audit Logic

**Files:**
- Create: `expected-structure.json`
- Create: `assets/structure-audit.js`
- Create: `tests/structure-audit.test.js`
- Create: `package.json`

**Interfaces:**
- Produces: `normalizePath(path: string): string`
- Produces: `flattenExpectedTree(nodes: Array<object>): Array<object>`
- Produces: `auditRepository(expectedEntries: Array<object>, actualEntries: Array<object>): object`

- [ ] Write failing tests for full compliance, missing entries, extras and `.gitkeep` alternatives.
- [ ] Run `npm test` and confirm the tests fail because the module does not exist.
- [ ] Add `expected-structure.json` with the ordered base tree.
- [ ] Implement `assets/structure-audit.js`.
- [ ] Run `npm test` and confirm the tests pass.

### Task 2: GitHub Pages Interface

**Files:**
- Create: `index.html`
- Create: `assets/styles.css`
- Create: `assets/app.js`
- Modify: `README.md`

**Interfaces:**
- Consumes: `auditRepository(expectedEntries, actualEntries)`
- Produces: browser UI that loads `expected-structure.json`, fetches GitHub tree data and renders the audit report.

- [ ] Create the HTML shell with repository URL input, optional token input, summary area and report sections.
- [ ] Add responsive CSS for a compact academic audit tool.
- [ ] Implement GitHub API fetching and report rendering.
- [ ] Update `README.md` with GitHub Pages activation instructions.
- [ ] Run local static server and inspect the page.

### Task 3: Final Verification

**Files:**
- Verify all created and modified files.

**Interfaces:**
- Consumes: complete static site and tests.
- Produces: evidence that the repo structure and page logic are valid.

- [ ] Run `npm test`.
- [ ] Run a filesystem checklist against the expected base structure.
- [ ] Start a local static server.
- [ ] Fetch the local page and key assets.
- [ ] Report exact verification results.
