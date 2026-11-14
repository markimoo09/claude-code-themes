import type { EngineInterface, Register } from 'claude-code'

import { DEFAULT_LOOK, LOOKS } from './looks/index'
import type { Look } from './looks/types'

// The pick is kept in one shared file, ~/.claude/looks-choice.json, so every chat (and every
// copy of this plugin) follows the same choice. Each open chat checks the file's modified time
// every few seconds and when the app attaches, and applies a new pick. The plugin's own store
// is kept as a fallback for picks made before the shared file existed.
const STORE_KEY = 'look'
const OFF = 'off'
const CHECK_EVERY_MS = 4000

const find = (id: string): Look | undefined => LOOKS.find(look => look.id === id)
const isChoice = (id: unknown): id is string => typeof id === 'string' && (id === OFF || find(id) !== undefined)

async function choicePath($: EngineInterface): Promise<string | undefined> {
  try {
    const home = await $.env.get('HOME')

    return home === undefined || home === '' ? undefined : `${home}/.claude/looks-choice.json`
  } catch {
    return undefined
  }
}

async function chosen($: EngineInterface): Promise<string> {
  const path = await choicePath($)

  if (path !== undefined) {
    try {
      const text = await $.fs.read(path)
      const look: unknown = typeof text === 'string' ? (JSON.parse(text) as { look?: unknown }).look : undefined

      if (isChoice(look)) {
        return look
      }
    } catch {
      // No shared file yet, or it is unreadable: fall back to the store.
    }
  }
  const stored = await $.store.get(STORE_KEY)

  return isChoice(stored) ? stored : DEFAULT_LOOK
}

async function save($: EngineInterface, id: string): Promise<void> {
  await $.store.set(STORE_KEY, id)
  const path = await choicePath($)

  if (path !== undefined) {
    try {
      await $.fs.write(path, `${JSON.stringify({ look: id }, null, 2)}\n`)
      seenMtime = (await $.fs.stat(path)).mtimeMs
    } catch {
      // The store still holds the pick for this plugin's own chats.
    }
  }
}

// What this chat has applied, and the shared file's modified time it last acted on.
// Both start over on a reload, which re-runs session.start and applies the pick again.
let applied: string | undefined
let seenMtime = -1

// Applies a look, or the app's own when `id` is "off". Returns a line for the person.
async function apply($: EngineInterface, id: string): Promise<string> {
  if (id === OFF) {
    await $.theme.clear()
    applied = OFF

    return 'Theme off: the app’s own theme is back.'
  }
  const look = find(id)

  if (look === undefined) {
    return `No theme named "${id}".`
  }
  const unpainted = look.problems?.find(line => line.startsWith("Desktop won't paint"))

  if (unpainted !== undefined) {
    return `${look.label} was not applied: ${unpainted}`
  }
  let set: Awaited<ReturnType<EngineInterface['theme']['set']>>

  try {
    set = await $.theme.set(look.theme)
  } catch (error) {
    return `${look.label} was not applied: ${error instanceof Error ? error.message : String(error)}`
  }
  applied = id

  return set.isDrawn
    ? `Theme: ${look.label}.`
    : `Theme: ${look.label} (saved, but not drawn here: ${set.reason}).`
}

// Applies the shared pick when it changed since this chat last looked.
async function follow($: EngineInterface, isForced: boolean): Promise<void> {
  const path = await choicePath($)

  if (path === undefined) {
    return
  }
  try {
    const mtime = (await $.fs.stat(path)).mtimeMs

    if (mtime === seenMtime && !isForced) {
      return
    }
    seenMtime = mtime
  } catch {
    return
  }
  const id = await chosen($)

  if (id !== applied) {
    await apply($, id)
  }
}

// The choices in list order: each look, then off. `/custom-theme <n>` picks by this number.
const choices = (): string[] => [...LOOKS.map(look => look.id), OFF]

function list(current: string): string {
  const rows = choices().map((id, i) => {
    const mark = id === current ? '●' : '○'
    const what = id === OFF ? 'the app’s own theme' : (find(id)?.description ?? '')

    return `${mark} ${i + 1}. ${id}: ${what}`
  })

  return [
    'Themes (● is in use in every chat, and new chats start with it):',
    ...rows,
    '',
    'Switch with /custom-theme <name or number>, or /custom-theme next.',
  ].join('\n')
}

// Answers `/custom-theme` and its short form `/look`.
async function handle($: EngineInterface, args: string): Promise<{ text: string }> {
  const current = await chosen($)
  const asked = args.trim().toLowerCase()

  if (asked === '' || asked === 'list') {
    return { text: list(current) }
  }
  const ids = choices()
  const byNumber = /^\d+$/.test(asked) ? ids[Number(asked) - 1] : undefined
  const target =
    asked === 'next' ? (ids[(ids.indexOf(current) + 1) % ids.length] ?? DEFAULT_LOOK) : (byNumber ?? asked)

  if (target !== OFF && find(target) === undefined) {
    return { text: `No theme named "${asked}".\n\n${list(current)}` }
  }
  const line = await apply($, target)

  if (line.startsWith('Theme')) {
    await save($, target)
  }

  return { text: line }
}

const SPEC = {
  description: 'List and switch custom themes (every chat follows the last pick)',
  argumentHint: '[name | number | next | off]',
  immediate: true,
} as const

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // Another copy of this plugin (a session's dev copy, say) may hold the names already.
    for (const name of ['custom-theme', 'look'] as const) {
      try {
        await $.command.register({ name, ...SPEC, ...(name === 'look' ? { description: 'Short for /custom-theme' } : {}) })
      } catch {
        // Already registered elsewhere: that copy answers it.
      }
    }
    const id = await chosen($)

    if (id !== OFF) {
      const line = await apply($, id)

      if (!line.startsWith('Theme:')) {
        $.ui.toast(line)
      }
    } else {
      applied = OFF
    }
    const path = await choicePath($)

    try {
      seenMtime = path === undefined ? -1 : (await $.fs.stat(path)).mtimeMs
    } catch {
      seenMtime = -1
    }
    try {
      $.clock.every(CHECK_EVERY_MS, () => {
        void follow($, false)
      })
    } catch {
      // No timers here: the chat still follows a pick when the app attaches.
    }

    return next(e)
  })

  // The app opening or reconnecting to this chat: catch up with a pick made elsewhere.
  on('session.attach', async ($, e, next) => {
    const result = await next(e)

    void follow($, true)

    return result
  })

  on('command.run', { command: 'custom-theme' }, ($, e) => handle($, e.args))
  on('command.run', { command: 'look' }, ($, e) => handle($, e.args))

  // Draws the moving scene the current look's backdrop names.
  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    const scene = LOOKS.map(look => look.scenes[e.props.scene]).find(found => found !== undefined)

    if (scene === undefined) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return <Svg source={scene.source} alt={scene.alt} isInteractive />
  })
}
