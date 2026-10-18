// Minutes as particles: a WebGL2 point field drawn over the dial, in the dial's own coordinates.
// Every mote is a minute of the sample day. The booked minutes orbit the face as fine dust in
// depth; the open gap's minutes breathe amber round it; Harsh's cancelled minutes break out of
// his arc when he cancels and rush back in lime when the slot refills; Arjun's clients' minutes
// shed coral when he is out, and Manav's travel to Riya's ring. The story's timeline drives the
// field through `state`; the pointer pushes motes aside, a click sends a wave through them, and
// the scroll's speed twists the dust. No library: one draw call, about two thousand points.
import gsap from 'gsap'
import { HI, LO, arjun, harsh, manav, moveTo, open, slots, toMove } from './facts'
import { ringOf } from './geo'

export interface FieldState {
  intro: number; gap: number; refill: number; clear: number; out: number; move: number; dim: number; fade: number
}
export const fieldState = (): FieldState => ({ intro: 0, gap: 0, refill: 0, clear: 0, out: 0, move: 0, dim: 0, fade: 1 })

export interface Live {
  pointer: () => { x: number; y: number; on: number }
  ripple: () => { x: number; y: number; age: number }
  tilt: () => { x: number; y: number; spin: number }
  velocity: () => number
}

const VERT = `#version 300 es
in float aMin; in float aR; in float aG; in vec3 aS;
uniform float uDust, uLo, uHi, uT, uIntro, uGap, uRefill, uClear, uOut, uMove, uDim, uFade, uVel, uMoveTo, uDpr, uPersp, uScale;
uniform vec2 uCenter, uView, uPtr, uCopy; uniform float uPtrOn;
uniform vec3 uRip; uniform vec3 uTilt;
uniform vec3 cInk, cBeat, cAct, cDanger;
out vec4 vCol;
const float PI = 3.14159265;
float angOf(float m) { return radians(-150.0 + (clamp(m, uLo, uHi) - uLo) / (uHi - uLo) * 300.0); }
vec2 onRing(float r, float a) { return vec2(r * sin(a), -r * cos(a)); }
float ease(float t) { t = clamp(t, 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
void main() {
  float a = angOf(aMin);
  vec2 base = onRing(aR, a);
  vec2 dir = normalize(base + 0.0001);
  vec2 side = vec2(-dir.y, dir.x);
  vec3 p; vec3 col = cInk; float alpha = 0.0; float size = 2.0;
  // A slow wander for every mote, so the field is never quite still.
  vec2 wander = vec2(sin(uT * (0.35 + aS.x * 0.4) + aS.y * 40.0), cos(uT * (0.3 + aS.y * 0.4) + aS.z * 40.0));
  if (aG < 0.5) {
    // The day's booked minutes: fine dust in depth round the face, turning slowly, pushed out of the waitlist's way.
    float r = mix(224.0, 318.0, aS.y * aS.y) + uClear * 72.0 + abs(uVel) * 0.9 * aS.z;
    float aa = a + uT * 0.012 * (0.5 + aS.x) + uVel * 0.0022 * (0.4 + aS.z);
    p = vec3(onRing(r, aa), mix(-300.0, 150.0, aS.z) * (1.0 + abs(uVel) * 0.02));
    // The intro assembles it out of a wide, scattered cloud.
    vec3 from = vec3(onRing(520.0 + aS.x * 380.0, aa + (aS.y - 0.5) * 2.4), (aS.z - 0.5) * 900.0);
    p = mix(from, p, ease(uIntro));
    alpha = (0.2 + 0.3 * (0.5 + 0.5 * sin(uT * (0.8 + aS.x) + aS.y * 30.0))) * uFade;
    // Dust never drifts over the copy: it thins out on the copy's side of the face.
    alpha *= (1.0 - smoothstep(210.0, 300.0, dot(p.xy, uCopy))) * uDust;
    size = 1.5 + aS.z * 2.2;
  } else if (aG < 1.5) {
    // Harsh's cancelled minutes: out of the arc on the cancel, back in lime on the refill, gone into the arc.
    float back = ease(uRefill * 1.7 - aS.x * 0.7);
    vec2 out2 = base + dir * (34.0 + aS.x * 120.0) + side * (aS.y - 0.5) * 70.0 + wander * 10.0;
    float z = (aS.z - 0.5) * 240.0;
    float g = ease(uGap) * (1.0 - back);
    p = vec3(mix(base, out2, g), z * g);
    col = mix(mix(cInk, cBeat, ease(uGap * 2.0)), cAct, back);
    alpha = ease(uGap * 3.0) * (0.9 - back * back * 0.9);
    size = 2.6 + aS.z * 1.8;
  } else if (aG < 2.5) {
    // The open gap's minutes breathe amber round it; dim when its ring steps back.
    p = vec3(base + dir * (wander.x * 9.0 + (aS.y - 0.5) * 16.0) + side * wander.y * 6.0, (aS.z - 0.5) * 70.0 + wander.y * 14.0);
    col = cBeat;
    alpha = (0.38 + 0.3 * sin(uT * 2.6 + aS.x * 6.0)) * mix(1.0, 0.28, uDim) * uFade * ease(uIntro * 1.4);
    size = 2.0 + aS.z * 1.5;
  } else {
    // Arjun's clients' minutes shed coral when he is out; Manav's (group 4) travel to Riya's ring.
    float shed = ease(uOut);
    vec2 outp = base + dir * (16.0 + aS.x * 60.0) + side * (aS.y - 0.5) * 30.0 + wander * 6.0;
    vec3 pos = vec3(mix(base, outp, shed), (aS.z - 0.5) * 120.0 * shed);
    col = cDanger;
    alpha = shed * 0.8 * uFade;
    if (aG > 3.5) {
      float m = ease(uMove * 1.4 - aS.x * 0.4);
      pos = mix(pos, vec3(onRing(uMoveTo, a), 0.0), m);
      col = mix(cDanger, cInk, m);
      alpha *= 1.0 - m * m;
    }
    p = pos;
    size = 2.2 + aS.z * 1.4;
  }
  // The pointer pushes motes aside and toward you; a click's wave runs out through them.
  vec2 d = p.xy - uPtr;
  float dist = length(d) + 0.001;
  float push = uPtrOn * exp(-dist * dist / (2.0 * 70.0 * 70.0)) * 30.0;
  float band = uRip.z < 1.4 ? exp(-pow(dist - uRip.z * 420.0, 2.0) / 800.0) * (1.4 - uRip.z) * 26.0 : 0.0;
  vec2 dr = p.xy - uRip.xy;
  p.xy += d / dist * push + normalize(dr + 0.0001) * band;
  p.z += push * 1.6 + band;
  alpha = min(1.0, alpha * (1.0 + push / 30.0 + band / 20.0));
  // The face's own turn and tilt, then perspective, so the motes sit at real depths.
  float cs = cos(uTilt.z), sn = sin(uTilt.z);
  p.xy = vec2(p.x * cs - p.y * sn, p.x * sn + p.y * cs);
  float cx = cos(uTilt.x), sx = sin(uTilt.x);
  p = vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);
  float cy = cos(uTilt.y), sy = sin(uTilt.y);
  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  float f = uPersp / max(1.0, uPersp - p.z);
  vec2 px = uCenter + p.xy * f * uScale;
  gl_Position = vec4(px / uView * 2.0 - 1.0, 0.0, 1.0);
  gl_Position.y = -gl_Position.y;
  gl_PointSize = max(1.0, size * f * uDpr * (1.0 + push / 40.0));
  vCol = vec4(col, alpha);
}`

const FRAG = `#version 300 es
precision mediump float;
in vec4 vCol; out vec4 o;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = vCol.a * smoothstep(0.5, 0.12, d);
  o = vec4(vCol.rgb * a, a);
}`

/** The motes: minute of day, ring radius, group, three random numbers. */
function motes() {
  const out: number[] = []
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647) })()
  const add = (min: number, r: number, g: number) => out.push(min, r, g, rnd(), rnd(), rnd())
  // The day's booked minutes (one mote each), Harsh's included until he cancels.
  for (const s of slots) if (s.status === 'booked') for (let m = 0; m < s.minutes; m++) add(s.startMin + m, ringOf(s.staffId), 0)
  for (let m = 0; m < harsh.minutes; m += 0.25) add(harsh.startMin + m, ringOf(harsh.staffId), 1)
  for (const s of open) for (let m = 0; m < s.minutes; m += 0.34) add(s.startMin + m, ringOf(s.staffId), 2)
  for (const s of toMove) for (let m = 0; m < s.minutes; m += 0.5) add(s.startMin + m, ringOf(arjun.id), s.id === manav.id ? 4 : 3)
  return new Float32Array(out)
}

const hex = (v: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(v.trim())
  const n = m ? parseInt(m[1], 16) : 0xf4f1ea
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] as const
}

/**
 * Starts the field on a canvas covering the stage and returns a stop function. Nothing blocks the
 * page: the context is made when the browser is next idle, the shaders compile in the background
 * where the browser can, and the field gathers itself in once it is ready. Without WebGL2 there is
 * no field, and the story is unchanged.
 */
export function startField(canvas: HTMLCanvasElement, dial: HTMLElement, state: FieldState, live: Live): () => void {
  let dead = false
  let stop = () => {}
  let poll = 0
  const begin = () => {
    if (dead) return
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance' })
    if (!gl) return
    const prog = gl.createProgram()!
    for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]] as const) {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      gl.attachShader(prog, sh)
    }
    gl.linkProgram(prog)
    const parallel = gl.getExtension('KHR_parallel_shader_compile')
    const wait = () => {
      if (dead) return
      if (parallel && !gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR)) { poll = window.setTimeout(wait, 40); return }
      if (gl.getProgramParameter(prog, gl.LINK_STATUS)) stop = run(gl, prog)
    }
    wait()
  }
  const ric = (window as Window).requestIdleCallback as Window['requestIdleCallback'] | undefined
  const idle = ric ? ric(begin, { timeout: 200 }) : (window as Window).setTimeout(begin, 60)
  return () => {
    dead = true
    if (ric) cancelIdleCallback(idle)
    else clearTimeout(idle)
    clearTimeout(poll)
    stop()
  }

function run(gl: WebGL2RenderingContext, prog: WebGLProgram): () => void {
  gl.useProgram(prog)
  const data = motes()
  const count = data.length / 6
  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
  const attr = (name: string, size: number, offset: number) => {
    const loc = gl.getAttribLocation(prog, name)
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 24, offset * 4)
  }
  attr('aMin', 1, 0); attr('aR', 1, 1); attr('aG', 1, 2); attr('aS', 3, 3)
  const U = (n: string) => gl.getUniformLocation(prog, n)
  const u = Object.fromEntries(['uDust', 'uLo', 'uHi', 'uT', 'uIntro', 'uGap', 'uRefill', 'uClear', 'uOut', 'uMove', 'uDim', 'uFade', 'uVel', 'uMoveTo', 'uDpr', 'uPersp', 'uScale', 'uCenter', 'uView', 'uPtr', 'uCopy', 'uPtrOn', 'uRip', 'uTilt', 'cInk', 'cBeat', 'cAct', 'cDanger'].map((n) => [n, U(n)]))
  gl.uniform1f(u.uLo, LO); gl.uniform1f(u.uHi, HI); gl.uniform1f(u.uMoveTo, ringOf(moveTo.id))
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

  // Colours are the theme's own tokens, read again whenever the theme changes.
  const colours = () => {
    const cs = getComputedStyle(document.documentElement)
    gl.uniform3fv(u.cInk, hex(cs.getPropertyValue('--ink')))
    gl.uniform3fv(u.cBeat, hex(cs.getPropertyValue('--beat')))
    gl.uniform3fv(u.cAct, hex(cs.getPropertyValue('--act')))
    gl.uniform3fv(u.cDanger, hex(cs.getPropertyValue('--danger')))
    // Dark specks on paper read as grit, so the dust is fainter in the light theme.
    gl.uniform1f(u.uDust, document.documentElement.dataset.theme === 'light' ? 0.55 : 1)
  }
  colours()
  const themeWatch = new MutationObserver(colours)
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  const stacked = matchMedia('(max-width: 899px), (max-aspect-ratio: 1/1)')
  // Soft motes need no retina pixels: one canvas pixel per CSS pixel, less on a struggling device.
  // The dial's resting geometry is read from layout only when the stage resizes; each frame adds
  // the transform GSAP is applying, so the field never forces a layout mid-frame.
  let dpr = 1
  const host = dial.closest<HTMLElement>('.st-dial') ?? dial
  let cx = 0
  let cy = 0
  let side = 1
  const size = () => {
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr))
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr))
    gl.viewport(0, 0, canvas.width, canvas.height)
    cx = host.offsetLeft + host.offsetWidth / 2
    cy = host.offsetTop + host.offsetHeight / 2
    side = host.offsetWidth
  }
  size()
  const resize = new ResizeObserver(size)
  resize.observe(canvas)

  // Draw only while the stage is on screen and the tab is visible.
  let onScreen = true
  const seen = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting })
  seen.observe(canvas)

  // Drawn on GSAP's ticker, after the scroll and the timeline have moved the dial, so motes and
  // face never disagree by a frame.
  const t0 = performance.now()
  let slow = 0
  let last = t0
  const frame = () => {
    const now = performance.now()
    const dt = now - last
    last = now
    if (!onScreen || document.hidden) return
    if (dt > 22 && dt < 200) { if (++slow > 45 && dpr > 0.6) { dpr = 0.6; size(); slow = 0 } } else slow = Math.max(0, slow - 1)
    const k = Number(gsap.getProperty(host, 'scale')) || 1
    const scale = (side * k) / 560
    const ptr = live.pointer()
    const rip = live.ripple()
    const tilt = live.tilt()
    gl.uniform1f(u.uT, (now - t0) / 1000)
    gl.uniform1f(u.uIntro, state.intro); gl.uniform1f(u.uGap, state.gap); gl.uniform1f(u.uRefill, state.refill)
    gl.uniform1f(u.uClear, state.clear); gl.uniform1f(u.uOut, state.out); gl.uniform1f(u.uMove, state.move)
    gl.uniform1f(u.uDim, state.dim); gl.uniform1f(u.uFade, state.fade)
    gl.uniform1f(u.uVel, Math.max(-60, Math.min(60, live.velocity())))
    gl.uniform1f(u.uDpr, dpr)
    gl.uniform1f(u.uScale, scale * dpr)
    gl.uniform1f(u.uPersp, 1600 / scale)
    gl.uniform2f(u.uCenter, (cx + (Number(gsap.getProperty(host, 'x')) || 0)) * dpr, cy * dpr)
    gl.uniform2f(u.uView, canvas.width, canvas.height)
    gl.uniform2f(u.uPtr, ptr.x, ptr.y); gl.uniform1f(u.uPtrOn, ptr.on)
    // The copy sits left of the face on wide screens and under it on narrow ones.
    if (stacked.matches) gl.uniform2f(u.uCopy, 0, 1); else gl.uniform2f(u.uCopy, -1, 0)
    gl.uniform3f(u.uRip, rip.x, rip.y, rip.age)
    gl.uniform3f(u.uTilt, (tilt.x * Math.PI) / 180, (tilt.y * Math.PI) / 180, (tilt.spin * Math.PI) / 180)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.POINTS, 0, count)
  }
  gsap.ticker.add(frame)
  // The minutes gather out of a scattered cloud into the day round the face.
  const gather = gsap.fromTo(state, { intro: 0 }, { intro: 1, duration: 2.6, ease: 'power3.out' })
  return () => {
    gather.kill()
    gsap.ticker.remove(frame)
    themeWatch.disconnect()
    resize.disconnect()
    seen.disconnect()
    gl.deleteBuffer(buf)
    gl.deleteVertexArray(vao)
    gl.deleteProgram(prog)
  }
}
}
