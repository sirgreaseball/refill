# Demo salon data (synthetic)

Kesar Salon, Jubilee Hills is invented. Every name is invented. Prices are plausible mid-range Hyderabad figures, not quotes from any salon.

| File | What it holds |
|---|---|
| `staff.csv` | stylists, their skills (`hair`, `nails`, `skin`, joined with `|`), whether they are in today |
| `services.csv` | service menu: skill, minutes, price in INR |
| `schedule.csv` | today's appointments; `status` is `booked` or `free` (already cancelled) |
| `customers.csv` | the waitlist in queue order; `consent` is `true`, `false` or empty for unknown; optional free-from / free-until window |

The app builds its demo day from these files (`src/day.ts`). `npm test` fails if a schedule row or customer points at a service that does not exist.
