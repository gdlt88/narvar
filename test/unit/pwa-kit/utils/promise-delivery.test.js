'use strict';

/**
 * Unit Tests for PWA-Kit Promise Delivery Utility
 * 
 * These tests verify the client-side delivery date calculation logic.
 */

var assert = require('chai').assert;

// Import the PWA-Kit utility directly (no mocking needed as it uses pure JS Date)
var promiseDelivery = require('../../../../overrides/app/utils/promise-delivery');

describe('PWA-Kit Promise Delivery Utility', function() {
    
    describe('getTransitDays', function() {
        
        it('should return 1 day for ZIP codes 00000-19999', function() {
            assert.equal(promiseDelivery.getTransitDays('00000'), 1);
            assert.equal(promiseDelivery.getTransitDays('10001'), 1);
            assert.equal(promiseDelivery.getTransitDays('19999'), 1);
        });
        
        it('should return 2 days for ZIP codes 20000-39999', function() {
            assert.equal(promiseDelivery.getTransitDays('20000'), 2);
            assert.equal(promiseDelivery.getTransitDays('30301'), 2);
            assert.equal(promiseDelivery.getTransitDays('39999'), 2);
        });
        
        it('should return 3 days for ZIP codes 40000-59999', function() {
            assert.equal(promiseDelivery.getTransitDays('40000'), 3);
            assert.equal(promiseDelivery.getTransitDays('50000'), 3);
            assert.equal(promiseDelivery.getTransitDays('59999'), 3);
        });
        
        it('should return 4 days for ZIP codes 60000-79999', function() {
            assert.equal(promiseDelivery.getTransitDays('60000'), 4);
            assert.equal(promiseDelivery.getTransitDays('60601'), 4);
            assert.equal(promiseDelivery.getTransitDays('79999'), 4);
        });
        
        it('should return 5 days for ZIP codes 80000-99999', function() {
            assert.equal(promiseDelivery.getTransitDays('80000'), 5);
            assert.equal(promiseDelivery.getTransitDays('90210'), 5);
            assert.equal(promiseDelivery.getTransitDays('99999'), 5);
        });
        
        it('should return 5 days for invalid ZIP codes', function() {
            assert.equal(promiseDelivery.getTransitDays('invalid'), 5);
            assert.equal(promiseDelivery.getTransitDays(''), 5);
        });
    });
    
    describe('getTransitDaysForMethod', function() {
        
        it('should return 1 day for overnight shipping regardless of ZIP', function() {
            assert.equal(promiseDelivery.getTransitDaysForMethod('10001', 'overnight'), 1);
            assert.equal(promiseDelivery.getTransitDaysForMethod('90210', 'overnight'), 1);
        });
        
        it('should return max 2 days for express shipping', function() {
            // For close ZIPs (1 day base), express should be 1 day
            assert.equal(promiseDelivery.getTransitDaysForMethod('10001', 'express'), 1);
            
            // For far ZIPs (5 day base), express should be capped at 2 days
            assert.equal(promiseDelivery.getTransitDaysForMethod('90210', 'express'), 2);
        });
        
        it('should return base transit days for standard shipping', function() {
            assert.equal(promiseDelivery.getTransitDaysForMethod('10001', 'standard'), 1);
            assert.equal(promiseDelivery.getTransitDaysForMethod('30301', 'standard'), 2);
            assert.equal(promiseDelivery.getTransitDaysForMethod('50000', 'standard'), 3);
            assert.equal(promiseDelivery.getTransitDaysForMethod('60601', 'standard'), 4);
            assert.equal(promiseDelivery.getTransitDaysForMethod('90210', 'standard'), 5);
        });
        
        it('should default to standard shipping for unknown methods', function() {
            assert.equal(promiseDelivery.getTransitDaysForMethod('90210', 'unknown'), 5);
            assert.equal(promiseDelivery.getTransitDaysForMethod('90210', null), 5);
        });
    });
    
    describe('calculateDeliveryDate', function() {
        
        it('should return an object with required properties', function() {
            var result = promiseDelivery.calculateDeliveryDate('90210');
            
            assert.isObject(result);
            assert.property(result, 'deliveryDate');
            assert.property(result, 'shipDate');
            assert.property(result, 'transitDays');
            assert.property(result, 'formattedDate');
        });
        
        it('should include transit days in result', function() {
            var result = promiseDelivery.calculateDeliveryDate('90210', 'standard');
            assert.equal(result.transitDays, 5);
            
            result = promiseDelivery.calculateDeliveryDate('10001', 'standard');
            assert.equal(result.transitDays, 1);
        });
        
        it('should format date with ordinal suffix', function() {
            var result = promiseDelivery.calculateDeliveryDate('90210');
            
            // formattedDate should be like "January 20th"
            assert.match(result.formattedDate, /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}(st|nd|rd|th)$/);
        });
    });
    
    describe('isBusinessDay', function() {
        
        it('should return false for Saturday', function() {
            // Create a known Saturday (e.g., Dec 28, 2024)
            var saturday = new Date(2024, 11, 28);
            assert.isFalse(promiseDelivery.isBusinessDay(saturday));
        });
        
        it('should return false for Sunday', function() {
            // Create a known Sunday (e.g., Dec 29, 2024)
            var sunday = new Date(2024, 11, 29);
            assert.isFalse(promiseDelivery.isBusinessDay(sunday));
        });
        
        it('should return true for Monday (non-holiday)', function() {
            // Create a known Monday that's not a holiday (e.g., Dec 30, 2024)
            var monday = new Date(2024, 11, 30);
            assert.isTrue(promiseDelivery.isBusinessDay(monday));
        });
        
        it('should return false for Christmas Day', function() {
            // Christmas 2024 is on Wednesday
            var christmas = new Date(2024, 11, 25);
            assert.isFalse(promiseDelivery.isBusinessDay(christmas));
        });
        
        it('should return false for New Year\'s Day', function() {
            var newYears = new Date(2025, 0, 1);
            assert.isFalse(promiseDelivery.isBusinessDay(newYears));
        });
        
        it('should return false for July 4th', function() {
            var july4th = new Date(2025, 6, 4);
            assert.isFalse(promiseDelivery.isBusinessDay(july4th));
        });
    });
    
    describe('getHolidaysForYear', function() {
        
        it('should return an array of holiday dates for a given year', function() {
            var holidays = promiseDelivery.getHolidaysForYear(2025);
            
            assert.isArray(holidays);
            assert.isAbove(holidays.length, 0);
        });
        
        it('should include New Year\'s Day', function() {
            var holidays = promiseDelivery.getHolidaysForYear(2025);
            
            assert.include(holidays, '2025-01-01');
        });
        
        it('should include Christmas Day', function() {
            var holidays = promiseDelivery.getHolidaysForYear(2025);
            
            assert.include(holidays, '2025-12-25');
        });
        
        it('should include Independence Day', function() {
            var holidays = promiseDelivery.getHolidaysForYear(2025);
            
            assert.include(holidays, '2025-07-04');
        });
        
        it('should include Thanksgiving (4th Thursday of November)', function() {
            var holidays = promiseDelivery.getHolidaysForYear(2025);
            
            // Thanksgiving 2025 is November 27th
            assert.include(holidays, '2025-11-27');
        });
        
        it('should include Memorial Day (last Monday of May)', function() {
            var holidays = promiseDelivery.getHolidaysForYear(2025);
            
            // Memorial Day 2025 is May 26th
            assert.include(holidays, '2025-05-26');
        });
        
        it('should include Labor Day (1st Monday of September)', function() {
            var holidays = promiseDelivery.getHolidaysForYear(2025);
            
            // Labor Day 2025 is September 1st
            assert.include(holidays, '2025-09-01');
        });
        
        it('should include MLK Day (3rd Monday of January)', function() {
            var holidays = promiseDelivery.getHolidaysForYear(2025);
            
            // MLK Day 2025 is January 20th
            assert.include(holidays, '2025-01-20');
        });
    });
    
    describe('addBusinessDays', function() {
        
        it('should skip weekends when adding business days', function() {
            // Friday Dec 27, 2024 + 1 business day = Monday Dec 30, 2024
            var friday = new Date(2024, 11, 27);
            var result = promiseDelivery.addBusinessDays(friday, 1);
            
            assert.equal(result.getDate(), 30);
            assert.equal(result.getMonth(), 11);
        });
        
        it('should skip holidays when adding business days', function() {
            // Dec 24, 2024 + 1 business day should skip Dec 25 (Christmas)
            var dec24 = new Date(2024, 11, 24);
            var result = promiseDelivery.addBusinessDays(dec24, 1);
            
            // Should land on Dec 26 (Thursday)
            assert.equal(result.getDate(), 26);
        });
        
        it('should handle multiple business days correctly', function() {
            // Monday + 5 business days = next Monday (if no holidays)
            var monday = new Date(2024, 11, 2); // Dec 2, 2024
            var result = promiseDelivery.addBusinessDays(monday, 5);
            
            // Should land on Dec 9 (Monday)
            assert.equal(result.getDate(), 9);
            assert.equal(result.getMonth(), 11);
        });
    });
    
    describe('getShipDate', function() {
        
        it('should return a Date object', function() {
            var result = promiseDelivery.getShipDate();
            
            assert.instanceOf(result, Date);
        });
        
        it('should return a business day', function() {
            var result = promiseDelivery.getShipDate();
            
            // The ship date should always be a business day
            assert.isTrue(promiseDelivery.isBusinessDay(result));
        });
    });
    
    describe('CUTOFF_HOUR', function() {
        
        it('should be set to 14 (2 PM)', function() {
            assert.equal(promiseDelivery.CUTOFF_HOUR, 14);
        });
    });
});

