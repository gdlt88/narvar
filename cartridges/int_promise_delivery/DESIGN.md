# Promise Delivery Date Engine - Design Document

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
├─────────────────────────────────────────────────────────────────────┤
│  PWA-Kit Storefront                │  SFRA Storefront               │
│  ┌─────────────────────────────┐   │  ┌─────────────────────────┐   │
│  │ ProductView Component       │   │  │ PDP Template (ISML)     │   │
│  │ - ZIP input                 │   │  │ - ZIP input             │   │
│  │ - Delivery date display     │   │  │ - Delivery date display │   │
│  └──────────────┬──────────────┘   │  └──────────────┬──────────┘   │
│                 │                   │                 │              │
│  ┌──────────────▼──────────────┐   │  ┌──────────────▼──────────┐   │
│  │ promise-delivery.js         │   │  │ PromiseDelivery         │   │
│  │ (Client-side utility)       │   │  │ Controller (AJAX)       │   │
│  └─────────────────────────────┘   │  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────┐
│                       BUSINESS LOGIC LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│  int_promise_delivery Cartridge                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ promiseDeliveryHelper.js                                     │    │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐ │    │
│  │ │ calculateDeli-  │  │ getTransit-     │  │ isBusinessDay │ │    │
│  │ │ veryDate()      │  │ Days()          │  │ ()            │ │    │
│  │ └─────────────────┘  └─────────────────┘  └───────────────┘ │    │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐ │    │
│  │ │ getShipDate()   │  │ addBusinessDays │  │ getHolidays-  │ │    │
│  │ │                 │  │ ()              │  │ ForYear()     │ │    │
│  │ └─────────────────┘  └─────────────────┘  └───────────────┘ │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
cartridges/
└── int_promise_delivery/            # Main cartridge folder
    ├── cartridge/                  # SFCC required folder
    │   └── int_promise_delivery.properties
    ├── controllers/                # SFRA controllers
    │   └── PromiseDelivery.js
    ├── helpers/                    # Business logic helpers
    │   └── promiseDeliveryHelper.js
    ├── README.md                   # Usage documentation
    └── DESIGN.md                   # This file
```

## Naming Convention

The cartridge follows SFCC naming conventions:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `app_` | Application-specific custom functionality | `app_storefront_custom` |
| `int_` | **Third-party integrations / Reusable modules** | `int_promise_delivery` |
| `plugin_` | Optional feature plugins | `plugin_wishlists` |
| `bm_` | Business Manager extensions | `bm_custom_reports` |

We chose `int_` because this cartridge provides **integration-style reusable business logic** that can be shared across multiple storefronts.

## Design Decisions

### 1. Dual Implementation (Cartridge + PWA-Kit Utility)

**Decision**: Implement the same logic in both SFRA cartridge and PWA-Kit utility module as per the challenge request.

**Main Comments**:
- **SFRA Compatibility**: The cartridge follows SFCC best practices and can be used with traditional SFRA storefronts
- **PWA-Kit Performance**: Client-side calculation in PWA-Kit provides instant feedback without API round-trips and for demonstration purposes
- **Code Consistency**: Both implementations share identical business logic

**Trade-offs**:
- ❌ Code duplication between cartridge and utility
- ✅ No network latency for PWA-Kit calculations
- ✅ SFRA storefronts can use server-side calculations

### 2. Mock Transit Data with ZIP Ranges

**Decision**: Use ZIP code ranges to determine transit days rather than actual carrier APIs as per challenge request

**Main Comments**:
- **Simplicity**: Easy to implement and understand
- **Demonstration**: Shows the concept without requiring carrier integrations
- **Predictable**: Consistent results for testing

**Production Considerations**:
- Replace with actual carrier API integration (UPS, FedEx, USPS)
- Store transit data in a database or external service
- Consider caching transit data for performance

### 3. 2 PM EST Cutoff

**Decision**: Use 2 PM EST as the order cutoff time as per challenge request

### 4. Dynamic Holiday Calculation

**Decision**: Dynamically calculate US federal holidays for any year using date rules.

**Main Comments**:
- **No Maintenance**: No need to manually update holiday lists each year
- **Accuracy**: Correctly handles floating holidays (e.g., 3rd Monday of January for MLK Day)
- **Weekend Observance**: Automatically handles Saturday→Friday and Sunday→Monday shifts

**Implementation**:
- Fixed holidays (Jan 1, Jul 4, Nov 11, Dec 25) use observance rules (more related to Weekend Holidays, where if a holiday falls on a weekend, the observance is often moved to the nearest weekeday).
- Floating holidays use Nth weekday calculation (e.g., 4th Thursday of November)
- Results are cached per year for performance

**Production Considerations**:
- Support international holidays based on shipping destination
- Allow custom holidays via Site Preferences or custom objects
- Consider regional/state holidays if needed

## Scalability Considerations

### Current Implementation
- Handles individual product page calculations
- No caching needed (calculations are deterministic because they follow a mathematical logic as per the challenge requirements)
- No database queries required

### Scaling to Production

1. **Carrier Integration**
   ```javascript
   // Future: Replace getTransitDays with carrier API
   async function getTransitDays(origin, destination, carrier) {
     const response = await carrierAPI.getTransitTime({
       originZip: origin,
       destinationZip: destination,
       carrier: carrier
     });
     return response.transitDays;
   }
   ```

2. **Caching Strategy**
   - Cache transit data by ZIP pair (e.g., Redis, CDN edge cache)
   - TTL: 24 hours (transit times rarely change)
   - Key pattern: `transit:${originZip}:${destZip}:${carrier}`

3. **Real-time Inventory Integration**
   - Check warehouse location with inventory
   - Calculate from nearest fulfillment center
   - Consider split shipments

4. **Personalization**
   - Store customer's ZIP code in session/profile
   - Auto-populate on return visits
   - Per-product warehouse location

## API Design

### RESTful Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/PromiseDelivery-GetEstimate` | GET | Single shipping method estimate |
| `/PromiseDelivery-GetAllEstimates` | GET | All shipping methods with estimates |

### Request/Response Format

**Request**:
```
GET /PromiseDelivery-GetEstimate?zipCode=90210&shippingMethodId=standard
```

**Response**:
```json
{
  "success": true,
  "zipCode": "90210",
  "shippingMethodId": "standard",
  "transitDays": 5,
  "deliveryDate": "January 20th",
  "displayMessage": "Get it by January 20th"
}
```

### Error Handling

| Error Code | Description |
|------------|-------------|
| `INVALID_ZIP` | Invalid or missing ZIP code |
| `CALCULATION_ERROR` | Unable to calculate date |

## Security Considerations

1. **Input Validation**: ZIP codes are validated (5-digit numeric only)
2. **No Sensitive Data**: No PII is processed or stored
3. **Rate Limiting**: Consider adding rate limiting for API endpoints
4. **CORS**: Ensure proper CORS headers for API endpoints

## Testing Strategy

### Unit Tests
- `isBusinessDay()` - Verify weekend/holiday detection
- `getTransitDays()` - Verify ZIP range mapping
- `calculateDeliveryDate()` - Verify end-to-end calculation

### Integration Tests
- Controller endpoints return valid JSON
- Error handling for invalid inputs
- Edge cases (holidays, weekends, cutoff time)

### Manual Testing
- Test various ZIP codes across regions
- Test around 2 PM EST cutoff
- Test on holidays and weekends

## Implemented Features

1. ✅ **Checkout Integration**: Delivery dates displayed per shipping method on checkout page
2. ✅ **ZIP Code Persistence**: ZIP codes saved in localStorage for return visits
3. ✅ **Dynamic Holidays**: Holidays calculated automatically for any year
4. ✅ **Shipping Method Mapping**: SFCC shipping method IDs mapped to transit calculations
5. ✅ **Ground Shipping Label**: PDP shows "with Ground shipping" for clarity

## Future Enhancements

1. **Order Custom Attribute**: Store selected delivery date in order `c_customerSelectedDeliveryDate`
2. **Email Templates**: Include promised date in confirmation emails
3. **Carrier Tracking**: Link actual carrier tracking to promise
4. **Analytics**: Track promise accuracy vs actual delivery
5. **A/B Testing**: Test different display formats

## Dependencies

### SFRA
- `dw/util/Calendar` - Date handling and holiday calculation
- `server` module - Controller framework

### PWA-Kit
- React hooks (`useState`, `useEffect`)
- Chakra UI components
- No external date libraries (uses native `Date`)

## Conclusion

This implementation provides a foundation for delivery date estimation that can be extended for production use. The modular architecture allows for:

1. Easy integration with actual carrier APIs
2. Database-driven transit time configuration
3. Multi-warehouse fulfillment support
4. International shipping support

The key design principle is **separation of concerns** - business logic is isolated in reusable modules that can be consumed by different presentation layers (SFRA, PWA-Kit, mobile apps).


