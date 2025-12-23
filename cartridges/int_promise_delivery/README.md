# int_promise_delivery - Promise Delivery Date Cartridge

A Salesforce Commerce Cloud (SFCC) cartridge that provides delivery date estimation functionality for storefronts.

## Overview

This cartridge calculates estimated delivery dates based on:
- **Ship Date**: Today if before 2 PM EST cutoff, otherwise next business day
- **Transit Days**: Based on destination ZIP code range from origin (NYC - 10001)
- **Business Days**: Excludes weekends and US federal holidays

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

3. **Holidays Excluded** (2024-2025):
   - New Year's Day
   - MLK Day
   - Presidents Day
   - Memorial Day
   - Independence Day
   - Labor Day
   - Columbus Day
   - Veterans Day
   - Thanksgiving
   - Christmas

## File Structure

```
int_promise_delivery/
├── cartridge/
│   ├── int_promise_delivery.properties
│   ├── controllers/
│   │   └── PromiseDelivery.js
│   └── scripts/
│       └── helpers/
│           └── promiseDeliveryHelper.js
└── README.md
```

## Testing

Navigate to any product page and:
1. Ensure "Ship to Address" is selected
2. Enter a 5-digit US ZIP code
3. Click "Check"
4. Verify the estimated delivery date displays correctly

Test with different ZIP codes to verify transit time calculations:
- `10001` (NYC) - 1 day transit
- `30301` (Atlanta) - 2 days transit
- `60601` (Chicago) - 3 days transit
- `75201` (Dallas) - 4 days transit
- `90210` (LA) - 5 days transit

## License

BSD-3-Clause

