# 🥛 Natural Milk Dairy — Delivery & Customer Credit Management App

> **Natural • Pure • Healthy**  
> Complete MERN Stack Application for Daily Milk & Curd Home Delivery, Route Tracking, and Automated Customer Credit Ledger Management (Physical Notebook Replacement).

---

## 🎨 Visual Identity & Color Palette

Built using the exact color palette and motifs from the official **Natural Milk Dairy** logo:

| Color Role | Hex Code | Purpose & Aesthetic |
|---|---|---|
| **Lush Meadow Green** | `#0D5C3A` / `#16945A` | Brand signature, active buttons, headers, delivered status |
| **Deep Forest Green** | `#083B25` | Deep contrasts, brand badges, strong borders |
| **Royal Dairy Blue** | `#0C2340` / `#16467A` | Typography, primary navy cards, navigation headers |
| **Butter Gold Accent** | `#F5A623` / `#D98A0D` | Highlights, sunshine accent, action buttons, warnings |
| **Pure Cream White** | `#FFFFFF` / `#F8FAF8` | Card backgrounds, splash ivory, modern clean layout |
| **Balance Indicators** | 🔴 `#DC2626` / 🟢 `#16A34A` / 🔵 `#2563EB` | Pending credit, cleared balances, advance payments |

---

## 🚀 Key Features Implemented (Matching the PRD)

### 1. Dairy Owner / Admin Portal
- **Operational Dashboard (`PRD §22`)**: Live counters for total customers, today's deliveries (completed, pending, not delivered), today's sales (₹), credit added (₹), payments collected (₹), and total outstanding balance across all customers.
- **Today's Delivery Dispatch (`PRD §7, §8, §9`)**: Master operational view with date picker, filters by status and delivery boy, fast Delivered confirmation (actual milk/curd quantities & cash/UPI/credit selector), and Not Delivered handler with dispute-free reasons.
- **Customer Directory & Schedules (`PRD §4, §5`)**: Add/edit customers, address, landmarks, GPS coordinates, assigned delivery partner, payment terms (credit/prepaid/COD), and frequency:
  - *Daily Delivery*
  - *Alternate-Day Delivery* (automatically calculated)
  - *Selected Days* (Mon/Wed/Fri, etc.)
- **Vacation Pause Delivery (`PRD §17`)**: Customers going on vacation are paused between `pauseFrom` and `pauseUntil`. The system automatically removes them from delivery boy routes during this period and resumes automatically.
- **Temporary Quantity Override (`PRD §18`)**: Temporary extra milk/curd for a specific date, reverting automatically the following day.
- **Customer Ledger (`PRD §10, §14, §15, §16`)**: Complete replacement for the paper notebook:
  - Chronological transaction history: Milk & Curd delivered, prices, dates, times, delivery boys, and payments.
  - Automatic running balance calculation: `Outstanding = Total Credit Sales - Total Payments`.
  - Prominent balance badge: 🔴 **₹1,250 Pending** / 🟢 **No Outstanding** / 🔵 **₹500 Advance**.
  - 1-Click **WhatsApp Payment Reminder** with pre-filled greeting and balance.
  - **Monthly Billing Statement** (total deliveries, litres, kg, gross bill, payments, balance) with printable formatting.
- **Pending Credit Report (`PRD §24, §25`)**: Sorted by highest outstanding, oldest pending, or name, with one-touch WhatsApp reminder buttons.
- **Product & Price Management (`PRD §6`)**: Supports Milk (500ml, 1L, 2L) and Curd (500g, 1kg). **Rule 7 Enforced**: Price changes only apply to future deliveries; historical deliveries retain their original price.
- **Delivery Boy Performance & Reconciliation (`PRD §26, §27, §28`)**: Daily route metrics and end-of-day cash reconciliation modal.
- **Audit Logs (`PRD §33`)**: Immutable log of every delivery completed, payment recorded, customer paused, or price modified.

---

### 2. Delivery Boy Mobile App (`PRD §7, §9, §34, §41`)
- **2–3 Tap Fast Early-Morning UX**: Designed specifically for 5:30 AM deliveries with big tap targets and zero typing.
- **`[CALL]` & `[MAP]` Integration**: Quick one-tap phone call and Google Maps navigation to customer address/landmark.
- **`[✓ DELIVERED]` Quick Flow**: Pre-filled planned milk & curd quantities, 1-tap payment mode selection (Credit / Cash / UPI), and 1-tap confirmation.
- **`[✕ NOT DONE]` Fast Reasons**: Customer Not Home, Customer Cancelled, Requested Pause, Product Unavailable (Rule 2: No charge applied).
- **Offline Mode (`PRD §34`)**: If mobile internet drops, deliveries and payments are saved locally on the device with an offline indicator and automatically synced when connection returns.
- **End-of-Day Cash Collection Summary**: Instant breakdown of Cash vs. UPI collected for handing over to the dairy owner.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Lucide Icons, Pure CSS Design System tokens (responsive desktop & mobile layouts)
- **Backend**: Node.js, Express.js REST API, Morgan logging, CORS
- **Database / Data Layer**:
  - **MongoDB Atlas / Mongoose**: Cloud database storing all live collections (Users, Products, Delivery Partners, Customers, Deliveries, Payments, and Audit Logs).
  - **Cloudinary**: Cloud image asset storage for product photography.

---

## ⚡ Quick Start Instructions

### 1. Install Dependencies
Run in the root folder:
```bash
npm run install:all
```
*(Or install in `server` and `client` individually: `cd server && npm install`, `cd ../client && npm install`)*

### 2. Start Both Backend & Frontend
In one terminal:
```bash
npm run server
```
*(Starts Express API on http://localhost:5000)*

In a second terminal:
```bash
npm run client
```
*(Starts Vite frontend on http://localhost:3000)*

Open **http://localhost:3000** in your browser!

---

## 👥 Demo Roles & Quick Switcher

You can test both roles using the top-right role switcher dropdown in the navbar or via the login page:

1. **Dairy Owner / Admin**:
   - Mobile: `9876543210`
   - Password: `admin`
   - Access: Full control, dashboard, customers, pricing, audit trail, cash reconciliation.

2. **Delivery Boy (Rahul Sharma — Andheri West)**:
   - Mobile: `9811122233`
   - Password: `123`
   - Access: Today's morning route, fast 2-tap delivery, call/map, offline storage, daily collection summary.

3. **Delivery Boy (Sunil Verma — Andheri East)**:
   - Mobile: `9822233344`
   - Password: `123`
