# Commit Conventions

## Format
```
<type>(<scope>): <short description>
```

- **Atomic Commits**: Each commit MUST be atomic. It should contain only a single, logical change. Do not bundle unrelated changes together. If a feature touches the backend and frontend separately, split them if they are independent, or commit as a cohesive atomic unit if inextricably linked.

## Scopes
- `fe/phaseN-slug` — frontend phase work (e.g. `fe/phase1-snake-core`)
- `be/phaseN-slug` — backend phase work (e.g. `be/phase2-lobby`)
- `shared` — changes to the shared/ directory
- `repo` — repo-wide changes (this file, root configs, CI)

## Types
| Type       | When to use                                    |
|------------|------------------------------------------------|
| `feat`     | New functionality                               |
| `fix`      | Bug fix                                         |
| `refactor` | Restructuring, no behavior change               |
| `style`    | Formatting, lint fixes only                     |
| `docs`     | Documentation/spec/skill changes only           |
| `chore`    | Tooling, deps, config                           |
| `test`     | Adding/updating tests                           |

## Examples
```
feat(fe/phase1-snake-core): add keyboard input and direction change
feat(be/phase3-collision): implement head-to-head size comparison
refactor(shared): extract WebSocket event types to shared/events.ts
chore(repo): set up Husky pre-commit hooks
```
