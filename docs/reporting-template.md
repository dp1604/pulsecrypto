# Reporting Template

**Owner:** task report format, proof artifacts, review ZIP policy, ChatGPT attachment conventions.

Process: [cursor-development-guide.md](./cursor-development-guide.md) · Review: [review-checklist.md](./review-checklist.md)

## Rule

Every Cursor task **must** end with **exactly one** fenced code block.

- The **first line inside** that block is: `PULSECRYPTO_CURSOR_REPORT`
- **Nothing** may appear **before or after** that fenced block in the final Cursor response.
- All explanation, warnings, limitations, attachment guidance, and status information must appear **inside** the report block.
- Agents **must emit** the block; optional wording is not permitted.
- Populate every section; use `N/A` or `None` when a section does not apply.

There are **no exceptions** for documentation-only tasks, blocked tasks, failed tasks, diagnostic tasks, or tasks with no changed files. When blocked or failed, return the complete report block and explain the blocker inside it.

## Decision Record

When a task involves an architectural, dependency, performance, state-management, networking, security, testing, or UI-system choice, populate **Decision Record** with concise, reviewer-oriented fields—not implementation narration.

- List **Options considered** and **Rejected alternatives** only when they were genuinely evaluated; do not fabricate alternatives.
- **Future impact** should state long-term consequences (ownership, debt, scaling, failure modes)—not restate what was built.
- Cross-cutting policy changes that require an ADR follow [architecture-principles.md](./architecture-principles.md#decision-making); the Decision Record summarizes task-level choices and points to ADRs when applicable.

If no meaningful decision was required, write under **Decision Record**:

```text
No material architectural decision required for this task.
```

## Mandatory report structure

Agents must copy this skeleton and fill every section:

```markdown
PULSECRYPTO_CURSOR_REPORT

Task ID:
Task:
Objective:
Overall result:
Verdict recommendation:
Accepted baseline:
Working tree status:

Analysis performed:
Implementation plan:

Decision Record:

Decision:
Context:
Options considered:
Trade-offs:
Chosen solution:
Why this solution:
Rejected alternatives:
Future impact:

Files created:
Files modified:
Files deleted:

Dependencies added:
Dependencies removed:
Dependencies updated:
Dependency rationale:

Figma MCP availability:
Figma file URL:
Figma node IDs inspected:
Figma screens/components inspected:
Figma icons/images/SVGs/assets exported:
Exported asset paths:
Screenshot fallback used:
Fallback reason:
Known visual deltas:

Commands run:
Validation results:
Typecheck:
Tests:
Expo Doctor:
Expo dependency check:
Android Emulator validation:
Runtime validation:
Performance validation:

Root cause:
Evidence:
Competing hypotheses tested:
Hypotheses rejected and why:
Remedy applied:

Proof artifacts:
Attachment links:
Review ZIP:
Secret preflight:
Archive exclusion verification:
ZIP integrity test:

Backend/shared changes:
Assignment requirements completed:
Assignment requirements remaining:
Staff Engineer / Mobile Architect evidence:

Deviations found:
Remedies for deviations:
Assumptions:
Technical debt:
Remaining risks:

Commit status:
Commit hash:
Push status:
Recommended next step:

ATTACH THESE FILES TO CHATGPT
```

## Proof artifacts

When proof artifacts exist (screenshots, logs, bundles, recordings), Cursor **must**:

1. **Copy** each artifact into:
   `/Users/dinithagamage/Documents/AI Projects/Pulse Crypto/`
2. **Confirm** each file exists on disk.
3. **Report** for each artifact:
   - filename
   - absolute path
   - Markdown local-file link: `[Open <filename>](file:///absolute/path/to/file)`
   - purpose
   - size
   - exists: YES/NO
4. List artifacts under **Proof artifacts** and **ATTACH THESE FILES TO CHATGPT**.

**Do not** report only `/tmp` paths as the final attachment location.

If no proof artifacts exist, write under **Proof artifacts**:

```text
No proof artifacts generated.
```

Figma UI tasks: also report MCP evidence per [figma-rules.md](./figma-rules.md).

## Review ZIP (mandatory)

Whenever **any repository file changes**—including documentation-only tasks—Cursor **must** create a fresh full-project review ZIP **before** emitting the final report.

### Secret preflight (required, fail closed)

Before packaging, scan the repository for secret-like local files (regular files **and symlinks**). **Do not package a secret-like file merely because it is Git-ignored.** If the preflight finds a candidate secret, **stop ZIP creation**, report **filenames only** (never read, print, or expose file contents), ask for human direction or safe removal from the review snapshot, and **never silently include** the file.

**Generic dotenv rule:** every basename starting with `.env` is a secret candidate, except these **exact** safe documentation templates:

- `.env.example`
- `.env.sample`
- `.env.template`

Do **not** exempt `.env.example.local`, `.env.template.production`, `.env.sample.secret`, or any other `.env*` variant.

Also detect: `.envrc`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*credentials*.json`, `*service-account*.json`, `google-services.json`, `GoogleService-Info.plist`.

```bash
cd "/Users/dinithagamage/Documents/AI Projects/Pulse Crypto/pulsecrypto"

SECRET_CANDIDATES="$(
  find . \
    \( -type f -o -type l \) \
    \( \
      -name '.env*' \
      -o -name '.envrc' \
      -o -name '*.pem' \
      -o -name '*.key' \
      -o -name '*.p12' \
      -o -name '*.pfx' \
      -o -iname '*credentials*.json' \
      -o -iname '*service-account*.json' \
      -o -name 'google-services.json' \
      -o -name 'GoogleService-Info.plist' \
    \) \
    -not -path './.git/*' \
    -not -path '*/node_modules/*' \
    -not -name '.env.example' \
    -not -name '.env.sample' \
    -not -name '.env.template'
)"

if [ -n "$SECRET_CANDIDATES" ]; then
  echo "Secret-like files detected; review ZIP creation stopped:"
  printf '%s\n' "$SECRET_CANDIDATES"
  exit 1
fi
```

If preflight fails, set **Verdict recommendation:** `BLOCKED`, record candidate filenames under **Review ZIP** or **Deviations found**, and request human direction in **Recommended next step**.

### Location and naming

- **Directory:** `/Users/dinithagamage/Documents/AI Projects/Pulse Crypto/`
- **Pattern:** `pulsecrypto_step_<TASK_ID>_<short_description>.zip`
- Example: `pulsecrypto_step_G1A_governance_hardening.zip`

### Exclusions

Primary: secret preflight (above). Secondary: explicit ZIP exclusions and approved-template re-inclusion (defense in depth).

- `node_modules/**`
- `.git/**`
- `.expo/**`
- `dist/**`
- `build/**`
- `coverage/**`
- `.turbo/**`
- `DerivedData/**`
- temporary caches
- all `.env*` files (re-add only the three exact approved templates afterward)
- `.envrc`, certificate/key material, credential JSON, Google mobile config files
- local proof artifacts (unless a task explicitly requests inclusion in the ZIP)

### Symlink safety

Use Info-ZIP **`-y`** so symbolic links are **stored as links**, not followed. A symlink may point to a credential or file outside the repository; storing the link prevents accidental inclusion of the target contents. The preflight still flags secret-like symlink **names**. This is defense in depth—not protection against every possible malicious archive condition.

### Creation command (reference)

Run secret preflight first. Then from the parent directory:

```bash
REPO_NAME="pulsecrypto"
ZIP_PATH="/Users/dinithagamage/Documents/AI Projects/Pulse Crypto/pulsecrypto_step_<TASK_ID>_<short_description>.zip"

cd "/Users/dinithagamage/Documents/AI Projects/Pulse Crypto"

SAFE_ENV_TEMPLATES="$(
  find "$REPO_NAME" -type f \
    \( \
      -name '.env.example' \
      -o -name '.env.sample' \
      -o -name '.env.template' \
    \)
)"

rm -f "$ZIP_PATH"

zip -yr "$ZIP_PATH" "$REPO_NAME" \
  -x "*/node_modules/*" \
     "*/.git/*" \
     "*/.expo/*" \
     "*/dist/*" \
     "*/build/*" \
     "*/coverage/*" \
     "*/.turbo/*" \
     "*/DerivedData/*" \
     "*/.env*" \
     "*/.envrc" \
     "*.pem" \
     "*/*.pem" \
     "*/*/*.pem" \
     "*.key" \
     "*/*.key" \
     "*/*/*.key" \
     "*.p12" \
     "*/*.p12" \
     "*/*/*.p12" \
     "*.pfx" \
     "*/*.pfx" \
     "*/*/*.pfx" \
     "*credentials*.json" \
     "*/*credentials*.json" \
     "*service-account*.json" \
     "*/*service-account*.json" \
     "google-services.json" \
     "*/google-services.json" \
     "GoogleService-Info.plist" \
     "*/GoogleService-Info.plist" \
     ".DS_Store" \
     "*/.DS_Store"

if [ -n "$SAFE_ENV_TEMPLATES" ]; then
  printf '%s\n' "$SAFE_ENV_TEMPLATES" | zip -y "$ZIP_PATH" -@
fi
```

Broad `*/.env*` exclusion removes the three approved templates; the `SAFE_ENV_TEMPLATES` step re-adds only those exact files when they exist.

### Post-creation archive verification (required)

After creating the ZIP, inspect archive **entry names**. **Fail the task** if forbidden content appears. Do not read or print file contents.

```bash
ARCHIVE_ENTRIES="$(unzip -Z1 "$ZIP_PATH")"

FORBIDDEN_ENTRIES="$(
  printf '%s\n' "$ARCHIVE_ENTRIES" |
    grep -E \
'(^|/)(node_modules|\.git|\.expo|dist|build|coverage|\.turbo|DerivedData)(/|$)|(^|/)\.env[^/]*$|(^|/)\.envrc$|\.(pem|key|p12|pfx)$|(^|/)[^/]*credentials[^/]*\.json$|(^|/)[^/]*service-account[^/]*\.json$|(^|/)google-services\.json$|(^|/)GoogleService-Info\.plist$' |
    grep -Ev \
'(^|/)\.env\.(example|sample|template)$'
)"

if [ -n "$FORBIDDEN_ENTRIES" ]; then
  echo "Forbidden review ZIP entries detected:"
  printf '%s\n' "$FORBIDDEN_ENTRIES"
  exit 1
fi
```

Expected when clean: **no output** from the final check; the pipeline exits **0** only when `FORBIDDEN_ENTRIES` is empty.

Then run integrity test:

```bash
unzip -t "$ZIP_PATH"
```

### Policy validation (disposable sentinels)

Validate ZIP policy changes in a **temporary directory outside the repository** (e.g. `/tmp/pulsecrypto_zip_policy_validation`). **Do not** place sentinel files inside the PulseCrypto repository.

Create safe and unsafe sentinel filenames, run preflight, packaging, and archive verification. Confirm unsafe sentinels are detected/blocked, approved templates survive in a clean ZIP, and symlink `-y` stores links without following targets. Remove the temporary directory and test ZIPs afterward.

### Report requirements

Under **Review ZIP**, include:

- ZIP filename
- absolute path
- Markdown link: `[Open ZIP](file:///absolute/path/to/zip)`
- size (bytes or human-readable)
- exists: YES/NO

Record verification outcomes:

- **Secret preflight:** PASS/FAIL
- **Archive exclusion verification:** PASS/FAIL
- **ZIP integrity test:** PASS/FAIL

Under **ATTACH THESE FILES TO CHATGPT**, include the review ZIP when it was created successfully. Individual governance or source files need not be listed separately when they are inside the ZIP.

If ZIP creation was blocked by preflight, state that under **Review ZIP** and omit the attachment link.

## Figma fields (UI/UX tasks)

For UI/UX implementation tasks, populate Figma sections per [figma-rules.md](./figma-rules.md). For non-UI tasks, set **Figma MCP availability:** `Not applicable` and leave related fields `N/A`.

Official file: [Pulse Crypto Mockup](https://www.figma.com/design/JYfr5h2vC9IFKtX3vasmZk/Pulse-Crypto-Mockup?node-id=0-1&p=f)

## ChatGPT review

Attach the review ZIP. Add proof artifacts separately only when they are not embedded in the ZIP and are required for review (runtime screenshots, log excerpts).

## Reporting anti-patterns

- Narrative before or after the final fenced block
- Skipping the review ZIP when files changed (unless preflight blocked creation—report BLOCKED instead)
- Packaging secret-like files because they are Git-ignored
- Using incorrect ZIP exclusions such as `*/.pem` (matches hidden files named `.pem`, not `client.pem`)
- Skipping secret preflight or post-creation archive verification
- `/tmp`-only artifact paths without copying to the proof directory
- Claiming Figma MCP use without invocation
- Claiming validation without command evidence
