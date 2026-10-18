#!/usr/bin/env bash
# Cleans every narration mp3 into a 48 kHz WAV the film uses: rumble cut, de-essed, gently
# compressed, matched to -17 LUFS. Run from video/: bash tools/voclean.sh
cd public/vo
for f in *.mp3; do
  ffmpeg -v error -y -i "$f" -af "highpass=f=80,deesser=i=0.35,equalizer=f=220:t=q:w=1.2:g=-1.5,equalizer=f=4200:t=q:w=1:g=1.2,acompressor=threshold=-21dB:ratio=2.4:attack=6:release=140:makeup=1.5,loudnorm=I=-17:TP=-2:LRA=6,aresample=48000" -ac 2 "${f%.mp3}.wav"
done
