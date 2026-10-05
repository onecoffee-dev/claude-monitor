import type { MonitorAgent, MonitorChrome, MonitorGraph, MonitorHeader, MonitorSummary, MonitorTask } from '../types'

export type BandStatus = 'running' | 'done' | 'idle'

export type Band = {
  status: BandStatus
  label: string
  headline: string
  activity: string | null
  finishedAt: string | null
  yourMove: { reason: string; more: number } | null
  progress: { done: number; open: number; failed: number; percent: number } | null
  agentsRunning: number
  chrome: 'live' | 'down' | 'none'
  chromePid: number | null
  issue: { identifier: string; url: string; state: string } | null
  pullRequest: { number: number; url: string } | null
}

export type BandSpan = { text: string; color?: string; isBold?: boolean; isDim?: boolean }

export type BandMark = { svg: string; width: number; height: number; alt: string; glyphs: BandSpan[] }

export const HUE = {
  running: '#7c83f7',
  waiting: '#e0a83a',
  done: '#5cb97a',
  idle: '#8b8b8b',
  failed: '#e5534b',
  agents: '#a78bfa',
  fiveHour: '#7f98ab',
  sevenDay: '#a8874f',
}

const BAND_HUES: Record<BandStatus, string> = { running: HUE.running, done: HUE.done, idle: HUE.idle }

const CHROME_HUES: Record<Band['chrome'], string> = { live: HUE.done, down: HUE.failed, none: HUE.idle }

const LABELS: Record<BandStatus, string> = { running: 'Now', done: 'Done', idle: 'Idle' }

const D = { height: 22, baseline: 15, size: 12, icon: 11, iconTop: 5.5, center: 11, dot: 3 }
const BAR = { width: 48, height: 5 }
const SHINE_CLOCK = 'keyTimes="0;0.62;1" dur="2.6s" repeatCount="indefinite"'
const TERMINAL_BAR_CELLS = 6

const ADVANCE: Record<string, number> = {
  ' ': 0.26, '.': 0.27, ',': 0.27, ':': 0.27, ';': 0.27, "'": 0.24, '-': 0.4, '/': 0.36, '·': 0.3, '…': 0.9, '%': 0.84,
  i: 0.25, l: 0.25, j: 0.26, f: 0.36, t: 0.38, r: 0.39, m: 0.88, w: 0.8, W: 0.98, M: 0.86, I: 0.28,
}

const textWidth = (text: string) =>
  [...text].reduce((width, character) => {
    if (character >= '0' && character <= '9') return width + 0.62
    if (character in ADVANCE) return width + (ADVANCE[character] ?? 0)
    if (character === character.toUpperCase() && character !== character.toLowerCase()) return width + 0.7
    return width + 0.57
  }, 0) * D.size

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const shade = (hex: string, amount: number) => {
  const channels = [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16))
  const mixed = channels.map(channel =>
    Math.round(amount >= 0 ? channel + (255 - channel) * amount : channel * (1 + amount)),
  )

  return `#${mixed.map(channel => channel.toString(16).padStart(2, '0')).join('')}`
}

const leaves = (tasks: readonly MonitorTask[]): MonitorTask[] =>
  tasks.flatMap(task => (task.children.length === 0 ? [task] : leaves(task.children)))

// A failed task is closed: it never counts as work left to do.
const countsOf = (tasks: readonly MonitorTask[]): Band['progress'] => {
  const all = leaves(tasks)
  if (all.length === 0) return null
  const done = all.filter(task => task.status === 'completed').length
  const failed = all.filter(task => task.status === 'failed').length
  const open = all.length - done - failed

  return { done, open, failed, percent: done + open === 0 ? 100 : Math.round((done / (done + open)) * 100) }
}

export const isEmpty = (band: Band) =>
  band.status === 'idle' &&
  band.progress === null &&
  band.yourMove === null &&
  band.agentsRunning === 0 &&
  band.chrome === 'none' &&
  band.issue === null &&
  band.pullRequest === null

// Sonnet's lines and the latest tool step outrank agent-exec, whose updates can lag behind the work.
export const withLive = (band: Band, step: string | null, summary: MonitorSummary | null, isWorking: boolean): Band => {
  if (isWorking) {
    const working = summary?.isWorking === true ? summary.now : null
    if (step === null && working === null) return band
    if (band.status === 'running') return { ...band, headline: working ?? band.headline, activity: step ?? band.activity }

    return {
      ...band,
      status: 'running',
      label: LABELS.running,
      headline: working ?? step ?? '',
      activity: working === null ? null : step,
      finishedAt: null,
    }
  }
  if (summary === null || summary.isWorking) return band

  return {
    ...band,
    status: 'done',
    label: LABELS.done,
    headline: summary.now,
    activity: null,
    finishedAt: new Date(summary.at).toISOString(),
    yourMove: summary.yourMove === null ? band.yourMove : { reason: summary.yourMove, more: 0 },
  }
}

const finishedTasks = (tasks: readonly MonitorTask[], depth = 0): Array<{ task: MonitorTask; depth: number }> =>
  tasks.flatMap(task => [
    ...(task.status === 'completed' && task.completedAt !== undefined ? [{ task, depth }] : []),
    ...finishedTasks(task.children, depth + 1),
  ])

// A parent finishes with its last child; the child names the work.
const lastFinished = (tasks: readonly MonitorTask[]) =>
  finishedTasks(tasks).sort(
    (left, right) =>
      Date.parse(right.task.completedAt ?? '') - Date.parse(left.task.completedAt ?? '') || right.depth - left.depth,
  )[0]?.task

export const bandOf = (
  view: MonitorGraph | null,
  agents: readonly MonitorAgent[],
  browser: MonitorChrome | null,
  info: MonitorHeader | null,
): Band => {
  const agentsRunning = agents.filter(agent => agent.status === 'running').length

  const current = view?.current[0]
  const waiting = [...(view?.blockers ?? [])].sort((left, right) => Date.parse(right.since) - Date.parse(left.since))
  const finished = lastFinished(view?.tasks ?? [])
  const status: BandStatus = current !== undefined ? 'running' : finished !== undefined ? 'done' : 'idle'
  const upNext = view?.upNext[0]?.taskTitle
  const headline =
    status === 'running'
      ? (current?.taskTitle ?? '')
      : status === 'done'
        ? (finished?.title ?? '')
        : upNext === undefined
          ? 'nothing running'
          : `up next: ${upNext}`
  const firstWait = waiting[0]

  return {
    status,
    label: LABELS[status],
    headline,
    activity: status === 'running' ? (current?.activity ?? null) : null,
    finishedAt: status === 'done' ? (finished?.completedAt ?? null) : null,
    yourMove:
      firstWait === undefined
        ? null
        : {
            reason: (firstWait.reason || firstWait.taskTitle).replace(/^waits on you:\s*/i, ''),
            more: waiting.length - 1,
          },
    progress: countsOf(view?.tasks ?? []),
    agentsRunning,
    chrome: browser === null || browser.own === null ? 'none' : browser.isReachable ? 'live' : 'down',
    chromePid: browser?.chromePid ?? null,
    issue: info?.issue ? { identifier: info.issue.identifier, url: info.issue.url, state: info.issue.state } : null,
    pullRequest: info?.pullRequest ? { number: info.pullRequest.number, url: info.pullRequest.url } : null,
  }
}

const STYLE =
  '<style>' +
  ':root{color-scheme:light dark;background:transparent}' +
  'text{font-family:Inter,"SF Pro Text",system-ui,-apple-system,"Segoe UI",sans-serif;font-weight:600;' +
  'font-feature-settings:"tnum","cv05"}' +
  '.track{fill:var(--h);fill-opacity:.22}.ink{fill:var(--l)}.line{stroke:var(--l)}' +
  '@media (prefers-color-scheme:dark){.ink{fill:var(--d)}.line{stroke:var(--d)}}' +
  '</style>' +
  '<defs><linearGradient id="shine" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/>' +
  '<stop offset=".5" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>' +
  '</linearGradient></defs>'

const wrap = (width: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${D.height}" viewBox="0 0 ${width} ${D.height}" ` +
  `style="color-scheme:light dark;background:transparent">${STYLE}${body}</svg>`

const ICONS = {
  checklist: (hue: string) =>
    `<g fill="none" stroke="${hue}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M0.8 2.2 2 3.4 4.2 1"/><path d="M0.8 7.2 2 8.4 4.2 6"/><path d="M6 2.2h3.4M6 7.2h3.4"/></g>`,
  agent: (hue: string) =>
    `<g fill="none" stroke="${hue}" stroke-width="1.2"><rect x="0.6" y="2.2" width="8.8" height="7" rx="2"/>` +
    `<path d="M5 2.2V0.6" stroke-linecap="round"/></g>` +
    `<circle cx="3.4" cy="5.7" r="0.9" fill="${hue}"/><circle cx="6.6" cy="5.7" r="0.9" fill="${hue}"/>`,
  globe: (hue: string) =>
    `<g fill="none" stroke="${hue}" stroke-width="1.1"><circle cx="5" cy="5" r="4.4"/>` +
    `<ellipse cx="5" cy="5" rx="1.9" ry="4.4"/><path d="M0.6 5h8.8"/></g>`,
  linear: (hue: string) =>
    `<g fill="none" stroke="${hue}" stroke-width="1.1" stroke-linecap="round"><circle cx="5" cy="5" r="4.4"/>` +
    `<path d="M1.3 6.2 3.8 8.7M0.9 3.9 6.1 9.1M2.2 1.9 8.1 7.8"/></g>`,
  pullRequest: (hue: string) =>
    `<g fill="none" stroke="${hue}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">` +
    `<circle cx="2.4" cy="2" r="1.3"/><circle cx="2.4" cy="8" r="1.3"/><circle cx="7.6" cy="8" r="1.3"/>` +
    `<path d="M2.4 3.3v3.4M7.6 6.7V4.6A1.6 1.6 0 0 0 6 3H4.4M5.6 1.8 4.4 3l1.2 1.2"/></g>`,
}

const icon = (x: number, body: string) =>
  `<g transform="translate(${x} ${D.iconTop}) scale(${D.icon / 10})">${body}</g>`

const LINE_LABELS = ['Now', 'Done', 'Idle', 'Your move', 'Next']
const LINE_LABEL_CHARACTERS = Math.max(...LINE_LABELS.map(label => label.length))

// Every line label takes the widest one's room, so the sentences after them start at one column.
const labelMark = (label: string, hue: string, isPulsing: boolean): BandMark => {
  const labelX = D.dot * 2 + 6
  const width = Math.ceil(labelX + Math.max(...LINE_LABELS.map(textWidth)) + 1)
  const pulse =
    isPulsing
      ? `<circle cx="${D.dot}" cy="${D.center}" r="${D.dot}" fill="${hue}">` +
        `<animate attributeName="r" values="${D.dot};${D.dot * 2.3};${D.dot * 2.3}" ${SHINE_CLOCK}/>` +
        `<animate attributeName="opacity" values=".45;0;0" ${SHINE_CLOCK}/></circle>`
      : ''

  return {
    svg: wrap(
      width,
      `${pulse}<circle cx="${D.dot}" cy="${D.center}" r="${D.dot}" fill="${shade(hue, -0.12)}"/>` +
        `<text x="${labelX}" y="${D.baseline}" font-size="${D.size}" class="ink" ` +
        `style="--l:${shade(hue, -0.38)};--d:${shade(hue, 0.25)}">${escapeXml(label)}</text>`,
    ),
    width,
    height: D.height,
    alt: label,
    glyphs: [
      { text: '●', color: hue },
      { text: label.padEnd(LINE_LABEL_CHARACTERS), color: hue, isBold: true },
    ],
  }
}

export const statusMark = (band: Band): BandMark => labelMark(band.label, BAND_HUES[band.status], band.status === 'running')

export const moveMark = () => labelMark('Your move', HUE.waiting, true)

export const nextMark = () => labelMark('Next', HUE.running, false)

export const progressMark = (progress: NonNullable<Band['progress']>): BandMark => {
  const barX = D.icon + 6
  const width = barX + BAR.width
  const y = (D.height - BAR.height) / 2
  const radius = BAR.height / 2
  const filled = Math.max(progress.done > 0 ? BAR.height : 0, (BAR.width * progress.percent) / 100)
  const cells = Math.round((progress.percent / 100) * TERMINAL_BAR_CELLS)
  const hue = HUE.running

  return {
    svg: wrap(
      width,
      icon(0, ICONS.checklist(shade(HUE.done, -0.15))) +
        `<defs><clipPath id="bar"><rect x="${barX}" y="${y}" width="${filled}" height="${BAR.height}" rx="${radius}"/></clipPath></defs>` +
        `<rect x="${barX}" y="${y}" width="${BAR.width}" height="${BAR.height}" rx="${radius}" class="track" style="--h:${hue}"/>` +
        `<rect x="${barX}" y="${y}" width="${filled}" height="${BAR.height}" rx="${radius}" fill="${shade(hue, -0.12)}"/>` +
        `<g clip-path="url(#bar)"><rect y="${y}" width="16" height="${BAR.height}" fill="url(#shine)">` +
        `<animate attributeName="x" values="${barX - 16};${barX + BAR.width};${barX + BAR.width}" ${SHINE_CLOCK}/></rect></g>`,
    ),
    width,
    height: D.height,
    alt: `${progress.percent}% of checkpoints done`,
    glyphs: [{ text: '▰'.repeat(cells) + '▱'.repeat(TERMINAL_BAR_CELLS - cells), color: hue }],
  }
}

// A usage window's fill: a thin bar, as the progress bar draws without its icon.
export const meterMark = (percent: number, hue: string, alt: string): BandMark => {
  const shown = Math.max(0, Math.min(100, percent))
  const y = (D.height - BAR.height) / 2
  const radius = BAR.height / 2
  const filled = shown === 0 ? 0 : Math.max(BAR.height, (BAR.width * shown) / 100)
  const cells = Math.round((shown / 100) * TERMINAL_BAR_CELLS)

  return {
    svg: wrap(
      BAR.width,
      `<rect x="0" y="${y}" width="${BAR.width}" height="${BAR.height}" rx="${radius}" class="track" style="--h:${hue}"/>` +
        `<rect x="0" y="${y}" width="${filled}" height="${BAR.height}" rx="${radius}" fill="${shade(hue, -0.12)}"/>`,
    ),
    width: BAR.width,
    height: D.height,
    alt,
    glyphs: [{ text: '▰'.repeat(cells) + '▱'.repeat(TERMINAL_BAR_CELLS - cells), color: hue }],
  }
}

const WINDOW_DOTS = { columns: 10, rows: 2, gap: 4.4, radius: 1.3 }

// The context window's fill as two rows of dots, filled column by column.
export const windowMark = (percent: number, hue: string, alt: string): BandMark => {
  const { columns, rows, gap, radius } = WINDOW_DOTS
  const shown = Math.max(0, Math.min(100, percent))
  const filled = shown === 0 ? 0 : Math.max(1, Math.round((shown / 100) * columns * rows))
  const dots = Array.from({ length: columns * rows }, (_, index) => {
    const column = Math.floor(index / rows)
    const y = D.center + (index % rows === 0 ? -2.4 : 2.4)
    const fill = index < filled ? `fill="${shade(hue, -0.05)}"` : `class="track" style="--h:${hue}"`

    return `<circle cx="${radius + column * gap}" cy="${y}" r="${radius}" ${fill}/>`
  }).join('')
  const cells = shown === 0 ? 0 : Math.max(1, Math.round((shown / 100) * columns))
  const width = Math.ceil(radius * 2 + (columns - 1) * gap)

  return {
    svg: wrap(width, dots),
    width,
    height: D.height,
    alt,
    glyphs: [{ text: '●'.repeat(cells) + '·'.repeat(columns - cells), color: hue }],
  }
}

const iconMark = (body: (hue: string) => string, hue: string, glyph: string, alt: string): BandMark => ({
  svg: wrap(D.icon, icon(0, body(shade(hue, -0.15)))),
  width: D.icon,
  height: D.height,
  alt,
  glyphs: [{ text: glyph, color: hue }],
})

export const agentsMark = () => iconMark(ICONS.agent, HUE.agents, '◆', 'Subagents')

// A pill: a rounded tint of its hue, a thin outline, an icon and the label, one height for every pill.
const PILL = { height: 20, size: 11.5, padX: 7, icon: 9, gap: 4, radius: 6 }

const PILL_ICONS = {
  check: '<path d="M1.6 5.4 4 7.8 8.6 2.6" fill="none" class="line" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  cross: '<path d="M2.4 2.4 7.6 7.6M7.6 2.4 2.4 7.6" fill="none" class="line" stroke-width="1.6" stroke-linecap="round"/>',
  clock:
    '<circle cx="5" cy="5" r="4" fill="none" class="line" stroke-width="1.3"/>' +
    '<path d="M5 2.8V5l1.6 1.2" fill="none" class="line" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>',
  dot: '<circle cx="5" cy="5" r="2.6" class="ink"/>',
  arrow:
    '<path d="M8.6 5H1.8M4.6 2 1.6 5l3 3" fill="none" class="line" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  person:
    '<circle cx="5" cy="3.2" r="2" fill="none" class="line" stroke-width="1.3"/>' +
    '<path d="M1.4 9.2c.6-2 2-3 3.6-3s3 1 3.6 3" fill="none" class="line" stroke-width="1.3" stroke-linecap="round"/>',
}

export type PillIcon = keyof typeof PILL_ICONS

export const pillMark = (label: string, hue: string, icon: PillIcon, alt = label): BandMark => {
  const textX = PILL.padX + PILL.icon + PILL.gap
  // The width table runs a little short on longer labels in this weight, so the label gets 5% more room.
  const width = Math.ceil(textX + textWidth(label) * (PILL.size / D.size) * 1.05 + PILL.padX)
  const top = (D.height - PILL.height) / 2
  const ink = `--l:${shade(hue, -0.38)};--d:${shade(hue, 0.3)}`

  return {
    svg: wrap(
      width,
      `<rect x=".5" y="${top + 0.5}" width="${width - 1}" height="${PILL.height - 1}" rx="${PILL.radius}" ` +
        `fill="${hue}" fill-opacity=".14" stroke="${hue}" stroke-opacity=".42"/>` +
        `<g transform="translate(${PILL.padX} ${(D.height - PILL.icon) / 2}) scale(${PILL.icon / 10})" style="${ink}">` +
        `${PILL_ICONS[icon]}</g>` +
        `<text x="${textX}" y="${D.baseline - 0.5}" font-size="${PILL.size}" class="ink" style="${ink}">${escapeXml(label)}</text>`,
    ),
    width,
    height: D.height,
    alt,
    glyphs: [{ text: ` ${label} `, color: hue }],
  }
}

// A PR stack in merge order: one dot per PR in the hue of what it needs next, this session's ringed.
const STRIP = { step: 11, dot: 3.4, ring: 5.6, edge: 6, most: 10 }

export const stackStripMark = (rows: readonly { hue: string; isSession: boolean }[], alt: string): BandMark => {
  const shown = rows.slice(0, STRIP.most)
  const more = rows.length - shown.length
  const last = STRIP.edge + Math.max(0, shown.length - 1) * STRIP.step
  const moreText = more > 0 ? `+${more}` : ''
  const width = Math.ceil(last + STRIP.edge + (more > 0 ? textWidth(moreText) * (11 / D.size) + 3 : 0))

  return {
    svg: wrap(
      width,
      `<path d="M${STRIP.edge} ${D.center}H${last}" class="line" stroke-width="1.2" style="--l:#a8a8a8;--d:#6b6b6b"/>` +
        shown
          .map((row, index) => {
            const x = STRIP.edge + index * STRIP.step
            const ring = row.isSession
              ? `<circle cx="${x}" cy="${D.center}" r="${STRIP.ring}" fill="none" class="line" stroke-width="1.3" style="--l:#3a3a3a;--d:#e6e6e6"/>`
              : ''

            return `${ring}<circle cx="${x}" cy="${D.center}" r="${STRIP.dot}" fill="${row.hue}"/>`
          })
          .join('') +
        (more > 0
          ? `<text x="${last + STRIP.edge + 2}" y="${D.baseline - 0.5}" font-size="11" class="ink" style="--l:#6b6b6b;--d:#9a9a9a">${moreText}</text>`
          : ''),
    ),
    width,
    height: D.height,
    alt,
    glyphs: [
      ...shown.map(row => ({ text: row.isSession ? '◉' : '●', color: row.hue })),
      ...(more > 0 ? [{ text: moreText, isDim: true }] : []),
    ],
  }
}

export const pullRequestMark = (isLinked: boolean) =>
  iconMark(ICONS.pullRequest, isLinked ? HUE.done : HUE.idle, '⑂', isLinked ? 'Pull requests' : 'No pull request')

export const chromeMark = (chrome: Band['chrome']): BandMark => {
  return {
    svg: wrap(D.icon, icon(0, ICONS.globe(shade(CHROME_HUES[chrome], -0.15)))),
    width: D.icon,
    height: D.height,
    alt: `Chrome ${chrome === 'live' ? 'live' : chrome === 'down' ? 'not answering' : 'not linked'}`,
    glyphs: [{ text: '🌐' }, { text: '●', color: CHROME_HUES[chrome] }],
  }
}

const LINEAR_HUES: Record<string, string> = {
  'In Progress': HUE.waiting,
  'Pending review': HUE.running,
  'Pending release': HUE.done,
  Released: HUE.done,
  Canceled: HUE.failed,
}

export const linearMark = (state: string): BandMark =>
  iconMark(ICONS.linear, LINEAR_HUES[state] ?? HUE.idle, '◒', `Linear issue${state === '' ? '' : `, ${state}`}`)

export const clip = (text: string, limit: number) =>
  [...text].length > limit ? `${[...text].slice(0, Math.max(1, limit - 1)).join('')}…` : text
