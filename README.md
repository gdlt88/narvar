# Narvar Challenge
The purpose of this repo is to show solve the Narvar Challenge sent by Samia Atthari on 2025-12-23.
Below is the description of the challenge

<details>
<summary>Challenge Information</summary>
## Take-Home: Promise Delivery Date Engine

Build a delivery date promise feature for SFCC (SFRA + PWA-Kit) that shows customers estimated delivery dates on PDP and Checkout.

---

### The Problem

Customers want to know **when** they'll receive their order before buying. Build a widget that displays:

```
"Get it by January 15th"
```

---

### UI Placement

#### PDP (Product Detail Page)

```
┌─────────────────────────────────────────────┐
│  Product Name                               │
│  $49.99                                     │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 📍 Enter ZIP: [90210] [Check]       │    │
│  │                                     │    │
│  │ 📦 Get it by January 15th           │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [Add to Cart]                              │
└─────────────────────────────────────────────┘
```

- ZIP input field (US 5-digit only)
- Shows promise date after ZIP entry
- Persist ZIP in session for return visits

#### Checkout (Shipping Step)

```
┌─────────────────────────────────────────────┐
│  Select Shipping Method                     │
│                                             │
│  ○ Standard Shipping - $5.99                │
│    Get it by January 20th                   │
│                                             │
│  ○ Express Shipping - $12.99                │
│    Get it by January 17th                   │
│                                             │
│  ○ Overnight - $24.99                       │
│    Get it by January 15th                   │
└─────────────────────────────────────────────┘
```

- Promise date shown per shipping method
- Updates when shipping address changes
- Selected date stored in order custom attribute: `customerSelectedDeliveryDate`

---

### Calculation Logic

```
Promise Date = Ship Date + Transit Days (business days only)
```

| Factor | Rule |
|--------|------|
| **Ship Date** | Today if before 2 PM EST cutoff, else next business day |
| **Transit Days** | Based on origin→destination ZIP (use mock data) |
| **Business Days** | Exclude weekends and holidays |

#### Example

```
Order time:     Monday 1:30 PM EST (before cutoff)
Origin ZIP:     10001 (NYC)
Destination:    90210 (LA)
Transit time:   5 business days

Ship: Monday → Deliver: Next Monday
Display: "Get it by January 20th"
```

---

### Mock Transit Data

Use ZIP ranges to determine transit days from origin `10001`:

| Destination ZIP | Transit Days |
|-----------------|--------------|
| 00000-19999 | 1 |
| 20000-39999 | 2 |
| 40000-59999 | 3 |
| 60000-79999 | 4 |
| 80000-99999 | 5 |

---

### Deliverables

1. **SFRA cartridge** (`int_promise_delivery`)
2. **PWA-Kit extension**
3. **DESIGN.md** - Architecture, decisions, trade-offs, scale considerations
4. **README.md** - Setup instructions

---

### Submission & Evaluation

- Send a GitHub link with your code
- Be prepared for a 1-hour deep dive meeting to walk through your implementation

**We'll evaluate:** Working functionality, code quality, SFCC best practices, architecture, scalability, and documentation.

---

### Notes

- **Code must be working** — we will run it
- Use AI tools freely — be prepared to discuss your AI development process
- Focus on depth over breadth
- Document any assumptions
</details>