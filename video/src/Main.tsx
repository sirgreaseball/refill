import { Audio } from '@remotion/media'
import React from 'react'
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from 'remotion'
import { Grain, Vignette } from './kit'
import { C } from './theme'
import { SCENES, Scene } from './timeline'
import { Brief } from './scenes/Brief'
import { Pain } from './scenes/Pain'
import { Solution } from './scenes/Solution'
import { Desk } from './scenes/Desk'
import { Client } from './scenes/Client'
import { Race } from './scenes/Race'
import { Staff } from './scenes/Staff'
import { Owner } from './scenes/Owner'
import { Features } from './scenes/Features'
import { Usp } from './scenes/Usp'
import { Proof } from './scenes/Proof'
import { Business } from './scenes/Business'
import { End } from './scenes/End'

export const SCENE_VIEWS: Record<string, React.FC> = { brief: Brief, pain: Pain, solution: Solution, desk: Desk, client: Client, race: Race, staff: Staff, owner: Owner, features: Features, usp: Usp, proof: Proof, business: Business, end: End }

function Place({ sc }: { sc: Scene }) {
  const { fps } = useVideoConfig()
  const View = SCENE_VIEWS[sc.id]
  return (
    <Sequence from={Math.round(sc.from * fps)} durationInFrames={Math.round(sc.dur * fps)} name={sc.id} premountFor={fps}>
      <View />
    </Sequence>
  )
}

export function Main({ music = true }: { music?: boolean }) {
  return (
    <AbsoluteFill style={{ background: C.canvas }}>
      {SCENES.map((sc) => <Place key={sc.id} sc={sc} />)}
      <Vignette />
      <Grain />
      {music && <Audio src={staticFile('music/bed.wav')} volume={1} />}
    </AbsoluteFill>
  )
}

// One scene alone, on the same canvas, for working on it in Studio.
export function Solo({ id }: { id: string }) {
  const View = SCENE_VIEWS[id]
  return (
    <AbsoluteFill style={{ background: C.canvas }}>
      <View />
      <Vignette />
      <Grain />
    </AbsoluteFill>
  )
}
