/** A reply an answer asks for: `text` is what a pick sends, `hint` what it picks. */
export type Reply = { text: string; hint: string }

const MAX_HINT = 48
const MAX_ASK_REPLIES = 4
const MAX_ASK_QUESTION = 200
const OPTIONS_TAIL_CHARACTERS = 1800

// An instruction to the reader: at the start of a sentence or a "Next:" label, or after "then", "or", "just"…
// "I replied with "Fixed in …"" names no reply to send.
const CUE = /(?:^[\s*>#\d.)-]*|[:—–]\**\s*|\b(?:just|then|or|please|can|to|and|you)\s+)(?:reply|say|type|answer)\b/i
const TOKEN = /\*{0,2}["“]([^"”\n]{1,40})["”]\*{0,2}|\*\*([^*"“\n]{1,12})\*\*/g
const EXAMPLE_BEFORE = /(?:for example|e\.g\.|such as|like|i\.e\.)[\s:,]*$/i
// A bold reply counts only right after its cue or another reply: "Reply **A** or **B**".
const BOLD_GAP = /^\s*(?:with\s+)?$|^\s*,?\s*or\s*$/i
const LETTER_OPTION =
  /^\s*(?:[-*]\s+)?(?:\*\*)?(?:Option\s+)?(?:\(([a-dA-D])\)|([A-D])(?:\s*\([^)]{1,20}\))?\s*[:.)—–])(?:\*\*)?:?\s*(?:\*\*)?\s*(.+)$/
const NUMBER_OPTION = /^\s*(?:\*\*)?([1-9])()[.)](?:\*\*)?\s+(.+)$/
// An option line tagged "(recommended)": "- **B (recommended):** …", "1. **Reconnect** (recommended)".
const RECOMMENDED_OPTION =
  /^\s*(?:[-*]\s+)?(?:\*\*)?(?:Option\s+)?\(?([A-D1-9])\)?(?=\s*[(:.)—–]|\*\*)[^\n]*\(recommended\)/im
const RECOMMENDED = /(?:[Rr]ecommend(?:ation|ed)?:?|➡️)\s*\**\s*(?:[Oo]ption\s*)?(?:\(([a-dA-D1-9])\)|\b([A-D1-9])\b)(?![\w'-])/
const HANDOFF = /\b(?:tell me (?:once|when|after)|let me know (?:once|when)|still waiting on you|waiting (?:on|for) you|waiting on your|say "done")\b/i
// A dialog interrupts, so only a direct ask counts: "Should I…?", "Do you want me to…?", "yes or no".
const DIRECT_YES_NO = /^\W*(?:should I|shall I|can I|may I|do you want(?: me)? to|want me to|ok to|okay to|is it ok)\b.*\?\**\s*$|\byes or no\b/i
const CHOICE_QUESTION = /\bwhich\b[^.?]*\?|\bpick one\b|\banswer by number\b/i

const withoutCode = (answer: string) => answer.replace(/```[\s\S]*?```/g, '').replace(/`([^`\n]*)`/g, '$1')

const paragraphsOf = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph !== '' && !/^-{3,}$/.test(paragraph))

const sentencesOf = (text: string) =>
  text.split(/(?<=[.?!]\**)\s+|(?<=[。？！])|\n+/).filter(sentence => sentence.trim() !== '')

const plainOf = (sentence: string) => sentence.replace(/\*\*|`/g, '').replace(/^\W*(?:Next|Still waiting on you):\s*/i, '').trim()

const hintOf = (text: string) => {
  const plain = text
    .replace(/\*\*/g, '')
    .replace(/^[\s:,—–-]+|^(?:and|to|then)\s+/i, '')
    .replace(/[.:]\s*$/, '')
    .trim()

  return plain.length > MAX_HINT ? `${plain.slice(0, MAX_HINT - 1).trimEnd()}…` : plain
}

/** `list` with the replies `isFirst` matches moved to the front, otherwise in order. */
const withFirst = (list: Reply[], isFirst: (reply: Reply) => boolean) => [
  ...list.filter(isFirst),
  ...list.filter(reply => !isFirst(reply)),
]

/** Every quoted or bold reply a "reply / say / type / answer" sentence names, after its cue word. */
const cuedRepliesOf = (text: string): Reply[] =>
  sentencesOf(text).flatMap(sentence => {
    const cue = CUE.exec(sentence)
    if (cue === null) return []

    let previousEnd = cue.index + cue[0].length

    return [...sentence.matchAll(TOKEN)]
      .filter(match => {
        const isAfterCue = match.index > cue.index && !EXAMPLE_BEFORE.test(sentence.slice(0, match.index))
        const isAdjacent = match[2] === undefined || BOLD_GAP.test(sentence.slice(previousEnd, match.index))
        if (isAfterCue && isAdjacent) previousEnd = match.index + match[0].length

        return isAfterCue && isAdjacent
      })
      .map(match => {
        const end = match.index + match[0].length
        const after = sentence.slice(end).split(/,\s*or\b|\s+or\s+(?=\*\*|["“])|[,;]/)[0] ?? ''

        return { text: (match[1] ?? match[2] ?? '').trim(), hint: hintOf(after) }
      })
      .filter(reply => reply.text !== '' && !/[:?]$/.test(reply.text))
  })

/** The last list `option` reads, from its `first` label on; none for a lone option. */
const lastOptionsOf = (text: string, option: RegExp, first: string): Reply[] => {
  let options: Reply[] = []
  for (const line of text.split('\n')) {
    const match = option.exec(line)
    const label = (match?.[1] ?? match?.[2] ?? '').toUpperCase()
    if (label === '') continue
    if (label === first) options = []
    options.push({ text: label, hint: hintOf(match?.[match.length - 1] ?? '') })
  }

  return options.length >= 2 && options[0]?.text === first ? options : []
}

/** A question the dialog asks, with 1-4 replies to pick from. */
export type Ask = { question: string; replies: readonly Reply[] }

/**
 * The question `answer` closes on, when it names the reply it expects: a reply it
 * quotes ("reply **go**"), a lettered or numbered choice it asks to pick from, a
 * direct yes/no question, or a hand-off ("say done once…"); the recommended reply
 * first. Null for anything weaker, since the dialog it opens interrupts the person.
 */
export const askOf = (answer: string, closingParagraphs = 1): Ask | null => {
  const text = withoutCode(answer)
  const closing = paragraphsOf(text).slice(-closingParagraphs).join('\n\n')
  const sentences = sentencesOf(closing)
  const yesNo = sentences.find(sentence => DIRECT_YES_NO.test(plainOf(sentence)))
  const choice = sentences.find(sentence => CHOICE_QUESTION.test(sentence))
  const cued = cuedRepliesOf(closing)
  const letters = lastOptionsOf(text, LETTER_OPTION, 'A')
  const isOptionAsk = choice !== undefined || cued.some(reply => /^[A-D1-9]$/.test(reply.text))
  const options = !isOptionAsk ? [] : letters.length > 0 ? letters : lastOptionsOf(text, NUMBER_OPTION, '1')
  const tail = text.slice(-OPTIONS_TAIL_CHARACTERS)
  const recommended = RECOMMENDED.exec(tail)
  const pick = (recommended?.[1] ?? recommended?.[2] ?? RECOMMENDED_OPTION.exec(tail)?.[1])?.toUpperCase()
  const isPick = (reply: Reply) => reply.text.toUpperCase() === pick

  const candidates = [
    ...withFirst(cued, isPick),
    ...withFirst(options, isPick),
    ...(yesNo === undefined
      ? []
      : [
          { text: 'yes', hint: '' },
          { text: 'no', hint: '' },
        ]),
    ...(HANDOFF.test(closing) ? [{ text: 'done', hint: '' }] : []),
  ]
  const replies: Reply[] = []
  for (const candidate of candidates) {
    const same = replies.find(reply => reply.text.toLowerCase() === candidate.text.toLowerCase())
    if (same === undefined) replies.push(candidate)
    else if (same.hint === '') same.hint = candidate.hint
  }
  if (replies.length === 0) return null

  const asked = plainOf(yesNo ?? choice ?? '')
  const question = asked.endsWith('?') && asked.length <= MAX_ASK_QUESTION ? asked : "What's your reply?"

  return { question, replies: replies.slice(0, MAX_ASK_REPLIES) }
}
