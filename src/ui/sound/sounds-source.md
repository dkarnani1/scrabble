# Audio asset sourcing

All audio shipped under `public/sounds/` MUST be CC0 / public-domain or
licensed under terms the project is allowed to redistribute (CC-BY with
attribution recorded here is acceptable). The runtime loader degrades to
silence when a file is missing, so it is safe to commit the codebase
without any audio files — the system simply plays no sound until assets
land.

Recommended length and tone for each event:

| Event          | Filename           | Length      | Tone / character                          |
| -------------- | ------------------ | ----------- | ----------------------------------------- |
| tile-pickup    | tile-pickup.mp3    | 60–120 ms   | Soft wooden lift / quick click            |
| tile-place     | tile-place.mp3     | 80–150 ms   | Wooden tap on felt; subtle reverb         |
| tile-recall    | tile-recall.mp3    | 80–150 ms   | Reverse-tap or paper rustle               |
| rack-shuffle   | rack-shuffle.mp3   | 200–400 ms  | Wooden tiles rattling / shuffling         |
| commit-success | commit-success.mp3 | 250–500 ms  | Two-note ascending, warm, confident       |
| commit-invalid | commit-invalid.mp3 | 200–350 ms  | Soft thud or descending minor third       |
| opponent-move  | opponent-move.mp3  | 150–300 ms  | Distant, less prominent tap               |
| bingo          | bingo.mp3          | 600–900 ms  | Ascending chime; celebratory but tasteful |
| turn-start     | turn-start.mp3     | 200–400 ms  | Single warm bell / soft chime             |
| timer-warning  | timer-warning.mp3  | 400–600 ms  | Two short pulses; urgent but not panicked |
| win            | win.mp3            | 800–1500 ms | Rising fanfare; warm                      |
| lose           | lose.mp3           | 600–1000 ms | Descending; soft, dignified               |
| draw           | draw.mp3           | 500–800 ms  | Resolved minor / neutral cadence          |

Implementation notes:

- Format: prefer `.mp3` for compatibility (Howler decodes it everywhere).
  `.webm` is fine if the same filename also has a duplicate `.mp3` fallback.
- Keep sample rate ≤ 48 kHz and bitrate ≤ 128 kbps so the bundle stays light.
- Normalize loudness to roughly -16 LUFS so sounds sit consistently with the UI.
- All paths are referenced from `src/ui/sound/sound-events.ts`. To rename a
  file, update `SOUND_MAP[event].src` there.

## Suggested CC0 / freesound sources

Search terms that produce clean results on freesound.org or zapsplat:

- `wooden tile click` — tile-pickup, tile-place, tile-recall
- `wood scrabble shuffle` — rack-shuffle
- `confident UI confirm short` — commit-success
- `error bonk soft` — commit-invalid
- `bell chime celebration short` — bingo, win
- `descending sad short` — lose

Always credit and link the source in this file when adding an asset.
