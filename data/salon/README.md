# Demo salon data (synthetic)

Kesar Salon, Jubilee Hills is invented. Every name, phone number and booking here is invented — nothing in this folder refers to a real customer or stylist. Prices are plausible mid-range Hyderabad figures, not quotes from any one salon.

| File | What it holds |
|---|---|
| `staff.csv` | stylists, their skills (`hair`, `nails`, `skin`, joined with `|`), whether they are in today |
| `services.csv` | service menu: skill, minutes, price in INR |
| `schedule.csv` | today's appointments; `status` is `booked` or `free` (already cancelled) |
| `customers.csv` | the waitlist in queue order; `consent` is `true`, `false` or empty for unknown; optional free-from / free-until window |

The app builds its demo day from these files (`src/day.ts`). `npm test` fails if a schedule row or customer points at a service that does not exist.

## Where the `price_inr` figures in `services.csv` came from

These are not real Kesar Salon prices (Kesar Salon doesn't exist) — they're mid-range figures for comparable services in Hyderabad, taken from public salon listings and price guides, used to keep the demo numbers realistic:

- **Haircut / blow-dry** — Hyderabad listings on [Fresha](https://fresha.com/lp/en/tt/women's-haircuts/in/in-hyderabad) and [Jawed Habib Gokul Plots](https://jawedhabibgokulplots.lovable.app/services) put a basic haircut around ₹500–700; [ThePricer](https://www.thepricer.org/how-much-does-a-haircut-cost/) gives a wider ₹450–2,000 city range depending on stylist tier. We used the lower-mid end.
- **Hair spa / colour (root touch-up, global colour)** — [Four Seasons Bengaluru's published spa menu](https://www.fourseasons.com/bengaluru/spa/salon-services/) lists root touch-up at ₹1,500 and global colour at ₹7,000 (premium hotel spa, another city); a Hyderabad-based writer's guide ([Shilpa Ahuja](https://shilpaahuja.com/hair-coloring-costs-salon-india)) puts root touch-up at ₹1,500–3,000 and global colour at ₹2,000–4,000 for neighbourhood-to-premium salons. We used figures inside that overlap.
- **Manicure / gel polish** — [Jawed Habib Gokul Plots](https://jawedhabibgokulplots.lovable.app/services) lists a classic manicure at ₹700 and gel polish at ₹1,200; a general India nail-price guide gives ₹400–1,200 for gel manicures. We kept close to the Hyderabad listing.
- **Facials (clean-up, Hydra facial)** — Hyderabad-specific numbers were hard to pin down; [Clinicspots' Hyderabad table](https://www.clinicspots.com/cost/hyperfacial/india/hyderabad) suggests Hydra facials toward the lower end of the national range compared to e.g. Mumbai/Pune. We used a mid-range estimate rather than any single quoted figure, since sources disagreed.

None of these are live quotes — treat `price_inr` as "realistic for Hyderabad," not "verified today." If the owner wants exact figures, they should get them from an actual Hyderabad salon's current price list.
