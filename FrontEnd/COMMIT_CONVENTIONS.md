# Commit Conventions

This project uses Conventional Commits, scoped to the phase from
`team-snake-game-spec.md`. Follow this format exactly — it makes it easy to see
which phase each commit belongs to when reviewing history.

## Format

```
<type>(<scope>): <short description>
```

- **Atomic Commits**: Each commit MUST be atomic. It should contain only a single, logical change. Do not bundle unrelated changes together.

[optional body — only if the change needs more explanation than the summary line]

## Type (pick one)

| Type       | When to use it                                             |
|------------|-------------------------------------------------------------|
| `feat`     | New functionality (most phase work will be this)            |
| `fix`      | Bug fix to existing functionality                            |
| `refactor` | Code restructuring with no behavior change                  |
| `style`    | Formatting, whitespace, lint fixes — no logic change         |
| `docs`     | Changes to spec/skill/convention markdown files only         |
| `chore`    | Tooling, dependencies, config, project setup                 |
| `test`     | Adding or updating tests                                     |

## Phase (scope)

Use the phase number and a short slug, e.g. `phase1-snake-core`,
`phase4-collision`, `phase9-confusion-orb`. Use `setup` for Phase 0. Use `repo` for
changes that aren't tied to one phase (e.g. editing this file).

## Examples

```
feat(phase1-snake-core): add keyboard input and direction change

feat(phase4-collision): implement head-to-head size comparison

fix(phase8-pipes): preserve boost state through pipe transit

docs(repo): update spec with multi-team debuff rules

chore(setup): scaffold Vite + React + Redux Toolkit project
```

## Rules

- One logical change per commit. Do not combine two phases' work in one commit.
- Keep the short description under ~72 characters, imperative mood ("add", not
  "added" or "adds").
- If a commit only partially completes a phase, that's fine — commit working
  increments rather than one giant commit per phase. Just keep the phase scope
  accurate.
- Never commit directly with a message like "fix stuff" or "wip" — always use the
  format above, even for small fixes.
