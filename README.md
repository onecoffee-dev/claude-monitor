# claude-monitor

A Claude Code plugin that shows what a session does: a band above the prompt and a Monitor pane beside the chat.

- **Band, left:** what Claude did last or does now, and the next step of a PR stack. Below them: the 5-hour and 7-day usage windows, the context fill and the prompt cache share.
- **Band, right column:** the plan's progress, the Linear issue, the PR or the number of PRs in a stack, and the debugging Chrome of the session.
- **Pane:** the plan as a graph, your prompts in this session, and the PR stack with its CI and review state.
- **Questions:** when Claude's answer still ends with a plain-text ask ("reply go", "Should I…?", "Reply A or B"), Monitor opens the question dialog and sends your pick as your reply.

Monitor is off until you turn it on.

## Install

```bash
claude plugin marketplace add onecoffee-dev/claude-monitor
```

```bash
claude plugin install monitor@onecoffee
```

## Turn it on

- **For one session:** run `/monitor`.
- **For every session:** run `claude plugin configure monitor@onecoffee` and set `alwaysOn` to on.

Off, Monitor draws nothing, registers no plan tool and runs no `git`, `gh` or model calls.

## Settings

| Setting                | Default | Effect                                                                                                                                                                                 |
| ---------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `alwaysOn`             | off     | Starts Monitor with every session.                                                                                                                                                     |
| `issuePrefixes`        | empty   | Comma-separated Linear team keys, for example `ENG,OPS`. Monitor finds these issue ids in the branch name or the PR title and shows the issue. Needs `LINEAR_API_KEY`. Empty: no Linear row. |
| `chromeSlotsDirectory` | empty   | A folder under your home with one `<profile>-slot-<n>.lock` folder per debugging Chrome, each with an `owner.json` that holds `worktree` and `pid`. Empty: no Chrome row.                 |
| `fixCommand`           | empty   | A slash command, without the slash, that a Fix button runs with the PR number, for example `fix-pr`. Empty: no Fix buttons.                                                              |

## Commands

- `/monitor` turns Monitor on for the session and opens the pane.
- `/monitor issue ENG-123` pins an issue when the branch names none. `/monitor issue clear` removes it.

## The plan tool

Monitor registers a `plan` tool (`mcp__monitor__plan`). Claude sends the whole plan on each call, and the pane draws it as a graph. Claude uses the tool when its instructions lead it to, so add a line to your `CLAUDE.md`, for example: "Send your checkpoints to the Monitor plan tool when a task starts and when it ends."

## Requirements

- A Claude Code build with function-hook plugins. The API is early access and changes between releases. This plugin was built and tested on Claude Code 2.1.286.
- `gh`, signed in, for the PR and the PR stack.
- `LINEAR_API_KEY` in the environment, for the Linear row.

## Develop

```bash
claude plugin test plugins/monitor
```

```bash
claude plugin validate plugins/monitor
```
