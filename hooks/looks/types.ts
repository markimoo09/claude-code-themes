import type { ThemeSetArgs } from 'claude-code'

// One look: the theme `$.theme.set` receives, and the moving scenes its backdrop names.
export type Look = {
  // What `/look <id>` takes: lowercase letters, digits and hyphens.
  id: string
  label: string
  // One line for the `/look` list.
  description: string
  theme: ThemeSetArgs
  // Each scene the theme's backdrop can name, by scene name.
  scenes: Record<string, { source: string; alt: string }>
  // Contrast notes from makeColors, if the look was built with it.
  problems?: string[]
}
