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
│  │ │ getShipDate()   │  │ addBusinessDays │  │ HOLIDAYS[]    │ │    │
│  │ │                 │  │ ()              │  │               │ │    │
│  │ └─────────────────┘  └─────────────────┘  └───────────────┘ │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Design Decisions

### 1. Dual Implementation (Cartridge + PWA-Kit Utility)

**Decision**: Implement the same logic in both SFRA cartridge and PWA-Kit utility module.

**Rationale**:
- **SFRA Compatibility**: The cartridge follows SFCC best practices and can be used with traditional SFRA storefronts
- **PWA-Kit Performance**: Client-side calculation in PWA-Kit provides instant feedback without API round-trips
- **Code Consistency**: Both implementations share identical business logic

**Trade-offs**:
- ❌ Code duplication between cartridge and utility
- ✅ No network latency for PWA-Kit calculations
- ✅ SFRA storefronts can use server-side calculations

### 2. Client-Side Calculation for PWA-Kit

**Decision**: Calculate delivery dates on the client side in PWA-Kit rather than calling an API.

**Rationale**:
- **Performance**: Instant calculation without network round-trip (~0ms vs 200-500ms)
- **Offline Support**: Could work offline if needed
- **Reduced Server Load**: No additional API calls to SFCC

**Trade-offs**:
- ❌ Logic must be duplicated on client
- ❌ Time zone handling in JavaScript can be tricky
- ✅ Better user experience with instant feedback

### 3. Mock Transit Data with ZIP Ranges

**Decision**: Use ZIP code ranges to determine transit days rather than actual carrier APIs.

**Rationale**:
- **Simplicity**: Easy to implement and understand
- **Demonstration**: Shows the concept without requiring carrier integrations
- **Predictable**: Consistent results for testing

**Production Considerations**:
- Replace with actual carrier API integration (UPS, FedEx, USPS)
- Store transit data in a database or external service
- Consider caching transit data for performance

### 4. 2 PM EST Cutoff

**Decision**: Use 2 PM EST as the order cutoff time.

**Rationale**:
- **Industry Standard**: Common cutoff time in e-commerce
- **Warehouse Operations**: Allows time for order processing before end of day
- **Configurable**: Could be made configurable via Site Preferences

### 5. Static Holiday List

**Decision**: Hardcode US federal holidays for 2024-2025.

**Rationale**:
- **Simplicity**: Easy to implement without external dependencies
- **Predictability**: Holidays are known in advance

**Production Considerations**:
- Create a custom object or site preference for holidays
- Support international holidays based on shipping destination
- Auto-update holiday lists annually

## Scalability Considerations

### Current Implementation
- Handles individual product page calculations
- No caching needed (calculations are deterministic)
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

## Future Enhancements

1. **Checkout Integration**: Show delivery dates per shipping method
2. **Order Confirmation**: Store selected delivery date on order
3. **Email Templates**: Include promised date in confirmation emails
4. **Carrier Tracking**: Link actual carrier tracking to promise
5. **Analytics**: Track promise accuracy vs actual delivery
6. **A/B Testing**: Test different display formats

## Dependencies

### SFRA
- `dw/util/Calendar` - Date handling
- `dw/system/Site` - Site configuration
- `server` module - Controller framework

### PWA-Kit
- React hooks (`useState`, `useEffect`)
- Chakra UI components
- No external date libraries (uses native `Date`)

## File Structure

```
narvar/
├── cartridges/
│   └── int_promise_delivery/
│       ├── cartridge/
│       │   ├── controllers/
│       │   │   └── PromiseDelivery.js
│       │   ├── scripts/
│       │   │   └── helpers/
│       │   │       └── promiseDeliveryHelper.js
│       │   └── int_promise_delivery.properties
│       ├── README.md
│       └── DESIGN.md
└── overrides/
    └── app/
        ├── components/
        │   └── product-view/
        │       └── index.jsx (ZIP input UI)
        ├── pages/
        │   └── product-detail/
        │       └── index.jsx (PDP override)
        └── utils/
            └── promise-delivery.js (Client-side logic)
```

## Conclusion

This implementation provides a foundation for delivery date estimation that can be extended for production use. The modular architecture allows for:

1. Easy integration with actual carrier APIs
2. Database-driven transit time configuration
3. Multi-warehouse fulfillment support
4. International shipping support

The key design principle is **separation of concerns** - business logic is isolated in reusable modules that can be consumed by different presentation layers (SFRA, PWA-Kit, mobile apps).

