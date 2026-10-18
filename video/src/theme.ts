import { loadFont } from '@remotion/fonts'
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono'
import { staticFile } from 'remotion'

// Refill's chronograph tokens (src/styles.css in the app). Colour carries meaning, never decoration.
export const C = {
  canvas: '#0a0a0c',
  surface: '#131316',
  surface2: '#18181c',
  surface3: '#222228',
  ink: '#f4f1ea',
  ink2: '#a9a59c',
  ink3: '#6f6c66',
  line: 'rgba(244,241,234,0.08)',
  line2: 'rgba(244,241,234,0.14)',
  act: '#c6f24e', // can act / refilled
  beat: '#ffb547', // open gap
  danger: '#ff5d4d', // needs moving / out
}

export const F = {
  sans: 'Satoshi, sans-serif',
  display: '"Clash Display", Satoshi, sans-serif',
  mono: '"JetBrains Mono", monospace',
}

for (const w of [400, 500, 700]) loadFont({ family: 'Satoshi', url: staticFile(`fonts/Satoshi-${w}.woff2`), weight: String(w) })
for (const w of [500, 600]) loadFont({ family: 'Clash Display', url: staticFile(`fonts/ClashDisplay-${w}.woff2`), weight: String(w) })
loadMono('normal', { weights: ['400', '500'], subsets: ['latin'] })

export const FPS = 60
export const W = 1920
export const H = 1080
