import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const GRAPH = {"run":{"id":"run-demo-dark-mode","goal":"Ship dark mode across the web app (DEMO-100)","status":"running","createdAt":"2026-10-01T06:15:42.001Z","updatedAt":"2026-10-02T08:03:42.001Z"},"tasks":[{"id":"grill","title":"Grill the design (Q1–Q8)","status":"completed","waitingOn":[],"children":[],"progress":{"completed":1,"total":1,"percent":100},"agent":"claude","startedAt":"2026-10-01T06:20:42.001Z","completedAt":"2026-10-01T06:55:42.001Z"},{"id":"issues","title":"Create DEMO-100 + 9 sub-issues","status":"completed","waitingOn":[],"children":[],"progress":{"completed":1,"total":1,"percent":100},"agent":"claude","startedAt":"2026-10-01T06:57:42.001Z","completedAt":"2026-10-01T07:10:42.001Z"},{"id":"p0","title":"Phase 0: color tokens and theme switch","status":"completed","waitingOn":[],"children":[{"id":"d101","title":"DEMO-101 color tokens + contrast audit","status":"completed","waitingOn":[],"children":[],"progress":{"completed":1,"total":1,"percent":100},"agent":"claude","startedAt":"2026-10-01T07:15:42.001Z","completedAt":"2026-10-01T09:15:42.001Z"},{"id":"d102","title":"DEMO-102 theme switch in settings","status":"completed","waitingOn":[],"children":[],"progress":{"completed":1,"total":1,"percent":100},"agent":"claude","startedAt":"2026-10-01T09:17:42.001Z","completedAt":"2026-10-01T11:25:42.001Z"},{"id":"d103","title":"DEMO-103 remember the choice per user","status":"completed","waitingOn":[],"children":[],"progress":{"completed":1,"total":1,"percent":100},"agent":"claude","startedAt":"2026-10-01T11:27:42.001Z","completedAt":"2026-10-01T13:05:42.001Z"}],"progress":{"completed":3,"total":3,"percent":100},"agent":"claude","startedAt":"2026-10-01T07:15:42.001Z","completedAt":"2026-10-01T13:05:42.001Z"},{"id":"p1","title":"Phase 1: move every screen to the tokens","status":"running","waitingOn":[],"children":[{"id":"d104","title":"DEMO-104 dashboard and navigation","status":"completed","waitingOn":[],"children":[],"progress":{"completed":1,"total":1,"percent":100},"agent":"claude","startedAt":"2026-10-01T13:15:42.001Z","completedAt":"2026-10-01T17:55:42.001Z"},{"id":"d105","title":"DEMO-105 media-plan editor grid","status":"running","waitingOn":[],"children":[],"progress":{"completed":0,"total":1,"percent":0},"agent":"claude","currentActivity":"moving grid cells to tokens: 14 of 22 done","startedAt":"2026-10-02T05:15:42.001Z"},{"id":"d106","title":"DEMO-106 chart palette","status":"blocked","waitingOn":[],"children":[],"progress":{"completed":0,"total":1,"percent":0},"agent":"claude","statusReason":"waits on design: the dark chart palette is not signed off yet","startedAt":"2026-10-02T02:55:42.001Z"},{"id":"d107","title":"DEMO-107 transactional emails","status":"failed","waitingOn":[],"children":[],"progress":{"completed":0,"total":1,"percent":0},"agent":"claude","statusReason":"Outlook ignores prefers-color-scheme: 2 of 6 emails render black on black","startedAt":"2026-10-02T03:15:42.001Z"}],"progress":{"completed":1,"total":4,"percent":25},"agent":"claude","startedAt":"2026-10-01T13:15:42.001Z"},{"id":"p2","title":"Phase 2: QA and rollout","status":"pending","waitingOn":["p1"],"children":[{"id":"d108","title":"DEMO-108 visual regression pass","status":"pending","waitingOn":[],"children":[],"progress":{"completed":0,"total":1,"percent":0},"agent":"claude"},{"id":"d109","title":"DEMO-109 flag rollout 10% → 100%","status":"pending","waitingOn":["d108"],"children":[],"progress":{"completed":0,"total":1,"percent":0},"agent":"claude"}],"progress":{"completed":0,"total":2,"percent":0},"agent":"claude"}],"progress":{"completed":6,"total":11,"percent":54},"current":[{"agent":"claude","taskId":"d105","taskTitle":"DEMO-105 media-plan editor grid","path":["Phase 1: move every screen to the tokens"],"activity":"moving grid cells to tokens: 14 of 22 done","since":"2026-10-02T08:03:42.001Z","startedAt":"2026-10-02T05:15:42.001Z"}],"blockers":[{"taskId":"d106","taskTitle":"DEMO-106 chart palette","reason":"waits on design: the dark chart palette is not signed off yet","since":"2026-10-02T07:20:42.001Z","agent":"claude"}],"failures":[{"taskId":"d107","taskTitle":"DEMO-107 transactional emails","reason":"Outlook ignores prefers-color-scheme: 2 of 6 emails render black on black","since":"2026-10-02T07:05:42.001Z","agent":"claude"}],"upNext":[{"taskId":"d108","taskTitle":"DEMO-108 visual regression pass"}],"rejectedEvents":0,"lastEventAt":"2026-10-02T08:03:42.001Z","rejected":[]}
const NOW = Date.parse(GRAPH.lastEventAt) + 12 * 60_000
const DOCKED = { placement: 'dock', bodyColumns: 40 } as const
const SEATS = [DOCKED, { placement: 'inline', bodyColumns: 100 }] as const
const PANE = (seat: (typeof SEATS)[number]) => ({
  title: 'Monitor',
  isFocused: false,
  ...seat,
  scroll: { offset: 0, bodyRows: 80 },
  view: {},
})
const PLAN_TOOL = 'mcp__monitor__plan'
// The demo run as the plan tool takes it: GRAPH's tasks, statuses and notes.
const PLAN = {
  goal: 'Ship dark mode across the web app (DEMO-100)',
  tasks: [
    { id: 'grill', title: 'Grill the design (Q1–Q8)', status: 'completed' },
    { id: 'issues', title: 'Create DEMO-100 + 9 sub-issues', status: 'completed' },
    {
      id: 'p0',
      title: 'Phase 0: color tokens and theme switch',
      status: 'completed',
      children: [
        { id: 'd101', title: 'DEMO-101 color tokens + contrast audit', status: 'completed' },
        { id: 'd102', title: 'DEMO-102 theme switch in settings', status: 'completed' },
        { id: 'd103', title: 'DEMO-103 remember the choice per user', status: 'completed' },
      ],
    },
    {
      id: 'p1',
      title: 'Phase 1: move every screen to the tokens',
      status: 'running',
      children: [
        { id: 'd104', title: 'DEMO-104 dashboard and navigation', status: 'completed' },
        { id: 'd105', title: 'DEMO-105 media-plan editor grid', status: 'running', note: 'moving grid cells to tokens: 14 of 22 done' },
        { id: 'd106', title: 'DEMO-106 chart palette', status: 'blocked', note: 'waits on design: the dark chart palette is not signed off yet' },
        { id: 'd107', title: 'DEMO-107 transactional emails', status: 'failed', note: 'Outlook ignores prefers-color-scheme: 2 of 6 emails render black on black' },
      ],
    },
    {
      id: 'p2',
      title: 'Phase 2: QA and rollout',
      status: 'pending',
      children: [
        { id: 'd108', title: 'DEMO-108 visual regression pass', status: 'pending' },
        { id: 'd109', title: 'DEMO-109 flag rollout 10% → 100%', status: 'pending' },
      ],
    },
  ],
}
const savePlan = ($: Engine, input: object) => $.tool.call({ tool: PLAN_TOOL, ...input })
// The demo plan with nothing running and DEMO-104 finished last, 14 hours before NOW.
const saveIdlePlan = async ($: Engine, clock: { at: number }) => {
  const idle = (d104: string) => ({
    ...PLAN,
    tasks: PLAN.tasks.map(task =>
      task.id !== 'p1'
        ? task
        : {
            ...task,
            status: 'pending',
            children: task.children?.map(child =>
              child.id === 'd104' ? { ...child, status: d104 } : child.id === 'd105' ? { id: 'd105', title: child.title, status: 'pending' } : child,
            ),
          },
    ),
  })
  clock.at = NOW - 15 * 60 * MINUTE
  await savePlan($, idle('running'))
  clock.at = NOW - 14 * 60 * MINUTE - 5 * MINUTE
  await savePlan($, idle('completed'))
  clock.at = NOW
}
const MINUTE = 60_000
const COMMAND = { origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } } as const
const NO_FILE = { value: false }
// Monitor turned on, with the Linear keys, the Chrome slots and the fix command the fixtures use.
const ON = {
  options: { alwaysOn: true, issuePrefixes: 'GG,CS', chromeSlotsDirectory: '.cache/acme/browser-slots', fixCommand: 'fix-pr' },
}

test('the plan tool draws the Plan graph and marks the current task, docked and inline', ON, async ($, on) => {
  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/elsewhere' }))
  on('clock.now', () => ({ value: NOW }))
  on('ui.open', () => ({ value: { isPlaced: true } }))

  const saved = await savePlan($, PLAN)
  expect(saved.result).toBe('Plan saved: 6/11 done; now: DEMO-105 media-plan editor grid.')

  for (const surface of ['terminal', 'desktop'] as const)
  for (const seat of SEATS) {
    const ui = await $.ui.mount({ plugin: 'monitor', surface, component: 'Pane', requestId: 'monitor', props: PANE(seat) })
    const node = async (id: string) => (await ui.find({ key: `task-${id}` }))?.text

    // One node per task of the run, in order; the rail draws as text on the terminal only.
    expect(await node('grill')).toMatch(/^✓│?Grill the design/)
    // The task where the session is carries the now pill: text on the terminal, an SVG on the desktop.
    if (surface === 'terminal') expect(await node('p1')).toMatch(/^●│?Phase 1: move every screen to the tokens now 1\/4/)
    else {
      expect(await node('p1')).toMatch(/^●Phase 1: move every screen to the tokens1\/4/)
      expect((await ui.findAll({ type: 'Svg' })).map(svg => svg.props.alt)).toContain('now')
    }
    expect(await node('p2')).toMatch(/^○Phase 2: QA and rollout/)
    expect(await ui.find({ text: /^moving grid cells to tokens: 14 of 22 done$/ })).toBeDefined()
    // The current task's steps, with why one waits and why one failed; other tasks' steps stay folded.
    expect(await node('d105')).toBe('●DEMO-105 media-plan editor grid')
    expect(await node('d106')).toBe('◆DEMO-106 chart palettewaits on design: the dark chart palette is not signed off yet')
    expect(await node('d107')).toMatch(/^✕DEMO-107 transactional emailsOutlook ignores/)
    expect(await node('d101')).toBeUndefined()
    // Only the graph: no progress pills, Your move box or Agents list.
    expect(await ui.find({ text: /Your move|Agents|6 done/ })).toBeUndefined()
    await ui.unmount()
  }
})
test('the first plan opens the Monitor, and a subagent or a malformed plan leaves it as it was', ON, async ($, on) => {
  const opened: string[] = []
  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/work/app' }))
  on('clock.now', () => ({ value: NOW }))
  on('ui.open', (_, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })

  await savePlan($, PLAN)
  await savePlan($, PLAN)
  expect(opened).toEqual(['monitor'])

  const fromSubagent = await $.tool.call({ tool: PLAN_TOOL, goal: 'A subagent view', tasks: [], agentId: 'a1' })
  expect(JSON.stringify(fromSubagent)).toContain('Only the main session sets the plan')
  const malformed = await savePlan($, { goal: 'Broken', tasks: [{ id: 'a', title: 'A', status: 'done' }] })
  expect(JSON.stringify(malformed)).toContain('status must be one of pending, running, blocked, completed, failed')

  const ui = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'Pane', requestId: 'monitor', props: PANE(DOCKED) })
  expect(await ui.find({ text: /Ship dark mode across the web app/ })).toBeDefined()
  expect(await ui.find({ text: /A subagent view|Broken/ })).toBeUndefined()
  await ui.unmount()

  // A finished plan has no current task, so the band drops its Plan chip.
  await savePlan($, { goal: 'Ship it', tasks: [{ id: 'one', title: 'The only task', status: 'completed' }] })
  const BAND = { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 160, scroll: { offset: 0, bodyRows: 6 }, view: {} }
  const band = await $.ui.mount({ plugin: 'monitor', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  expect(await band.find({ text: /^The only task$/ })).toBeDefined()
  expect(await band.find({ key: 'band-progress' })).toBeUndefined()
  await band.unmount()
})
test('the band shows the Chrome slot this session holds, and its chip brings that Chrome forward', ON, async ($, on) => {
  const LOCKS = '/home/me/.cache/acme/browser-slots'
  const owners: Record<string, object> = {
    [`${LOCKS}/chrome-profile-app-slot-2.lock/owner.json`]: { pid: 41, worktree: '/main/checkout', claimedAt: GRAPH.lastEventAt },
    [`${LOCKS}/chrome-profile-app.lock/owner.json`]: { pid: 7, worktree: '/elsewhere/gg-4664-forms', claimedAt: GRAPH.lastEventAt },
  }
  const lock = (name: string) => ({ name, kind: 'dir', size: 0, mtimeMs: 0, isLink: false })

  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/work/gg' }))
  on('session.root', () => ({ value: '/work/gg' }))
  on('env.get', () => ({ value: '/home/me' }))
  on('clock.now', () => ({ value: NOW }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('agent.list', () => ({
    value: [{ id: 'a1', description: 'Link the light create form', type: 'general-purpose', status: 'running' }],
  }))
  const commands: string[][] = []
  on('process.run', (_, e) => {
    commands.push([...e.argv])
    const command = e.argv.join(' ')
    const stdout =
      e.argv[0] === 'readlink'
        ? 'Mac.lan-4242\n'
        : command === 'sh -c echo $PPID'
          ? '6146\n'
          : command === 'ps -o ppid= -p 41'
            ? '6146\n'
            : command === 'ps -o ppid= -p 7'
              ? '999\n'
              : ''
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('fs.list', (_, e) => ({
    value: e.path === LOCKS ? [lock('chrome-profile-app-slot-2.lock'), lock('chrome-profile-app.lock')] : [],
  }))
  on('fs.read', (_, e) => ({ value: JSON.stringify(owners[e.path] ?? {}) }))
  let pages = [
    { type: 'page', title: 'TikTok Ads Manager', url: 'https://ads.tiktok.com/i18n/perf' },
    { type: 'service_worker', title: 'Extension worker', url: 'chrome-extension://app/worker.js' },
  ]
  const fetches: string[] = []
  on('http.fetch', (_, e) => {
    fetches.push(`${e.init?.method ?? 'GET'} ${e.url}`)
    return {
      value:
        e.url === 'http://127.0.0.1:9342/json/list'
          ? { status: 200, ok: true, headers: {}, text: JSON.stringify(pages) }
          : { status: 404, ok: false, headers: {}, text: '' },
    }
  })

  await $.command.run({ command: 'monitor', args: '', ...COMMAND })

  const BAND = { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 160, scroll: { offset: 0, bodyRows: 6 }, view: {} }
  const band = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(await band.find({ type: 'Button', text: /^pid 4242$/ })).toBeDefined()
  await band.press({ key: 'band-chrome' })
  expect(commands).toContainEqual(['readlink', '/home/me/.cache/acme/chrome-profile-app-slot-2/SingletonLock'])
  expect(commands.at(-1)).toEqual([
    'osascript',
    '-e',
    'tell application "System Events" to set frontmost of (first process whose unix id is 4242) to true',
  ])
  const OPEN_WINDOW = 'PUT http://127.0.0.1:9342/json/new?about:blank'
  expect(fetches).not.toContain(OPEN_WINDOW)

  pages = []
  await band.press({ key: 'band-chrome' })
  expect(fetches).toContain(OPEN_WINDOW)
  expect(commands.at(-1)?.[0]).toBe('osascript')
  await band.unmount()
})

test('the header names the Linear issue and the branch, and the band links the issue and the PR with its checks', ON, async ($, on) => {
  const BRANCH = 'me/gg-4726-show-the-check-icon-only-after-the-fix-is-released'
  const run = (stdout: string) => ({
    value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  })

  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/work/gg-4726' }))
  on('clock.now', () => ({ value: NOW }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('agent.list', () => ({ value: [] }))
  on('env.get', (_, e) => ({ value: e.name === 'LINEAR_API_KEY' ? 'lin_test' : undefined }))
  on('process.run', (_, e) => {
    if (e.argv.join(' ') === 'git branch --show-current') return run(`${BRANCH}\n`)
    if (e.argv[0] === 'gh') {
      return run(
        JSON.stringify({
          number: 13752,
          title: 'Show the Slack check mark only after the fix reaches prod (GG-4726)',
          url: 'https://github.com/acme/app/pull/13752',
          state: 'MERGED',
          isDraft: false,
          statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'SUCCESS' }, { state: 'SUCCESS' }],
        }),
      )
    }
    return { value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('http.fetch', (_, e) => {
    const isIssueQuery =
      e.url === 'https://api.linear.app/graphql' &&
      e.init?.headers?.Authorization === 'lin_test' &&
      JSON.parse(e.init?.body ?? '{}').variables?.id === 'GG-4726'
    const issue = {
      identifier: 'GG-4726',
      title: 'Show the check icon only after the fix is released',
      url: 'https://linear.app/acme/issue/GG-4726',
      state: { name: 'Pending release' },
      labels: { nodes: [{ name: 'stage:released:main' }, { name: 'type:fix' }] },
    }
    return {
      value: {
        status: 200,
        ok: true,
        headers: {},
        text: JSON.stringify({ data: { issue: isIssueQuery ? issue : null } }),
      },
    }
  })

  await $.command.run({ command: 'monitor', args: '', ...COMMAND })
  const ui = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'Pane', requestId: 'monitor', props: PANE(DOCKED) })
  expect(await ui.find({ text: /GG\\?-4726 Show the check icon only after the fix is released/ })).toBeDefined()
  expect(await ui.find({ text: /gg-4726-show-the-check-icon/ })).toBeDefined()
  expect(await ui.find({ text: /LINEAR|PR #13752/ })).toBeUndefined()
  await ui.unmount()

  const BAND = { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 160, scroll: { offset: 0, bodyRows: 6 }, view: {} }
  const band = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect((await band.find({ type: 'Link', text: /^GG-4726$/ }))?.props.href).toBe('https://linear.app/acme/issue/GG-4726')
  expect((await band.find({ type: 'Link', text: /^PR #13752$/ }))?.props.href).toBe('https://github.com/acme/app/pull/13752')
  expect(await band.find({ type: 'Text', text: /^✓$/ })).toBeDefined()
  await band.unmount()
})

test('the band names the running task and the pane draws its plan, on the desktop and in the terminal', ON, async ($, on) => {
  const BAND = { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 160, scroll: { offset: 0, bodyRows: 6 }, view: {} }

  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/elsewhere' }))
  on('clock.now', () => ({ value: NOW }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('agent.list', () => ({
    value: [{ id: 'a1', description: 'Link the light create form', type: 'general-purpose', status: 'running' }],
  }))

  await savePlan($, PLAN)
  await $.command.run({ command: 'monitor', args: '', ...COMMAND })

  const pane = await $.ui.mount({
    plugin: 'monitor',
    surface: 'desktop',
    component: 'Pane',
    requestId: 'monitor',
    props: { ...PANE(DOCKED), scroll: { offset: 0, bodyRows: 10 } },
  })
  const desktop = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(await desktop.find({ text: /^DEMO-105 media-plan editor grid$/ })).toBeDefined()
  expect(await desktop.find({ text: /^· moving grid cells to tokens: 14 of 22 done$/ })).toBeDefined()
  expect((await desktop.find({ key: 'band-progress' }))?.text).toContain('[6/11](')

  expect(await pane.find({ text: /DEMO-101 color tokens/ })).toBeUndefined()
  await desktop.unmount()

  expect(await pane.find({ text: /Grill the design/ })).toBeDefined()
  expect(await pane.find({ text: /DEMO-105 media-plan editor grid/ })).toBeDefined()
  await pane.unmount()

  const terminal = await $.ui.mount({
    plugin: 'monitor',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { ...BAND, bodyColumns: 40 },
  })
  expect(await terminal.find({ text: /^DEMO-105 media-plan editor grid$/ })).toBeDefined()
  expect(await terminal.find({ text: /^· moving grid cells to tokens: 14 of 22 done$/ })).toBeDefined()
  expect(await terminal.find({ text: /^1 running$/ })).toBeDefined()
  // A narrow band has no room for a side column: the work chips stay under the lines.
  const sideColumns = (await terminal.findAll({ type: 'Box' })).filter(
    box => box.props.flexDirection === 'column' && box.text.includes('1 running') && !box.text.includes('DEMO-105'),
  )
  expect(sideColumns.length).toBe(0)
  await terminal.unmount()
})

test('with nothing running, the band shows the last finished task and what waits on you', ON, async ($, on) => {
  const BAND = { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 160, scroll: { offset: 0, bodyRows: 6 }, view: {} }
  const clock = { at: NOW }
  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/elsewhere' }))
  on('clock.now', () => ({ value: clock.at }))
  on('ui.open', () => ({ value: { isPlaced: true } }))

  await saveIdlePlan($, clock)
  await $.command.run({ command: 'monitor', args: '', ...COMMAND })

  const desktopBand = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  const labelWidths = (await desktopBand.findAll({ type: 'Svg' })).filter(svg => /^(Done|Your move)$/.test(String(svg.props.alt))).map(svg => svg.props.width)
  expect(labelWidths.length).toBe(2)
  expect(labelWidths[0]).toBe(labelWidths[1])
  await desktopBand.unmount()
  const terminalBand = await $.ui.mount({ plugin: 'monitor', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  expect(await terminalBand.find({ type: 'Text', text: /^Done {5}$/ })).toBeDefined()
  expect(await terminalBand.find({ type: 'Text', text: /^Your move$/ })).toBeDefined()
  await terminalBand.unmount()

  for (const surface of ['terminal', 'desktop'] as const) {
    const band = await $.ui.mount({ plugin: 'monitor', surface, component: 'AbovePrompt', props: BAND })
    expect(await band.find({ text: /^DEMO-104 dashboard and navigation$/ })).toBeDefined()
    expect(await band.find({ text: /^· 14h \d+m ago$/ })).toBeDefined()
    expect(await band.find({ text: /^waits on design: the dark chart palette is not signed off yet$/ })).toBeDefined()
    expect(await band.find({ text: /waiting$/ })).toBeUndefined()
    await band.unmount()
  }
})

test('while the session works, Now shows the step of its latest tool call', ON, async ($, on) => {
  const BAND = { hasSurvey: false, isWorking: true, maxRows: 6, bodyColumns: 160, scroll: { offset: 0, bodyRows: 6 }, view: {} }
  const clock = { at: NOW }
  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/elsewhere' }))
  on('clock.now', () => ({ value: clock.at }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('tool.call', () => ({ result: { stdout: '', stderr: '', interrupted: false }, isError: false }))

  await saveIdlePlan($, clock)
  await $.tool.call({ tool: 'Bash', command: 'claude plugin test .', description: 'Run the band tests' })
  await $.tool.call({ tool: 'Bash', command: 'sleep 1', description: 'A subagent step', agentId: 'a1' })

  const working = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(await working.find({ text: /^Run the band tests$/ })).toBeDefined()
  expect(await working.find({ text: /A subagent step/ })).toBeUndefined()
  expect(await working.find({ text: /^DEMO-104 dashboard and navigation$/ })).toBeUndefined()
  await working.unmount()

  const idle = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: { ...BAND, isWorking: false } })
  expect(await idle.find({ text: /^DEMO-104 dashboard and navigation$/ })).toBeDefined()
  expect(await idle.find({ text: /Run the band tests/ })).toBeUndefined()
  await idle.unmount()
})

test('when a turn ends, Sonnet writes the band lines from the reply and the latest steps', ON, async ($, on) => {
  const BAND = { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 160, scroll: { offset: 0, bodyRows: 6 }, view: {} }
  const asked: Array<{ model: string; prompt: string }> = []
  const clock = { at: NOW }
  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/elsewhere' }))
  on('clock.now', () => ({ value: clock.at }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('tool.call', () => ({ result: { stdout: '', stderr: '', interrupted: false }, isError: false }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('model.complete', (_, e) => {
    asked.push({ model: e.model, prompt: e.prompt })
    return {
      value: {
        isAnswered: true,
        text: 'NOW: Shipped the Sonnet band lines\nYOUR MOVE: Click ◆ 1 running in the band',
        usage: { input_tokens: 900, output_tokens: 20 },
      },
    }
  })

  await saveIdlePlan($, clock)
  await $.tool.call({ tool: 'Bash', command: 'claude plugin test .', description: 'Run the band tests' })
  await $.turn.complete({
    answer: 'All 12 tests pass. Tell me if the pane lands on Agents.',
    reason: 'end_turn',
    durationMs: 1000,
    isAborted: false,
    turnId: 'turn-main',
  })
  await $.command.run({ command: 'monitor', args: '', ...COMMAND })

  expect(asked.map(request => request.model)).toEqual(['sonnet'])
  expect(asked[0]?.prompt).toContain('Tell me if the pane lands on Agents.')
  expect(asked[0]?.prompt).toContain('Run the band tests')

  const band = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(await band.find({ text: /^Shipped the Sonnet band lines$/ })).toBeDefined()
  expect(await band.find({ text: /^Click ◆ 1 running in the band$/ })).toBeDefined()
  expect(await band.find({ text: /^DEMO-104 dashboard and navigation$/ })).toBeUndefined()
  await band.unmount()
})

test('without a plan, the band hides in an empty session and shows once Sonnet has a line', ON, async ($, on) => {
  const BAND = { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 160, scroll: { offset: 0, bodyRows: 6 }, view: {} }
  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/scratch' }))
  on('clock.now', () => ({ value: NOW }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('agent.list', () => ({ value: [] }))
  on('ui.render', () => ({ type: 'Text', children: ['the engine draws its own band'] }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('model.complete', () => ({
    value: { isAnswered: true, text: 'NOW: Said hello\nYOUR MOVE: none', usage: { input_tokens: 300, output_tokens: 8 } },
  }))

  await $.command.run({ command: 'monitor', args: '', ...COMMAND })
  const empty = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(await empty.find({ text: /the engine draws its own band/ })).toBeDefined()
  await empty.unmount()

  await $.turn.complete({ answer: 'Hello!', reason: 'end_turn', durationMs: 1000, isAborted: false, turnId: 'turn-main' })
  await $.command.run({ command: 'monitor', args: '', ...COMMAND })
  const band = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(await band.find({ text: /^Said hello$/ })).toBeDefined()
  expect(await band.find({ text: /the engine draws its own band/ })).toBeUndefined()
  await band.unmount()
})

test('at turn end, the last step holds the band until Sonnet answers', ON, async ($, on) => {
  const BAND = { hasSurvey: false, isWorking: true, maxRows: 6, bodyColumns: 160, scroll: { offset: 0, bodyRows: 6 }, view: {} }
  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/scratch' }))
  on('clock.now', () => ({ value: NOW }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('agent.list', () => ({ value: [] }))
  on('ui.render', () => ({ type: 'Text', children: ['the engine draws its own band'] }))
  on('tool.call', () => ({ result: { stdout: '', stderr: '', interrupted: false }, isError: false }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  const bandShows = async (isWorking: boolean, text: RegExp) => {
    const band = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: { ...BAND, isWorking } })
    const isShown = (await band.find({ text })) !== undefined
    await band.unmount()

    return isShown
  }

  await $.command.run({ command: 'monitor', args: '', ...COMMAND })
  await $.tool.call({ tool: 'Bash', command: 'grep -n band register.tsx', description: 'Look for the band' })
  await $.turn.complete({ answer: 'It is above the prompt.', reason: 'end_turn', durationMs: 1000, isAborted: false, turnId: 'turn-main' })
  expect(await bandShows(false, /^Look for the band$/)).toBe(true)
})

test('a long headline wraps to two lines of the band, clipped after them, and stays whole in the pane', ON, async ($, on) => {
  const LONG = 'Re-review approved the PR with no findings; the earlier finding is resolved, no new commit was pushed after it, and the second reviewer signed off on the follow-up branch, so the stack can merge from the bottom'
  const BAND = { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 100, scroll: { offset: 0, bodyRows: 6 }, view: {} }
  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/scratch' }))
  on('clock.now', () => ({ value: NOW }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('agent.list', () => ({ value: [] }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('model.complete', () => ({ value: { isAnswered: true, text: `NOW: ${LONG}\nYOUR MOVE: none`, usage: { input_tokens: 1, output_tokens: 1 } } }))

  await $.command.run({ command: 'monitor', args: '', ...COMMAND })
  await $.turn.complete({ answer: 'Approved.', reason: 'end_turn', durationMs: 1000, isAborted: false, turnId: 'turn-main' })
  await $.command.run({ command: 'monitor', args: '', ...COMMAND })

  const band = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  const headline = await band.find({ type: 'Text', text: /^Re-review approved/ })
  expect(headline?.text).toMatch(/…$/)
  // Two lines' worth beside the 20-cell side column, and a desktop cell holds more than one proportional letter.
  expect([...String(headline?.text)].length).toBeGreaterThan(2 * (BAND.bodyColumns - 20))
  expect(await band.find({ text: /Not linked/ })).toBeUndefined()
  await band.unmount()

  const pane = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'Pane', requestId: 'monitor', props: PANE(DOCKED) })
  expect(await pane.find({ text: LONG })).toBeDefined()
  await pane.unmount()
})

test('a session on main shows the PR the desktop app tracks for it, and the Linear issue of that PR', ON, async ($, on) => {
  const SESSIONS = '/home/me/Library/Application Support/Claude/claude-code-sessions'
  const BAND = { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 160, scroll: { offset: 0, bodyRows: 6 }, view: {} }
  const records: Record<string, object> = {
    [`${SESSIONS}/account/org/local_other.json`]: { cliSessionId: 'cli-other', prs: [{ prNumber: 1, state: 'OPEN' }] },
    [`${SESSIONS}/account/org/local_mine.json`]: {
      cliSessionId: 'cli-mine',
      prs: [{ prNumber: 13793, state: 'OPEN', branch: 'fix/GG-4750-pending-release-reply' }],
    },
  }
  const entry = (name: string, kind: string, mtimeMs: number) => ({ name, kind, size: 0, mtimeMs, isLink: false })
  const run = (exitCode: number, stdout: string) => ({
    value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  })

  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/work/main-checkout' }))
  on('session.id', () => ({ value: 'cli-mine' }))
  on('env.get', (_, e) => ({ value: e.name === 'LINEAR_API_KEY' ? 'lin_test' : '/home/me' }))
  on('clock.now', () => ({ value: NOW }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('agent.list', () => ({ value: [] }))
  on('fs.list', (_, e) => ({
    value:
      e.path === SESSIONS
        ? [entry('account', 'dir', 1)]
        : e.path === `${SESSIONS}/account`
          ? [entry('org', 'dir', 1)]
          : e.path === `${SESSIONS}/account/org`
            ? [entry('local_other.json', 'file', 3), entry('local_mine.json', 'file', 2)]
            : [],
  }))
  on('fs.read', (_, e) => ({ value: JSON.stringify(records[e.path] ?? {}) }))
  on('process.run', (_, e) => {
    const command = e.argv.join(' ')
    if (command === 'git branch --show-current') return run(0, 'main\n')
    if (command.startsWith('gh pr view 13793 ')) {
      return run(
        0,
        JSON.stringify({
          number: 13793,
          title: 'Reply Pending release on the Slack thread (GG-4750)',
          url: 'https://github.com/acme/app/pull/13793',
          state: 'OPEN',
          isDraft: false,
          headRefName: 'fix/GG-4750-pending-release-reply',
          statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'SUCCESS' }],
        }),
      )
    }
    return run(1, '')
  })
  on('http.fetch', (_, e) => {
    const isQuery = e.url === 'https://api.linear.app/graphql' && JSON.parse(e.init?.body ?? '{}').variables?.id === 'GG-4750'
    const issue = { identifier: 'GG-4750', title: 'Pending release reply', url: 'https://linear.app/acme/issue/GG-4750', state: { name: 'In Review' }, labels: { nodes: [] } }
    return { value: { status: 200, ok: true, headers: {}, text: JSON.stringify({ data: { issue: isQuery ? issue : null } }) } }
  })

  await $.command.run({ command: 'monitor', args: '', ...COMMAND })
  const band = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(await band.find({ type: 'Link', text: /^GG-4750$/ })).toBeDefined()
  expect(await band.find({ type: 'Link', text: /^PR #13793$/ })).toBeDefined()
  expect(await band.find({ type: 'Text', text: /^✓$/ })).toBeDefined()
  await band.unmount()
})

test('with a PR stack, the band names the next step and links to that PR', ON, async ($, on) => {
  const BAND = { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 160, scroll: { offset: 0, bodyRows: 6 }, view: {} }
  const check = (name: string, run: number, conclusion: string) => ({
    workflowName: 'Pull Request checks',
    name,
    conclusion,
    detailsUrl: `https://github.com/acme/app/actions/runs/${run}/job/${run}1`,
  })
  const pr = (number: number, base: string, head: string, extra: object = {}) => ({
    number,
    title: `Step ${number} (GG-${number})`,
    url: `https://github.com/acme/app/pull/${number}`,
    baseRefName: base,
    headRefName: head,
    isDraft: false,
    state: 'OPEN',
    mergeStateStatus: 'CLEAN',
    latestReviews: [{ state: 'COMMENTED', author: { login: 'copilot-pull-request-reviewer' } }],
    statusCheckRollup: [check('Run tests', 37193020001, 'CANCELLED'), check('Run tests (1)', 37193020558, 'SUCCESS')],
    ...extra,
  })
  const OPEN = [
    pr(103, 'feat/b', 'feat/c'),
    pr(101, 'main', 'feat/a'),
    pr(200, 'main', 'fix/unrelated'),
    pr(102, 'feat/a', 'feat/b', { latestReviews: [{ state: 'APPROVED', author: { login: 'reviewer' } }] }),
    pr(104, 'feat/c', 'feat/d'),
    pr(105, 'feat/d', 'feat/e'),
  ]
  const run = (exitCode: number, stdout: string) => ({
    value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  })

  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/work/feat-c' }))
  on('env.get', () => ({ value: undefined }))
  on('clock.now', () => ({ value: NOW }))
  const opened: string[] = []
  on('ui.open', (_, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('agent.list', () => ({ value: [] }))
  const asked: string[] = []
  on('model.complete', (_, e) => {
    asked.push(e.prompt)
    return {
      value: { isAnswered: true, text: 'Accept deferring the setter cells to GG-4709, or probe them in this PR?', usage: { input_tokens: 1, output_tokens: 1 } },
    }
  })
  const submitted: string[] = []
  on('command.run', (_, e) => {
    submitted.push(`/${e.command} ${e.args}`)
    return { text: '' }
  })
  on('ui.toast', () => ({ value: undefined }))
  on('process.run', (_, e) => {
    const [tool, noun, verb] = e.argv
    if (tool === 'git') return run(0, 'feat/c\n')
    if (tool === 'gh' && noun === 'pr' && verb === 'view') return run(0, JSON.stringify(OPEN[0]))
    if (tool === 'gh' && noun === 'pr' && verb === 'list') return run(0, JSON.stringify(OPEN))
    if (tool === 'gh' && noun === 'api') {
      const thread = (isResolved: boolean, request: string, login: string, body: string) => ({
        isResolved,
        opening: { nodes: [{ body: request, author: { login: 'copilot-pull-request-reviewer' } }] },
        latest: { nodes: [{ url: `https://github.com/acme/app/pull/1#discussion_${login}`, body, author: { login } }] },
      })
      const repository = {
        p101: { reviewThreads: { nodes: [thread(true, 'Rename this.', 'copilot', 'Fixed in abc123.')] } },
        p102: {
          reviewThreads: {
            nodes: [thread(false, 'Probe the setter cells before merging.', 'me', 'Valid in part. 4bf3ba8aef adds two sections.\nThe setter cells stay unprobed until GG-4709.')],
          },
        },
        p103: { reviewThreads: { nodes: [thread(false, 'This guard can be bypassed.', 'copilot-pull-request-reviewer', 'This guard can be bypassed.')] } },
      }
      return run(0, JSON.stringify({ data: { viewer: { login: 'me' }, repository } }))
    }
    return run(1, '')
  })

  await $.command.run({ command: 'monitor', args: '', ...COMMAND })
  await $.command.run({ command: 'monitor', args: '', ...COMMAND })
  // Only the Ship card showed a thread's question, so no model call words one.
  expect(asked).toEqual([])

  const band = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect((await band.find({ type: 'Link', text: /^Approve and merge #101$/ }))?.props.href).toMatch(/\/pull\/101$/)
  expect(await band.find({ text: /1 thread needs you/ })).toBeDefined()
  // The band counts the stack's PRs; the PR stack card lists them.
  expect((await band.find({ key: 'band-stack' }))?.text).toContain('[5](')
  // The PRs in merge order, one dot each, as one SVG whose alt reads them out.
  const strip = (await band.findAll({ type: 'Svg' })).map(svg => String(svg.props.alt)).find(alt => alt.startsWith('PR stack in merge order'))
  expect(strip).toBe('PR stack in merge order: #101 needs approval, #102 1 thread needs you, #103 1 unanswered thread (this session), #104 needs approval, #105 needs approval')
  opened.length = 0
  await band.press({ key: 'band-stack', link: { href: 'https://github.com/acme/app/pull/101' } })
  expect(opened).toEqual(['monitor'])
  expect((await band.findAll({ type: 'Svg' })).map(svg => svg.props.alt)).toContain('Pull requests')
  expect(await band.findAll({ type: 'Link', text: /^#\d+$/ })).toEqual([])
  await band.unmount()

  // A thread waits on the person, so the PR stack card opens by itself, one row per PR in merge order.
  const pane = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'Pane', requestId: 'monitor', props: PANE(DOCKED) })
  expect((await pane.find({ key: 'section-toggle-stack' }))?.props.label).toBe('▾ PR stack')
  expect(await pane.find({ text: /^5 open · merge top to bottom$/ })).toBeDefined()
  const rows = await Promise.all([101, 102, 103, 104, 105].map(async number => (await pane.find({ key: `stack-row-${number}` }))?.text ?? ''))
  expect(rows[0]).toContain('Step 101')
  expect(rows[0]).not.toContain('GG-101')
  // On the desktop each pill is one SVG, its label the alt text.
  const pills = (await pane.findAll({ type: 'Svg' })).map(svg => String(svg.props.alt))
  expect(pills.filter(alt => alt === 'next')).toHaveLength(1)
  expect(pills.filter(alt => alt === 'this session')).toHaveLength(1)
  expect(pills).toContain('1 thread needs you')
  expect(pills).toContain('needs approval')
  expect(rows.join(' ')).not.toContain('next')
  // A thread waiting on the person shows under its PR: the last comment's first line and a link to it.
  expect(rows[1]).toContain('“Valid in part. 4bf3ba8aef adds two sections.”')
  // A fixable PR's Fix button is the primary one, so it stands out from the pills.
  expect((await pane.find({ key: 'fix-103' }))?.props.variant).toBe('primary')
  expect((await pane.find({ type: 'Link', text: /^↗$/ }))?.props.href).toBe('https://github.com/acme/app/pull/1#discussion_me')
  await pane.unmount()

  // The terminal keeps its text pills.
  const terminalPane = await $.ui.mount({ plugin: 'monitor', surface: 'terminal', component: 'Pane', requestId: 'monitor', props: PANE(DOCKED) })
  expect((await terminalPane.find({ key: 'stack-row-101' }))?.text).toContain('← next')
  expect((await terminalPane.find({ key: 'stack-row-103' }))?.text).toContain('this session')
  await terminalPane.unmount()
})

test('the Prompts card lists the person\'s prompts, oldest first, from the terminal and the desktop app', ON, async ($, on) => {
  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/work/app' }))
  on('clock.now', () => ({ value: NOW }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.render', () => ({ type: 'Text', children: ['the engine draws the row'] }))
  const drawn = (requestId: string, text: string, kind: string) =>
    $.ui.mount({
      plugin: 'monitor',
      surface: 'desktop',
      component: 'UserMessage',
      requestId,
      props: { text, origin: { kind }, isExpanded: true },
    })

  await (await drawn('m1', 'make the band\n  clickable', 'composer')).unmount()
  await (await drawn('m2', 'Background task finished', 'task-notification')).unmount()
  await (await drawn('m3', 'why is 33/41 weird?', 'composer')).unmount()
  await (await drawn('m1', 'make the band clickable', 'composer')).unmount()
  await (await drawn('m4', 'sent from the desktop app', 'sdk')).unmount()

  await $.command.run({ command: 'monitor', args: '', ...COMMAND })
  const ui = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'Pane', requestId: 'monitor', props: PANE(DOCKED) })
  await ui.press({ key: 'section-toggle-prompts' })
  const listed = await ui.findAll({ type: 'Text', text: /^(make the band clickable|why is 33\/41 weird\?|Background task finished|sent from the desktop app)$/ })
  expect(listed.map(row => row.text)).toEqual(['make the band clickable', 'why is 33/41 weird?', 'sent from the desktop app'])
  expect((await ui.find({ key: 'prompt-row-m4' }))?.text).toBe('#3sent from the desktop app')
  expect(await ui.find({ type: 'Button', text: /desktop app/ })).toBeUndefined()
  await ui.unmount()
})

test('a pinned issue shows in the header and as a Linear section of the band', ON, async ($, on) => {
  const BAND = { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 160, scroll: { offset: 0, bodyRows: 6 }, view: {} }
  const ISSUE = {
    identifier: 'GG-4726',
    title: 'Show the check icon only after the fix is released',
    url: 'https://linear.app/acme/issue/GG-4726',
    state: { name: 'Pending release' },
    labels: { nodes: [] },
  }
  const failed = { value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }

  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/work/app' }))
  on('clock.now', () => ({ value: NOW }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('agent.list', () => ({
    value: [{ id: 'a1', description: 'Link the light create form', type: 'general-purpose', status: 'running' }],
  }))
  on('env.get', (_, e) => ({ value: e.name === 'LINEAR_API_KEY' ? 'lin_test' : undefined }))
  on('process.run', (_, e) =>
    e.argv.join(' ') === 'git branch --show-current'
      ? { value: { ...failed.value, exitCode: 0, stdout: 'gg/code-mods-how-e238c3\n' } }
      : failed,
  )
  on('http.fetch', (_, e) => ({
    value: {
      status: 200,
      ok: true,
      headers: {},
      text: JSON.stringify({ data: { issue: JSON.parse(e.init?.body ?? '{}').variables?.id === 'GG-4726' ? ISSUE : null } }),
    },
  }))

  await $.command.run({ command: 'monitor', args: '', ...COMMAND })
  const refused = await $.command.run({ command: 'monitor', args: 'issue banana', ...COMMAND })
  expect(refused.text).toBe('banana is not an issue id of GG, CS, for example /monitor issue GG-123')

  const extra = await $.command.run({ command: 'monitor', args: 'issue GG-4726extra', ...COMMAND })
  expect(extra.text).toBe('GG-4726extra is not an issue id of GG, CS, for example /monitor issue GG-123')

  const unlinked = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(await unlinked.find({ text: /Not linked/ })).toBeUndefined()
  await unlinked.unmount()

  const pinned = await $.command.run({ command: 'monitor', args: 'issue gg-4726', ...COMMAND })
  expect(pinned.text).toBe('GG-4726 is pinned to this session; the Monitor shows it when the branch names no issue')

  const band = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(await band.find({ type: 'Link', text: /^GG-4726$/ })).toBeDefined()
  expect(await band.find({ text: /Not linked/ })).toBeUndefined()
  await band.unmount()

  const pane = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'Pane', requestId: 'monitor', props: PANE(DOCKED) })
  expect(await pane.find({ text: /GG\\?-4726 Show the check icon only after the fix is released/ })).toBeDefined()
  await pane.unmount()

  await $.command.run({ command: 'monitor', args: 'issue clear', ...COMMAND })
  const cleared = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(await cleared.find({ type: 'Link', text: /GG-4726/ })).toBeUndefined()
  expect(await cleared.find({ text: /Not linked/ })).toBeUndefined()
  await cleared.unmount()
})

test('a collapsed section shows its summary, and one that waits on you opens itself', ON, async ($, on) => {
  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/elsewhere' }))
  on('clock.now', () => ({ value: NOW }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  await savePlan($, PLAN)

  const ui = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'Pane', requestId: 'monitor', props: PANE(DOCKED) })
  // The run has a blocked and a failed task, so Plan opens by itself.
  expect((await ui.find({ key: 'section-toggle-plan' }))?.props.label).toBe('▾ Plan')
  expect(await ui.find({ text: /^6\/11 · Now: DEMO-105 media-plan editor grid · 1 waiting on you$/ })).toBeDefined()
  expect(await ui.find({ text: /DEMO-105 media-plan editor grid/, type: 'Text' })).toBeDefined()
  // Nothing waits in the prompts list: its header and summary alone.
  expect((await ui.find({ key: 'section-toggle-prompts' }))?.props.label).toBe('▸ Prompts')
  expect(await ui.find({ text: /^No prompts yet$/ })).toBeDefined()
  // No issue, PR, stack or Chrome slot: no Ship section to draw.
  expect(await ui.find({ key: 'section-toggle-ship' })).toBeUndefined()
  expect(await ui.find({ text: /CHROME|LINEAR|No pull request/ })).toBeUndefined()
  await ui.unmount()
})

test('a section opened by hand in an earlier session opens again', ON, async ($, on) => {
  mock.store(on, { sections: { prompts: { isOpen: true, needsYou: false } } })
  mock.clock(on, { now: NOW })
  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/work/app' }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'Pane', requestId: 'monitor', props: PANE(DOCKED) })
  expect((await ui.find({ key: 'section-toggle-prompts' }))?.props.label).toBe('▾ Prompts')
  expect(await ui.find({ text: /Your prompts show here/ })).toBeDefined()
  await ui.unmount()
})

test('the band carries the five-hour and seven-day windows, the context fill and the cache share after the plan', ON, async ($, on) => {
  const BAND = { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 160, scroll: { offset: 0, bodyRows: 6 }, view: {} }
  const minuteNow = Math.floor(NOW / MINUTE) * MINUTE
  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/work/app' }))
  on('clock.now', () => ({ value: NOW }))
  const opened: string[] = []
  on('ui.open', (_, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  await savePlan($, PLAN)
  // 6,100 of the turn's 10,000 input tokens came from the prompt cache.
  await $.turn.complete({
    answer: 'Done.',
    reason: 'answer',
    durationMs: 1000,
    isAborted: false,
    turnId: 'turn-main',
    usage: { input_tokens: 1000, cache_creation_input_tokens: 2900, cache_read_input_tokens: 6100, output_tokens: 50, model: 'claude-opus-5-5' },
  })
  await $.session.measure({
    context: { tokens: 63_300, window: 1_000_000, percent: 6 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 29, resetsAt: new Date(minuteNow + (3 * 60 + 40) * MINUTE).toISOString() },
      { kind: 'seven_day', percentUsed: 55, resetsAt: new Date(minuteNow + 5 * 24 * 60 * MINUTE).toISOString() },
    ],
    changed: ['context', 'rateLimits'],
  })
  await $.command.run({ command: 'monitor', args: '', ...COMMAND })

  const band = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  const texts = (await band.findAll({ type: 'Text' })).map(text => text.text)
  for (const shown of ['5h', '29%', '3h40m', '7d', '55%', '5d0h', '63.3K', '/1M', '61% cached']) expect(texts).toContain(shown)
  expect(texts.indexOf('5h')).toBeLessThan(texts.indexOf('7d'))
  expect(texts.indexOf('7d')).toBeLessThan(texts.indexOf('63.3K'))
  expect(texts.indexOf('63.3K')).toBeLessThan(texts.indexOf('61% cached'))
  // The plan count is a link that opens the Plan card.
  opened.length = 0
  await band.press({ key: 'band-progress', link: { href: 'https://github.com/onecoffee-dev/claude-monitor' } })
  expect(opened).toEqual(['monitor'])
  // The plan stacks in a column of its own, beside the lines and the usage row.
  const columns = (await band.findAll({ type: 'Box' })).filter(box => box.props.flexDirection === 'column').map(box => box.text)
  expect(columns.filter(text => text.includes('6/11') && !text.includes('5h')).length).toBe(1)
  expect(columns.filter(text => text.includes('61% cached') && !text.includes('6/11')).length).toBe(1)
  // Linear, the PR and Chrome keep their place in the column when nothing is linked.
  expect(columns.filter(text => text.includes('6/11') && text.includes('No issue') && text.includes('No PR') && text.includes('No Chrome')).length).toBe(1)
  await band.unmount()

  // A turn almost all from the cache shows 99%, never a rounded-up 100%.
  await $.turn.complete({
    answer: 'Done.',
    reason: 'answer',
    durationMs: 1000,
    isAborted: false,
    turnId: 'turn-next',
    usage: { input_tokens: 1, cache_creation_input_tokens: 2, cache_read_input_tokens: 997, output_tokens: 5, model: 'claude-opus-5-5' },
  })
  const almost = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(await almost.find({ type: 'Text', text: /^99% cached$/ })).toBeDefined()
  await almost.unmount()

  const terminal = await $.ui.mount({ plugin: 'monitor', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  expect(await terminal.find({ type: 'Text', text: /^▰▰▱▱▱▱$/ })).toBeDefined()
  expect(await terminal.find({ type: 'Text', text: /^●·········$/ })).toBeDefined()
  await terminal.unmount()
})

test('Monitor stays quiet until /monitor turns it on, and draws only the rows its settings name', async ($, on) => {
  const BAND = { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 160, scroll: { offset: 0, bodyRows: 6 }, view: {} }
  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/work/app' }))
  on('clock.now', () => ({ value: NOW }))
  const opened: string[] = []
  on('ui.open', (_, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('ui.render', () => ({ type: 'Text', children: ['the engine draws the band'] }))
  on('tool.call', () => ({ result: 'no such tool', isError: true }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  await $.session.measure({
    context: { tokens: 63_300, window: 1_000_000, percent: 6 },
    rateLimits: [{ kind: 'five_hour', percentUsed: 29 }],
    changed: ['context', 'rateLimits'],
  })

  const quiet = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(await quiet.find({ text: /^5h$/ })).toBeUndefined()
  await quiet.unmount()
  expect(JSON.stringify(await savePlan($, PLAN))).not.toContain('Plan saved')
  // Off, a session start opens nothing.
  expect(opened).toEqual([])

  await $.command.run({ command: 'monitor', args: '', ...COMMAND })
  expect(JSON.stringify(await savePlan($, PLAN))).toContain('Plan saved')
  const band = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(await band.find({ text: /^5h$/ })).toBeDefined()
  expect(await band.find({ text: /^No PR$/ })).toBeDefined()
  // No Linear keys and no Chrome slots folder are set, so neither row is drawn.
  expect(await band.find({ text: /^No issue$/ })).toBeUndefined()
  expect(await band.find({ text: /^No Chrome$/ })).toBeUndefined()
  await band.unmount()
})

test('with alwaysOn, a session opens the Monitor pane as it starts, before any plan', ON, async ($, on) => {
  const opened: string[] = []
  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/work/app' }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.open', (_, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })

  // The desktop app starts a session as the SDK does: no surface yet, and nobody at a REPL.
  await $.session.start({ cwd: '/work/app', surface: null, isInteractive: false })
  expect(opened).toEqual(['monitor'])
})

test('an answer that closes on go or yes/no opens the question dialog, and Your move names what waits on you', ON, async ($, on) => {
  const BAND = { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 160, scroll: { offset: 0, bodyRows: 6 }, view: {} }
  const asked: { question: string; options: string[] }[] = []
  const submitted: { text: string; asUser: boolean }[] = []
  let draft = ''
  // The dialog stays open until the test picks, as a person would.
  let pickNow: (label: string) => void = () => undefined
  const clock = mock.clock(on, { now: NOW })
  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/elsewhere' }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('agent.list', () => ({ value: [] }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('prompt.read', () => ({ value: { text: draft, cursor: draft.length } }))
  on('tool.check', () => ({ decision: 'ask' }))
  on('ui.render', () => ({ type: 'Text', children: ['the engine draws its own band'] }))
  on('classic.PermissionRequest', () => ({}))
  // As in the engine, the permission dialog opens inside the call, after Monitor's tool.call hook began.
  const push = { command: 'git push', description: 'Push the branch' }
  const hookBase = { session_id: 's1', transcript_path: '/tmp/s1.jsonl', cwd: '/elsewhere' }
  let waitDuringCall: string | undefined
  on('tool.call', { tool: 'Bash' }, async () => {
    await $.classic.PermissionRequest({ ...hookBase, hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: push })
    waitDuringCall = await yourMove()

    return { result: { stdout: '', stderr: '', interrupted: false }, isError: false }
  })
  on('tool.call', { tool: 'AskUserQuestion' }, async (_, e) => {
    const first = e.questions[0]
    asked.push({ question: first?.question ?? '', options: (first?.options ?? []).map(option => option.label) })
    const label = await new Promise<string>(resolve => {
      pickNow = resolve
    })

    return { result: { questions: e.questions, answers: { [first?.question ?? '']: label } } }
  })
  on('prompt.submit', (_, e) => {
    submitted.push({ text: e.text, asUser: e.origin.kind === 'plugin' && e.origin.asUser === true })

    return { text: e.text }
  })
  const complete = async (answer: string) => {
    await $.turn.complete({ answer, reason: 'answer', durationMs: 1000, isAborted: false, turnId: answer })
    await clock.settle()
  }
  const pick = async (label: string) => {
    pickNow(label)
    await clock.settle()
  }
  const yourMove = async () => {
    const band = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
    const line = (await band.find({ text: /^(Question for you|Waiting for your OK): / }))?.text
    await band.unmount()

    return line
  }

  await $.command.run({ command: 'monitor', args: '', ...COMMAND })
  await complete('The branch is ready.\n\nShould I push it?')
  expect(asked).toEqual([{ question: 'Should I push it?', options: ['yes', 'no'] }])
  expect(await yourMove()).toBe('Question for you: Should I push it?')
  await pick('yes')
  expect(submitted).toEqual([{ text: 'yes', asUser: true }])
  expect(await yourMove()).toBeUndefined()

  // One named reply gets a way out that sends nothing; a lettered choice puts the recommended option first.
  await complete('Next: reply **"go"** to start the migration.')
  expect(asked.at(-1)).toEqual({ question: "What's your reply?", options: ['go', 'Not now'] })
  await pick('Not now')
  await complete('- **A:** skip check 3.\n- **B (recommended):** relaunch the test Chrome.\n\nReply **A** or **B**.')
  expect(asked.at(-1)?.options).toEqual(['B: relaunch the test Chrome', 'A: skip check 3'])
  await pick('B: relaunch the test Chrome')
  expect(submitted.map(sent => sent.text)).toEqual(['yes', 'B: relaunch the test Chrome'])

  // Nothing over an answer that asks nothing, or over a draft the person is typing.
  await complete('The tests pass and the PR is open.')
  draft = 'actually, wait'
  await complete('Shall I merge it?')
  expect(asked).toHaveLength(3)

  // An "ask" goes to the mode's decider, which in auto mode is a classifier, not the person: nothing waits yet.
  await $.tool.check({ tool: 'Bash', input: push, tool_use_id: 'use-1' })
  expect(await yourMove()).toBeUndefined()
  // The permission dialog waits on the person until the tool has run.
  await $.tool.call({ tool: 'Bash', ...push })
  expect(waitDuringCall).toBe('Waiting for your OK: Push the branch')
  expect(await yourMove()).toBeUndefined()
})

test('with Monitor off, an answer that closes on yes/no opens no dialog', async ($, on) => {
  const asked: string[] = []
  const clock = mock.clock(on, { now: NOW })
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('prompt.read', () => ({ value: { text: '', cursor: 0 } }))
  on('tool.call', { tool: 'AskUserQuestion' }, (_, e) => {
    asked.push(e.questions[0]?.question ?? '')

    return { result: { questions: e.questions, answers: {} } }
  })

  await $.turn.complete({ answer: 'Should I push it?', reason: 'answer', durationMs: 1000, isAborted: false, turnId: 'off' })
  await clock.settle()
  expect(asked).toEqual([])
})

test('a PR shows in the band right after gh pr create, and the session keeps it fresh when the timer stops', ON, async ($, on) => {
  const BAND = { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 160, scroll: { offset: 0, bodyRows: 6 }, view: {} }
  // A clock whose every period is refused: the interval ends at once, as a refused period ends one in the engine.
  let now = NOW
  on('clock.now', () => ({ value: now }))
  on('clock.every', () => ({ deny: 'refused' }))
  on('clock.after', () => ({ value: undefined }))
  let isOpen = false
  const run = (exitCode: number, stdout: string) => ({ value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } })
  const pr = (number: number) => ({ number, title: `Step ${number}`, url: `https://github.com/acme/app/pull/${number}`, state: 'OPEN', isDraft: false, headRefName: 'feat/x', statusCheckRollup: [] })
  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/work/app' }))
  on('env.get', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('agent.list', () => ({ value: [] }))
  on('ui.render', () => ({ type: 'Text', children: ['the engine draws its own band'] }))
  on('tool.call', () => ({ result: { stdout: '', stderr: '', interrupted: false }, isError: false }))
  on('process.run', (_, e) => {
    const [tool, noun, verb] = e.argv
    if (tool === 'git') return run(0, 'feat/x\n')
    if (tool === 'gh' && noun === 'pr' && verb === 'view') return isOpen ? run(0, JSON.stringify(pr(42))) : run(1, '')
    if (tool === 'gh' && noun === 'pr' && verb === 'list') return run(0, '[]')
    return run(1, '')
  })
  const shownPullRequest = async () => {
    const band = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
    const link = (await band.find({ type: 'Link', text: /^PR #\d+$/ }))?.text
    await band.unmount()

    return link
  }

  await $.command.run({ command: 'monitor', args: '', ...COMMAND })
  expect(await shownPullRequest()).toBeUndefined()

  // Opening the PR refreshes the band at once, not at the next minute.
  isOpen = true
  await $.tool.call({ tool: 'Bash', command: 'gh pr create --fill', description: 'Open the PR' })
  expect(await shownPullRequest()).toBe('PR #42')

  // With the timer gone, a minute later the session's next tool call refreshes in its place.
  isOpen = false
  now += 61_000
  expect(await shownPullRequest()).toBe('PR #42')
  await $.tool.call({ tool: 'Read', file_path: '/work/app/README.md' })
  expect(await shownPullRequest()).toBeUndefined()
})

test('a Chrome slot the session holds with no Chrome running yet reads not started, not as a failure', ON, async ($, on) => {
  const LOCKS = '/home/me/.cache/acme/browser-slots'
  const BAND = { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 160, scroll: { offset: 0, bodyRows: 6 }, view: {} }
  let isChromeRunning = false
  const run = (exitCode: number, stdout: string) => ({ value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } })
  on('fs.exists', () => NO_FILE)
  on('session.cwd', () => ({ value: '/work/gg' }))
  on('session.root', () => ({ value: '/work/gg' }))
  on('env.get', () => ({ value: '/home/me' }))
  on('clock.now', () => ({ value: NOW }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('agent.list', () => ({ value: [] }))
  // The session's Chrome helper holds slot 1; Chrome itself starts on the helper's first use.
  on('process.run', (_, e) => {
    const command = e.argv.join(' ')
    if (e.argv[0] === 'readlink') return isChromeRunning ? run(0, 'Mac.lan-4242\n') : run(1, '')
    if (command === 'sh -c echo $PPID' || command === 'ps -o ppid= -p 41') return run(0, '6146\n')
    return run(1, '')
  })
  on('fs.list', (_, e) => ({
    value: e.path === LOCKS ? [{ name: 'chrome-profile-app-slot-1.lock', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }] : [],
  }))
  on('fs.read', () => ({ value: JSON.stringify({ pid: 41, worktree: '/main/checkout', claimedAt: GRAPH.lastEventAt }) }))
  on('http.fetch', () => ({ value: { status: 404, ok: false, headers: {}, text: '' } }))
  const chromeRow = async () => {
    const band = await $.ui.mount({ plugin: 'monitor', surface: 'desktop', component: 'AbovePrompt', props: BAND })
    const texts = [
      ...(await band.findAll({ type: 'Text' })).map(text => text.text),
      ...(await band.findAll({ type: 'Button' })).map(button => button.text),
    ].filter(text => /Slot|answering|Chrome/.test(text))
    const alt = (await band.findAll({ type: 'Svg' })).map(svg => String(svg.props.alt)).find(text => text.startsWith('Chrome'))
    await band.unmount()

    return { texts, alt }
  }

  await $.command.run({ command: 'monitor', args: '', ...COMMAND })
  expect(await chromeRow()).toEqual({ texts: ['Slot 1 · not started'], alt: 'Chrome not started' })

  // A Chrome that runs but does not answer is still a failure.
  isChromeRunning = true
  await $.command.run({ command: 'monitor', args: '', ...COMMAND })
  expect(await chromeRow()).toEqual({ texts: ['Not answering'], alt: 'Chrome not answering' })
})
