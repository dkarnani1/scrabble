# Audio assets

Drop the following files in this directory to enable game sounds. Each
filename corresponds to a `SoundEvent` from `src/ui/sound/sound-events.ts`.

| Filename             | When it plays                                                    |
| -------------------- | ---------------------------------------------------------------- |
| `tile-pickup.mp3`    | Picking up a rack tile (drag start or click-select)              |
| `tile-place.mp3`     | Tile lands tentatively on a board square                         |
| `tile-recall.mp3`    | Tile returns to the rack                                         |
| `rack-shuffle.mp3`   | Rack shuffle button                                              |
| `commit-success.mp3` | A submitted move is accepted by the server                       |
| `commit-invalid.mp3` | A submitted move is rejected (rule violation, invalid word, etc) |
| `opponent-move.mp3`  | Realtime: the opponent committed a move                          |
| `bingo.mp3`          | Player committed a 7-tile bonus play                             |
| `turn-start.mp3`     | Active turn flips back to the local player                       |
| `timer-warning.mp3`  | Less than 10 s remaining on the local player's turn              |
| `win.mp3`            | Game ends — local player won                                     |
| `lose.mp3`           | Game ends — local player lost                                    |
| `draw.mp3`           | Game ends — tie                                                  |

The loader silently ignores missing files (404 → no sound, no console
error). Once a file is present, the corresponding event activates.

See `src/ui/sound/sounds-source.md` for licensing requirements and
recommended length / tone per event.
