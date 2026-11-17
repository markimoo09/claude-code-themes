import { expect, mock, test } from 'claude-code/testing'

// Every chat follows one shared pick in ~/.claude/looks-choice.json.

type On = Parameters<Extract<Parameters<typeof test>[1], (...args: never[]) => unknown>>[1]

const FILE = '/home/test/.claude/looks-choice.json'
const run = (args: string) => ({ command: 'custom-theme', args }) as never

// An in-memory shared file, a clock, and the engine calls the plugin makes.
function setup(on: On, initial?: string, stored?: string) {
  const file = { text: initial, mtime: initial === undefined ? 0 : 1, writes: [] as string[] }
  const themes: string[] = []

  mock.env(on, { HOME: '/home/test' })
  mock.store(on, stored === undefined ? {} : { look: stored })
  on('fs.read', (_, e) => {
    if (e.path !== FILE || file.text === undefined) {
      throw new Error('ENOENT')
    }

    return { value: file.text }
  })
  on('fs.write', (_, e) => {
    file.text = e.text
    file.mtime += 1
    file.writes.push(e.path)

    return { value: undefined }
  })
  on('fs.stat', (_, e) => {
    if (e.path !== FILE || file.text === undefined) {
      throw new Error('ENOENT')
    }

    return { value: { mtimeMs: file.mtime, size: file.text.length, kind: 'file' } as never }
  })
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('theme.clear', () => {
    themes.push('clear')

    return { value: { isDrawn: false, reason: 'cleared' } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  return { file, themes }
}

test('a pick is written to the shared file', async ($, on) => {
  const { file } = setup(on)

  expect((await $.command.run(run('off'))).text).toContain('Theme off')
  expect(file.writes).toEqual([FILE])
  expect(JSON.parse(file.text ?? '{}')).toEqual({ look: 'off' })
})

test('the shared file wins over the plugin store', async ($, on) => {
  setup(on, '{ "look": "off" }', 'cosmos')

  expect((await $.command.run(run(''))).text).toContain('● 9. off')
})

test('an open chat follows a pick made in another chat', async ($, on) => {
  const clock = mock.clock(on)
  const { file, themes } = setup(on)

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(themes).toEqual([])

  // Another chat picks "off": the file changes on disk.
  file.text = '{ "look": "off" }'
  file.mtime += 1
  await clock.advance(4000)

  expect(themes).toEqual(['clear'])

  // Nothing changes after that: no more work on later checks.
  await clock.advance(8000)
  expect(themes).toEqual(['clear'])
})
