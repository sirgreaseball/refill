# Known Limits

This document details what **Refill** does not do in its current implementation, why each omission is acceptable and appropriate for this hackathon prototype (Fynd × NMIMS Hyderabad, Case C29: *Appointment Recovery Desk*), and what a production pilot in an operating salon would require.

---

## 1. Authentication & Security: Production AWS Cognito with Frictionless Demo Mode

### Current State in the Application
- **Production Accounts & AWS Cognito Integration:** Refill is now equipped with production user authentication powered by an AWS Cognito User Pool (`us-east-1_GXcemXtkQ`) and client (`6idmbpa85onbohp4gr3qc06v1e`). 
- **Custom Gmail OTP Verification:** Account registration enforces real-time 6-digit email OTP verification. The OTP code is embedded directly in the email subject title and highlighted in bold within the custom message body. Unconfirmed accounts cannot bypass this check (`ConfirmSignUp` required).
- **Role-Based Isolation:** The system distinguishes between **Owner**, **Front Desk**, **Staff**, and **Client** roles with separate keys, session tokens, and database RPC authorization checks (`require_owner`, `require_desk`, `require_staff`).
- **Preserved Demo Mode:** Alongside real account authentication, the app retains a one-click **"Try the live demo"** mode so hackathon judges and evaluators can explore a simulated salon day without mandatory credential provisioning.

### What a commercial scale pilot would add
- Biometric WebAuthn / Passkey support on mobile devices.
- Direct phone-based WhatsApp OTP gateway for salon staff in India alongside Cognito email verification.
- SSO (Single Sign-On) integration for enterprise multi-outlet salon chains.


---

## 2. Simulated Messaging via Mobile Web View (No Live SMS or WhatsApp Gateway)

### What the app does NOT do
The app does not dispatch physical SMS text messages or WhatsApp messages over cellular carrier networks. When offers are dispatched, they are accessed via unique URLs (or desk QR codes) rendered as mobile web pages (`/#/offer/<offer_uuid>`).

### Why it is acceptable for this prototype
- **Deterministic judge experience:** Evaluators can simulate customer interactions on their own mobile devices by scanning a QR code on the desk or opening offer links, without having to surrender personal phone numbers.
- **Regulatory and compliance safety:** Carrier messaging in India requires DLT (Distributed Ledger Technology) registration, approved SMS headers, and registered consent templates under TRAI regulations. Real dispatch would introduce third-party deliverability delays outside hackathon control.
- **No API key leakage or cost burn:** Running a live SMS/WhatsApp gateway on a public demo repository risks quota exhaustion or financial runaway.

### What a real pilot would need
- Integration with an official WhatsApp Business Solution Provider (BSP) such as Gupshup, Twilio, or Meta Cloud API.
- Pre-approved DLT message templates for appointment notifications and recovery offers.
- Inbound webhook processing to handle customer replies: parsing `YES` (book), `NO` (decline), and `STOP` (consent withdrawal) directly from WhatsApp/SMS.
- Message status telemetry (sent, delivered, read, failed) reflected in the front-desk live UI.

---

## 3. Client Polling (1.2s Interval) Instead of Live WebSocket Subscriptions

### What the app does NOT do
The front desk does not maintain a persistent WebSocket connection (e.g. Supabase Realtime or Socket.io) for server-to-client push events. Instead, `src/api.ts` queries the `get_state` RPC function every 1,200 milliseconds.

### Why it is acceptable for this prototype
- **Network resilience:** WebSockets frequently drop or encounter handshake blockage on restricted conference Wi-Fi networks, hotel firewalls, and cellular data connections. Polling over standard HTTPS GET/POST requests never drops the connection.
- **Simplicity and state reconciliation:** Polling the entire workspace state ensures that UI drift or out-of-order packet delivery never corrupts the appointment book.
- **Sub-second perceived latency:** A 1.2-second polling frequency feels responsive and near-instantaneous during live demonstration of two competing devices.

### What a real pilot would need
- Postgres Changes / Supabase Realtime channel subscription using WebSockets to push state changes on `slots`, `offers`, and `bookings` instantly.
- Connection fallback to exponential backoff long-polling if WebSockets are interrupted.
- Client-side delta patching to minimize bandwidth and database CPU utilization across hundreds of active salon terminals.

---

## 4. Synthetic Data Validating Rules Rather than Commercial Demand

### What the app does NOT do
Refill runs on synthetic datasets (`data/salon/*.csv` representing Kesar Salon, Jubilee Hills) and test scenarios (`data/fixture/C29.fixture.json`, `tests/core-scenarios.json`). It does not connect to a live salon management system or historical commercial customer records.

### Why it is acceptable for this prototype
- **Data privacy compliance:** Ensures strict compliance with India's Digital Personal Data Protection Act (DPDPA 2023) and GDPR. No real individuals, contact details, or financial histories are exposed.
- **Rigorous edge-case coverage:** Synthetic data allows systematic crafting of critical edge conditions: staff skill mismatches, boundary duration mismatches, zero-consent states, and simultaneous arrival times.
- **Case C29 specification:** The hackathon rubric tests algorithmic correctness against the organiser's fixture and verified rule sets, which synthetic data proves completely.

### What a real pilot would need
- Connectors to standard salon POS / booking software (e.g., Zenoti, Fresha, Vagaro, Petpooja, Mindbody).
- Bi-directional synchronization: pulling real-time cancellations from the POS and writing confirmed recovery bookings back into the primary calendar.
- Analytics instrumentation measuring actual commercial conversion rates, revenue recovered, and waitlist opt-in velocity.

---

## 5. Single-Day Scheduling Horizon (24-Hour Calendar)

### What the app does NOT do
The app models today's appointment schedule across a single 24-hour day (minutes 0 to 1,439). It does not schedule multi-day appointments, future-dated slot reservations, or multi-week waitlist queues.

### Why it is acceptable for this prototype
- **Core problem alignment:** Case C29 focuses explicitly on the "Appointment Recovery Desk" — salvaging same-day cancellations where notice is short (< 2 hours) and empty chairs represent immediate revenue loss.
- **Clarity of state:** A single-day model keeps the demo timeline focused and allows evaluators to manipulate the demo clock to inspect past, normal, and late cancellations cleanly.

### What a real pilot would need
- Multi-day calendar view supporting cancellation recovery across tomorrow, the upcoming weekend, or future booking windows.
- Waitlist date-range preferences (e.g., "customer available any Tuesday afternoon this month").
- Automatic schedule generation linked to staff shift rosters and operating holidays.

---

## 6. Single-Service Appointments (No Composite Service Bundles)

### What the app does NOT do
Each appointment slot and waitlist entry corresponds to a single service with a single skill requirement (e.g., hair, nails, facial). It does not model multi-step composite appointments (e.g., a haircut followed by coloring and a manicure) that require sequential slots and multiple stylists.

### Why it is acceptable for this prototype
- **Precise rule verification:** Focuses directly on the three core hackathon rules: duration fitting (`minutes <= slot.minutes`), skill match (`skill == slot.skill`), and explicit consent.
- **Avoids combinatorial scheduling complexity:** Multi-service appointment matching is an NP-hard scheduling problem that distracts from the core recovery workflow and race condition handling.

### What a real pilot would need
- Composite service modeling with dependency chaining (Service A followed by Service B).
- Multi-resource locking: reserving both the specialist and specialized equipment/stations (e.g., shampoo basin, pedicure chair).
- Configurable turnaround buffers between appointments for sanitation and station preparation.

---

## 7. Fixed 15-Minute Offer Expiry Window

### What the app does NOT do
Offer expiry is governed by a static 15-minute hold window (or until slot start time, whichever comes first). The app does not calculate dynamic travel times, geofenced proximity, or custom hold times per customer.

### Why it is acceptable for this prototype
- **Predictable demonstration flow:** 15 minutes is standard salon industry practice for holding same-day standby slots without leaving chairs idle.
- **Clear test assertions:** Fixed windows enable deterministic assertions in automated scenario tests and live demo transitions.

### What a real pilot would need
- Distance-aware expiry: customers located 5 minutes away get a 10-minute hold; customers further away receive adjusted windows.
- Customer response time learning: adapting offer windows based on historical customer responsiveness.
- Multi-tier waterfall outreach: offering slots to top-priority customers for 5 minutes before broadcasting to the broader waitlist.

---

## 8. Workspace Lifecycle & History Architecture
 
### Current State in the Application
- **Demo Workspaces:** Ephemeral demo workspaces are pruned after 3 days to preserve database hygiene and prevent storage bloat from hundreds of evaluation runs.
- **Live Business Workspaces:** For registered salon accounts, each day's appointment book is archived at midnight into the persistent `History` table (`get_history` RPC). The Owner can review every past date, total turnover, refilled appointment counts, and individual client service details on `#/owner/history`.
 
### What a commercial scale pilot would add
- Exportable monthly GST accounting reports and CSV/PDF financial summaries.
- Multi-year database partitioning for high-volume salon chains.
- Dedicated compliance archive preserving customer DPDP consent records for statutory audit trails.


---

## 9. No Payment Processing or Cancellation Fee Enforcement

### What the app does NOT do
The app does not collect customer credit card details, initiate UPI payment requests, or automatically charge cancellation penalties for late cancellations.

### Why it is acceptable for this prototype
- **Operational focus:** Salon appointments in Indian metropolitan markets (like the Jubilee Hills demo salon) are predominantly settled in-salon via UPI/card upon service completion.
- **Reduced friction:** Eliminates payment gateway onboarding requirements (Razorpay/Stripe) that would block judges from completing test bookings.

### What a real pilot would need
- Razorpay / UPI intent integration for collecting booking deposits or pre-authorizations on waitlist acceptance.
- Automated refund or deposit rollover workflows when cancellations meet salon policy guidelines.
