import type { EngineInterface, Register } from 'claude-code'

import { DEFAULT_LOOK, LOOKS } from './looks/index'
import type { Look } from './looks/types'

// The chosen look is kept in the plugin's store, so every session starts with it.
const STORE_KEY = 'look'
const OFF = 'off'

const find = (id: string): Look | undefined => LOOKS.find(look => look.id === id)

async function chosen($: EngineInterface): Promise<string> {
  const stored = await $.store.get(STORE_KEY)

  return typeof stored === 'string' && (stored === OFF || find(stored) !== undefined) ? stored : DEFAULT_LOOK
}

// Applies a look, or the app's own when `id` is "off". Returns a line for the person.
async function apply($: EngineInterface, id: string): Promise<string> {
  if (id === OFF) {
    await $.theme.clear()

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

  return set.isDrawn
    ? `Theme: ${look.label}.`
    : `Theme: ${look.label} (saved, but not drawn here: ${set.reason}).`
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
    'Themes (● is in use, and new sessions start with it):',
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
    await $.store.set(STORE_KEY, target)
  }

  return { text: line }
}

const SPEC = {
  description: 'List and switch custom themes (the last one used stays on)',
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
    }

    return next(e)
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
