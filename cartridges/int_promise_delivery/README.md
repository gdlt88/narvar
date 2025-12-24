# int_promise_delivery - Promise Delivery Date Cartridge

A Salesforce Commerce Cloud (SFCC) integration cartridge that provides delivery date estimation functionality for storefronts.

## Overview

This cartridge calculates estimated delivery dates based on:
- **Ship Date**: Today if before 2 PM EST cutoff, otherwise next business day
- **Transit Days**: Based on destination ZIP code range from origin (NYC - 10001)
- **Business Days**: Excludes weekends and US federal holidays

## Naming Convention

The `int_` prefix indicates this is an **Integration** cartridge - a module that integrates with external systems or provides reusable functionality that can be shared across multiple storefronts and projects.

## Folder Structure

```
int_promise_delivery/
├── cartridge/
│   └── int_promise_delivery.properties    # Cartridge properties
├── controllers/
│   └── PromiseDelivery.js                # SFRA controller endpoints
├── helpers/
│   └── promiseDeliveryHelper.js          # Business logic helper
├── README.md                             # This file
└── DESIGN.md                             # Architecture & design decisions
```

## Installation

### SFRA Installation

1. Copy the `int_promise_delivery` folder to your `cartridges` directory
2. Add `int_promise_delivery` to your cartridge path in Business Manager:
   - Go to **Administration > Sites > Manage Sites > [Your Site] > Settings**
   - Add `int_promise_delivery` to the cartridge path (before `app_storefront_base`)

### PWA-Kit Installation

The PWA-Kit uses a mirrored utility module located at:
```
overrides/app/utils/promise-delivery.js
```

This module contains the same business logic as the SFRA cartridge helper.

## Usage

### SFRA Controller Endpoints

#### Get Single Estimate
```
GET /PromiseDelivery-GetEstimate?zipCode=90210&shippingMethodId=standard
```

**Response:**
```json
{
  "success": true,
  "zipCode": "90210",
  "shippingMethodId": "standard",
  "transitDays": 5,
  "deliveryDate": "January 20th",
  "deliveryDateFull": "Monday, January 20th",
  "displayMessage": "Get it by January 20th"
}
```

#### Get All Shipping Method Estimates
```
GET /PromiseDelivery-GetAllEstimates?zipCode=90210
```

**Response:**
```json
{
  "success": true,
  "zipCode": "90210",
  "shippingMethods": [
    {
      "shippingMethodId": "standard",
      "shippingMethodName": "Standard Shipping",
      "price": 5.99,
      "transitDays": 5,
      "deliveryDate": "January 20th",
      "displayMessage": "Get it by January 20th"
    },
    {
      "shippingMethodId": "express",
      "shippingMethodName": "Express Shipping",
      "price": 12.99,
      "transitDays": 2,
      "deliveryDate": "January 17th",
      "displayMessage": "Get it by January 17th"
    },
    {
      "shippingMethodId": "overnight",
      "shippingMethodName": "Overnight",
      "price": 24.99,
      "transitDays": 1,
      "deliveryDate": "January 15th",
      "displayMessage": "Get it by January 15th"
    }
  ]
}
```

### SFRA Helper Module

```javascript
var promiseDeliveryHelper = require('*/cartridge/scripts/helpers/promiseDeliveryHelper');

// Calculate delivery date
var result = promiseDeliveryHelper.calculateDeliveryDate('90210');
console.log(result.displayMessage); // "Get it by January 20th"

// Get estimates for all shipping methods
var estimates = promiseDeliveryHelper.getDeliveryEstimatesForAllMethods('90210');
```

### PWA-Kit Utility Module

```javascript
import { calculateDeliveryDate, getDeliveryEstimatesForAllMethods } from '../../utils/promise-delivery';

// Calculate delivery date
const result = calculateDeliveryDate('90210');
console.log(result.displayMessage); // "Get it by January 20th"

// Get estimates for all shipping methods
const estimates = getDeliveryEstimatesForAllMethods('90210');
```

## Transit Time Rules

| Destination ZIP Range | Transit Days |
|-----------------------|--------------|
| 00000 - 19999         | 1 day        |
| 20000 - 39999         | 2 days       |
| 40000 - 59999         | 3 days       |
| 60000 - 79999         | 4 days       |
| 80000 - 99999         | 5 days       |

## Shipping Method Modifiers

| Shipping Method | Transit Time Override |
|-----------------|----------------------|
| Overnight       | 1 day (always)       |
| Express/2-Day   | Max 2 days           |
| Standard        | Uses base transit    |

## Business Rules

1. **Cutoff Time**: 2 PM EST
   - Orders placed before 2 PM EST ship the same day (if business day)
   - Orders placed after 2 PM EST ship the next business day

2. **Business Days**: Monday - Friday, excluding US federal holidays

3. **Dynamic Holiday Calculation**: Holidays are calculated automatically for any year using these rules:
   - **New Year's Day** - January 1 (observed if weekend)
   - **MLK Day** - 3rd Monday of January
   - **Presidents Day** - 3rd Monday of February
   - **Memorial Day** - Last Monday of May
   - **Independence Day** - July 4 (observed if weekend)
   - **Labor Day** - 1st Monday of September
   - **Columbus Day** - 2nd Monday of October
   - **Veterans Day** - November 11 (observed if weekend)
   - **Thanksgiving** - 4th Thursday of November
   - **Christmas** - December 25 (observed if weekend)

   *Weekend observance: Saturday holidays observed on Friday, Sunday holidays observed on Monday*

## Features

### Product Detail Page (PDP)
- ZIP code input for delivery date estimation
- Automatic calculation on "Check" button click
- ZIP code persisted in localStorage for return visits
- Delivery date auto-calculated when ZIP is loaded from storage
- Shows "with Ground shipping" label for clarity

### Checkout (Shipping Step)
- Delivery dates displayed per shipping method (Ground, Express, Overnight)
- Dates calculated based on shipping address ZIP code
- Selected delivery date stored in localStorage for order reference

### ZIP Code Persistence
- ZIP codes entered on PDP are saved to `localStorage`
- On return visits, the saved ZIP is loaded and delivery date is auto-calculated
- Key: `promiseDeliveryZipCode`

## Testing

### Unit Tests

Unit tests are located in the centralized `test/` folder at the project root.

```bash
# From project root, install dependencies (if not already done)
npm install

# Run all unit tests
npm run test:unit

# Run tests for this cartridge
npm run test:cartridge -- int_promise_delivery

# Run with watch mode
npm run test:cartridge -- int_promise_delivery --watch

# Run with coverage report
npm run test:cartridge -- int_promise_delivery --coverage

# See available cartridges
npm run test:cartridge -- --help
```

See `test/README.md` for detailed testing documentation.

#### Test Coverage

The unit tests cover:

- **Helper Functions**
  - `isValidZipCode()` - ZIP code validation
  - `getTransitDays()` - Transit day calculation by ZIP range
  - `getTransitDaysForShippingMethod()` - Shipping method modifiers
  - `calculateDeliveryDate()` - Full delivery date calculation
  - `getDeliveryEstimatesForAllMethods()` - All shipping methods
  - Configuration constants (cutoff time, origin ZIP)

- **Controller Endpoints**
  - `GetEstimate` - Single method estimate
  - `GetAllEstimates` - All methods estimates
  - Error handling for invalid inputs
  - Response format validation

### Cartridge Deployment

Below are the commands that you can use to upload a cartridge to SFCC

```bash
# Upload a specific cartridge
npm run upload:cartridge -- int_promise_delivery

# Upload with watch mode (auto-upload on file changes)
npm run upload:cartridge -- int_promise_delivery --watch

# List available cartridges
npm run upload:cartridge -- --help
```

### Manual Testing

#### Product Detail Page
1. Navigate to any product page
2. Ensure "Ship to Address" is selected
3. Enter a 5-digit US ZIP code
4. Click "Check"
5. Verify the estimated delivery date displays correctly
6. Refresh the page - ZIP should be remembered and date recalculated

#### Checkout Page
1. Add items to cart and proceed to checkout
2. Enter a shipping address
3. On the "Shipping & Gift Options" step, verify each shipping method shows a delivery date
4. Different shipping methods should show different dates based on transit time

### Transit Time Test Cases
- `10001` (NYC) - 1 day transit
- `30301` (Atlanta) - 2 days transit
- `60601` (Chicago) - 3 days transit
- `75201` (Dallas) - 4 days transit
- `90210` (LA) - 5 days transit

## License

BSD-3-Clause


