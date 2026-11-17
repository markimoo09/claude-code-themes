import { expect, mock, test } from 'claude-code/testing'

import { LOOKS } from '../hooks/looks/index'

// The switching logic: what /custom-theme says, what it stores, and what each session applies.
// The test host refuses any theme with a backdrop ("id is 1 to 64 ... (host check)"),
// so a look's own drawing is checked in the app, not here.

type On = Parameters<Extract<Parameters<typeof test>[1], (...args: never[]) => unknown>>[1]

function engine(on: On): string[] {
  const seen: string[] = []

  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('theme.clear', () => {
    seen.push('clear')

    return { value: { isDrawn: false, reason: 'cleared' } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  return seen
}

const run = (args: string, command = 'custom-theme') => ({ command, args }) as never

test('/custom-theme lists every theme, numbered, and marks the one in use', async ($, on) => {
  mock.store(on, { look: 'cosmos' })
  engine(on)

  const text = (await $.command.run(run(''))).text

  expect(text).toContain('● 1. cosmos')
  expect(text).toContain('○ 2. pixel-cats')
  expect(text).toContain('○ 3. dark-fleet')
  expect(text).toContain('○ 4. neon-tokyo')
  expect(text).toContain('○ 5. marina-bay')
  expect(text).toContain('○ 6. kyoto-sunset')
  expect(text).toContain('○ 7. kyoto-sakura')
  expect(text).toContain('○ 8. christmas-eve')
  expect(text).toContain('○ 9. off')
})

test('the last theme used is the one the next session starts with', async ($, on) => {
  mock.store(on, { look: 'cosmos' })
  const seen = engine(on)

  expect((await $.command.run(run('off'))).text).toContain('Theme off')

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(seen).toEqual(['clear'])
  expect((await $.command.run(run(''))).text).toContain('● 9. off')
})

test('a theme can be picked by its number', async ($, on) => {
  mock.store(on, { look: 'cosmos' })
  engine(on)

  expect((await $.command.run(run('9'))).text).toContain('Theme off')
  expect((await $.command.run(run(''))).text).toContain('● 9. off')
})

test('/look is the same command, and next goes from the last theme to off', async ($, on) => {
  mock.store(on, { look: 'christmas-eve' })
  engine(on)

  expect((await $.command.run(run('next', 'look'))).text).toContain('Theme off')
  expect((await $.command.run(run('', 'look'))).text).toContain('● 9. off')
})

test('an unknown name or number changes nothing', async ($, on) => {
  mock.store(on, { look: 'off' })
  const seen = engine(on)

  expect((await $.command.run(run('aurora'))).text).toContain('No theme named "aurora"')
  expect((await $.command.run(run('10'))).text).toContain('No theme named "10"')
  expect((await $.command.run(run(''))).text).toContain('● 9. off')
  expect(seen).toEqual([])
})

test('a stored name that no longer exists falls back to the default', async ($, on) => {
  mock.store(on, { look: 'retired-look' })
  engine(on)

  expect((await $.command.run(run(''))).text).toContain('● 2. pixel-cats')
})

test('with nothing picked yet, Pixel cats is the theme in use', async ($, on) => {
  mock.store(on)
  engine(on)

  expect((await $.command.run(run(''))).text).toContain('● 2. pixel-cats')
})

test('each backdrop names a scene that is drawn, under a name that changes with the drawing', async () => {
  for (const look of LOOKS) {
    const backdrop = look.theme.backdrop
    const name = backdrop !== undefined && 'scene' in backdrop ? backdrop.scene : ''

    expect(new RegExp(`^${look.id}-[0-9a-z]+$`).test(name ?? '')).toBe(true)
    expect(look.scenes[name ?? ''] !== undefined).toBe(true)
  }
})
