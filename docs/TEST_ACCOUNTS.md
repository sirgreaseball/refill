# Test accounts and the account checklist

Email confirmation is off, so these sign up instantly. They are fake addresses on `example.com`, a domain reserved for examples, so no email is ever delivered. The password is Dhruv's choice and is **not** written here (this repo is public). Use one password for all of them.

| Who | Email | Signs up as | What they own or use |
|---|---|---|---|
| Owner 1 | `refill.owner@example.com` | I run a business | "Kesar Studio" (salon) |
| Owner 2 | `refill.clinic@example.com` | I run a business | "Banjara Physio" (clinic), to test a client with two places |
| Client 1 | `refill.client1@example.com` | I book appointments | joins both places |
| Client 2 | `refill.client2@example.com` | I book appointments | competes with client 1 for one slot |
| Front desk | none | link from Owner 1 | Owner > Team > Links > Front-desk link |
| Staff | none | link from Owner 1 | Owner > Team > Staff > Link |

Front desk and staff do not have accounts in the app yet; they use private links that the owner makes. A front-desk link is a full login for the desk, and the database refuses owner-only actions for it.

## Checklist (about 15 minutes, two browsers: a normal window and a private one)

**Owner**
1. Normal window: open the live app and choose **Create account**, entering Owner 1's details. Choose **I run a business**, then set up "Kesar Studio" with two services and two staff, and select **Open my desk**.
2. ⋯ → **Sign out**, then **Sign in** again: the same business opens. *(Account holds the business.)*
3. Owner > Team: add a staff member, edit their hours, then try to remove someone with a client ahead. The removal should be refused.
4. Owner > Team > Links: the directory switch reads **Listed**. Leave it on.

**Client, finding the place**
5. Private window: open the live app and choose **Browse places you can book**. Kesar Studio is in the list, and searching a service name finds it.
6. Create Client 1's account and choose **I book appointments**. On the client home, **Find a place** lists Kesar Studio. Tap it and join with **Yes, message me**.

**The day, across roles**
7. Normal window (owner): Front desk > **New appointment**, adding open time with no client name. Open the gap, then **Send offers**. Client 1 is in the list.
8. Private window (client): the home says **A time opened for you**. Tap it and select **Book**. The home says **You're booked**.
9. Owner: the slot shows Client 1's name in green.
10. Owner: Team > that staff member > mark them **Out**. Client home shows coral: **can't come in today**, then **Pick a new time**. Pick one, and the booking shows the new time and staff member.
11. Owner: open Client 1's appointment and choose **Record a cancellation**. Client home: **Your … was cancelled**.
12. Client: on the place, select **Stop messages**. Owner's waitlist shows messages off. Select **Yes, message me** again.

**Two places, one client (marketplace)**
13. Owner 2 (any third window, or sign out of the owner first): create "Banjara Physio" (clinic) and keep it listed.
14. Client 1: **Find a place**, search "physio", and join. The client home now lists both places with their own status.

**Two clients, one slot**
15. Client 2 joins Kesar Studio. The owner opens a gap and offers it to both. Both tap **Book** at the same moment: one gets it, and the other is told and keeps their place.

**Device places**
16. Signed out, join a place from a counter code (no account). Then sign in as Client 2: that place appears on their home. *(Device places attach on sign-in.)*

If any step shows an error or does not update within about 5 seconds, note the step number and what it said.
