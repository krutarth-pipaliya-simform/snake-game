# Git Hooks Setup

The `.githooks/pre-commit` script enforces atomic commits — it blocks commits that
touch multiple phases in one go, catching mixed-phase work before it lands.

## Installation

After cloning/setting up your repo locally:

```bash
# 1. Copy the hook into your actual .git directory
cp .githooks/pre-commit .git/hooks/pre-commit

# 2. Make it executable (bash on macOS/Linux)
chmod +x .git/hooks/pre-commit

# 3. (Windows only) If you're on WSL/Git Bash, ensure it's executable
chmod +x .git/hooks/pre-commit
```

## What it does

When you try to commit:

1. **Checks the branch name** — extracts the phase scope (e.g. `feat/phase4-collision` → `phase4`).
2. **Scans staged files** — uses heuristics to guess which phase each file belongs to
   (e.g. `collision.ts` → phase 4, `pipes.ts` → phase 8).
3. **Blocks if mixed** — if staged files belong to different phases, the commit fails
   with a message like:

   ```
   ❌ ERROR: This commit touches multiple phases:
      phase4
      phase8
   
   Atomic commits should touch only ONE phase.
   ```

4. **Allows it if atomic** — if all staged files map to the same phase (or can't be
   mapped, which skips the check), the commit proceeds normally.

## Bypass (if absolutely necessary)

If you need to skip the hook for one commit (not recommended):

```bash
git commit --no-verify
```

This should be rare — if you find yourself doing it often, re-read `BRANCH_NAMING.md`
and `COMMIT_CONVENTIONS.md` to make sure you're splitting work correctly.

## Heuristics

The hook uses simple filename patterns to guess phase:

- `collision*` → phase 4
- `pipe*`, `transit*` → phase 8
- `orb*`, `debuff*`, `confusion*` → phase 9
- `highlight*`, `color*`, `team*` → phase 10
- `realtime*`, `broadcast*` → phase 3
- `movement*`, `snake*`, `pellet*` → phase 1
- `round*`, `timer*`, `respawn*` → phase 6

If a file doesn't match any pattern, it's skipped. This means the hook can have
false negatives (allowing a mixed commit if files don't have phase-indicative names)
but not false positives (false blocks).

## If the hook blocks you incorrectly

If a commit is legitimately atomic but the hook blocks it (e.g. you renamed a file
and it touched multiple "phase-like" patterns), review what's staged:

```bash
git diff --cached --name-only
```

And either:
- Split the commit if it's actually mixed phases, or
- Use `git commit --no-verify` and note why in the commit message body.
