import React from 'react'
import { Composition, Folder, Still } from 'remotion'
import { Main, Solo } from './Main'
import { Thumb } from './Thumb'
import { Arch, Flow, OfferLife } from './doc/Diagrams'
import { DeckBg, DeckDial, DeckIcon, DeckMark } from './doc/Deck'
import { FPS, H, W } from './theme'
import { SCENES, TOTAL } from './timeline'

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Refill" component={Main} width={W} height={H} fps={FPS} durationInFrames={Math.round(TOTAL * FPS)} defaultProps={{ music: true }} />
    <Still id="Thumb" component={Thumb} width={1280} height={720} />
    <Folder name="Doc">
      <Still id="DocArch" component={Arch} width={1920} height={1080} />
      <Still id="DocFlow" component={Flow} width={1920} height={1080} />
      <Still id="DocOffer" component={OfferLife} width={1920} height={1080} />
    </Folder>
    <Folder name="Deck">
      <Still id="DeckBg" component={DeckBg} width={1920} height={1080} defaultProps={{ tone: 'quiet' as const, light: false }} />
      <Still id="DeckBgCover" component={DeckBg} width={1920} height={1080} defaultProps={{ tone: 'cover' as const, light: false }} />
      <Still id="DeckDial" component={DeckDial} width={1400} height={1400} defaultProps={{ refilled: false, light: false }} />
      <Still id="DeckDialRefilled" component={DeckDial} width={1400} height={1400} defaultProps={{ refilled: true, light: false }} />
      <Still id="DeckMark" component={DeckMark} width={640} height={200} defaultProps={{ light: false }} />
      <Still id="DeckIcon" component={DeckIcon} width={256} height={256} defaultProps={{ kind: 'business' as const, color: '#c6f24e' }} />
    </Folder>
    <Folder name="Scenes">
      {SCENES.map((sc) => (
        <Composition key={sc.id} id={`scene-${sc.id}`} component={Solo} width={W} height={H} fps={FPS} durationInFrames={Math.round(sc.dur * FPS)} defaultProps={{ id: sc.id }} />
      ))}
    </Folder>
  </>
)
