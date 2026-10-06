export type MonitorProgress = { completed: number; total: number; percent: number }

export type MonitorStatus = 'pending' | 'running' | 'blocked' | 'completed' | 'failed'

export type MonitorTask = {
  id: string
  title: string
  status: MonitorStatus
  currentActivity?: string
  statusReason?: string
  waitingOn: string[]
  startedAt?: string
  completedAt?: string
  children: MonitorTask[]
  progress: MonitorProgress
}

export type MonitorIssue = { taskId: string; taskTitle: string; reason: string; since: string }

export type MonitorGraph = {
  run: { goal: string; status: string; createdAt: string; updatedAt: string } | null
  tasks: MonitorTask[]
  progress: MonitorProgress
  current: Array<{ taskId: string; taskTitle: string; activity?: string; since: string; startedAt?: string }>
  blockers: MonitorIssue[]
  failures: MonitorIssue[]
  upNext: Array<{ taskId: string; taskTitle: string }>
  lastEventAt?: string
}

export type MonitorAgent = {
  id: string
  label: string
  type: string
  status: string
  name?: string
  model?: string
  seenAt: number
}

export type MonitorPrompt = { id: string; text: string }

export type MonitorSummary = { now: string; isWorking: boolean; at: number }

export type MonitorIssueInfo = { identifier: string; title: string; url: string; state: string; labels: string[] }

export type MonitorPullRequest = {
  number: number
  title: string
  url: string
  state: string
  branch: string
  checks: 'passing' | 'failing' | 'pending' | 'none'
}

export type MonitorStackPullRequest = {
  number: number
  title: string
  url: string
  parent: number | null
  ci: 'passing' | 'failing' | 'pending' | 'none'
  threadsNeedingYou: Array<{ url: string; quote: string }>
  unansweredThreads: number
  blocker: string
  isFixable: boolean
  isSession: boolean
}

export type MonitorHeader = {
  branch: string
  issue: MonitorIssueInfo | null
  pullRequest: MonitorPullRequest | null
  linearNote?: string
}

export type MonitorSlot = {
  slot: number
  profile: string
  port: number
  worktree: string
  pid: number
  claimedAt: string
}

export type MonitorChrome = {
  own: MonitorSlot | null
  isReachable: boolean
  chromePid: number | null
  tabs: Array<{ title: string; url: string }>
  others: MonitorSlot[]
}

/** One task of the plan the plan tool keeps: `since` is when it entered its status. */
export type MonitorPlanTask = {
  id: string
  title: string
  status: MonitorStatus
  note?: string
  since: string
  startedAt?: string
  completedAt?: string
  children: MonitorPlanTask[]
}

/** This session's plan, as the model last sent it through the plan tool. */
export type MonitorPlan = { goal: string; createdAt: string; updatedAt: string; tasks: MonitorPlanTask[] }

/** The usage figures the engine last measured: the context window and the rate-limit windows. */
export type MonitorUsage = {
  context: { tokens?: number; window: number; percent?: number }
  rateLimits: Array<{ kind: string; percentUsed: number; resetsAt?: string }>
}

export type MonitorSectionId = 'plan' | 'prompts' | 'stack'

/** A section opened or closed by hand, and whether it needed the person then: the choice holds until that changes. */
export type MonitorSectionChoice = { isOpen: boolean; needsYou: boolean }

declare module 'claude-code' {
  interface PluginState {
    monitor: {
      plan: MonitorPlan | null
      graph: MonitorGraph | null
      minute: number
      agents: MonitorAgent[]
      chrome: MonitorChrome | null
      header: MonitorHeader | null
      pinnedIssue: string | null
      prompts: MonitorPrompt[]
      step: string | null
      summary: MonitorSummary | null
      stack: MonitorStackPullRequest[]
      sections: Partial<Record<MonitorSectionId, MonitorSectionChoice>>
      usage: MonitorUsage | null
      cacheShare: number | null
      active: boolean
    }
  }
}
