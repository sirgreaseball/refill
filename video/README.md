# Refill: the film

A narrated motion-graphics walkthrough of Refill (case C29), built in Remotion inside the app's chronograph design language.

## Pipeline

```bash
npm i
node tools/vo.mjs          # narration: script.json -> public/vo/*.mp3 + word timings (ElevenLabs, key in .env)
python tools/sfx.py        # 29 synthesised sound effects -> public/sfx
python tools/music.py      # ambient bed in D, ducked under the voice -> public/music/bed.wav
npx remotion studio        # preview; every scene is also its own composition under "Scenes"
npx remotion render Refill out/refill-60.mp4 --crf=16 --audio-bitrate=320k
node tools/master.mjs out/refill-60.mp4 out/Refill.mp4   # -14 LUFS, -1.5 dBTP
```

The generated audio (`public/vo`, `public/sfx`, `public/music`) is not in git; run the three tools above to make it. Re-voicing costs ElevenLabs credits (about 1,700 for a full pass).

After `vo.mjs`, run `bash tools/voclean.sh` to turn the lines into cleaned 48 kHz WAVs (high-pass, de-ess, gentle compression, -17 LUFS).

## How timing works

The voice drives everything. `src/data/scenes.json` lists each scene's lines with lead-in, pauses and tail; `src/timeline.ts` turns that and the word timings into scene start times. Inside a scene, `at(sc, '09', 'cancels')` is the moment a word is spoken, so animation and sound land on the narration. Change a line and the film re-times itself.

## Files

- `src/scenes/*.tsx`: one file per scene (brief, pain, solution, desk, client, race, staff, owner, features, usp, proof, business, end)
- `src/kit.tsx`: motion vocabulary (easing, reveals, word masks, grain, scene dissolves, SFX and voice placement)
- `src/Dial.tsx`: the Day Dial, frame-driven; `src/ui.tsx`: mark, phone, persona label, taps, buttons
- `tools/stills.mjs`: review stills, for example `node tools/stills.mjs out/stills desk@0.3,0.7`
- `tools/deckart.mjs`: the final deck's art, dark and light (canvas, Day Dial, mark, persona icons from `src/doc/Deck.tsx`): `node tools/deckart.mjs <outDir>`, then copy into `docs/team/source/deck/art`
