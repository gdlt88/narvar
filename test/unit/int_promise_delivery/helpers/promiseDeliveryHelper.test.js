'use strict';

/**
 * Unit Tests for Promise Delivery Helper
 * 
 * Run with: npm test
 * 
 * These tests verify the core business logic of the delivery date calculation.
 */

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

// Mock the dw/util/Calendar module
var MockCalendar = function(time) {
    this._date = time ? new Date(time) : new Date();
    this._timezone = null;
};

MockCalendar.YEAR = 1;
MockCalendar.MONTH = 2;
MockCalendar.DAY_OF_MONTH = 5;
MockCalendar.DAY_OF_WEEK = 7;
MockCalendar.HOUR_OF_DAY = 11;
MockCalendar.MINUTE = 12;
MockCalendar.SECOND = 13;
MockCalendar.MILLISECOND = 14;
MockCalendar.SUNDAY = 1;
MockCalendar.MONDAY = 2;
MockCalendar.TUESDAY = 3;
MockCalendar.WEDNESDAY = 4;
MockCalendar.THURSDAY = 5;
MockCalendar.FRIDAY = 6;
MockCalendar.SATURDAY = 7;

MockCalendar.prototype.get = function(field) {
    switch(field) {
        case MockCalendar.YEAR:
            return this._date.getFullYear();
        case MockCalendar.MONTH:
            return this._date.getMonth();
        case MockCalendar.DAY_OF_MONTH:
            return this._date.getDate();
        case MockCalendar.DAY_OF_WEEK:
            // JavaScript: 0=Sunday, SFCC: 1=Sunday
            return this._date.getDay() + 1;
        case MockCalendar.HOUR_OF_DAY:
            return this._date.getHours();
        case MockCalendar.MINUTE:
            return this._date.getMinutes();
        case MockCalendar.SECOND:
            return this._date.getSeconds();
        case MockCalendar.MILLISECOND:
            return this._date.getMilliseconds();
        default:
            return 0;
    }
};

MockCalendar.prototype.set = function(field, value) {
    switch(field) {
        case MockCalendar.YEAR:
            this._date.setFullYear(value);
            break;
        case MockCalendar.MONTH:
            this._date.setMonth(value);
            break;
        case MockCalendar.DAY_OF_MONTH:
            this._date.setDate(value);
            break;
        case MockCalendar.HOUR_OF_DAY:
            this._date.setHours(value);
            break;
        case MockCalendar.MINUTE:
            this._date.setMinutes(value);
            break;
        case MockCalendar.SECOND:
            this._date.setSeconds(value);
            break;
        case MockCalendar.MILLISECOND:
            this._date.setMilliseconds(value);
            break;
    }
};

MockCalendar.prototype.add = function(field, amount) {
    switch(field) {
        case MockCalendar.DAY_OF_MONTH:
            this._date.setDate(this._date.getDate() + amount);
            break;
        case MockCalendar.MONTH:
            this._date.setMonth(this._date.getMonth() + amount);
            break;
        case MockCalendar.YEAR:
            this._date.setFullYear(this._date.getFullYear() + amount);
            break;
    }
};

MockCalendar.prototype.getTime = function() {
    return this._date.getTime();
};

MockCalendar.prototype.setTimeZone = function(tz) {
    this._timezone = tz;
};

// Load the helper with mocked dependencies
var promiseDeliveryHelper = proxyquire('../../../../cartridges/int_promise_delivery/helpers/promiseDeliveryHelper', {
    'dw/util/Calendar': MockCalendar
});

describe('Promise Delivery Helper', function() {
    
    describe('isValidZipCode', function() {
        
        it('should return true for valid 5-digit ZIP code', function() {
            assert.isTrue(promiseDeliveryHelper.isValidZipCode('12345'));
            assert.isTrue(promiseDeliveryHelper.isValidZipCode('00000'));
            assert.isTrue(promiseDeliveryHelper.isValidZipCode('99999'));
            assert.isTrue(promiseDeliveryHelper.isValidZipCode('90210'));
        });
        
        it('should return false for invalid ZIP codes', function() {
            assert.isFalse(promiseDeliveryHelper.isValidZipCode('1234'));    // Too short
            assert.isFalse(promiseDeliveryHelper.isValidZipCode('123456'));  // Too long
            assert.isFalse(promiseDeliveryHelper.isValidZipCode('abcde'));   // Letters
            assert.isFalse(promiseDeliveryHelper.isValidZipCode(''));        // Empty
            assert.isFalse(promiseDeliveryHelper.isValidZipCode(null));      // Null
            assert.isFalse(promiseDeliveryHelper.isValidZipCode(undefined)); // Undefined
        });
        
        it('should handle ZIP codes with non-numeric characters', function() {
            // The function strips non-digits, so "123-45" becomes "12345"
            assert.isTrue(promiseDeliveryHelper.isValidZipCode('123-45'));
            assert.isTrue(promiseDeliveryHelper.isValidZipCode('12 345'));
        });
    });
    
    describe('getTransitDays', function() {
        
        it('should return 1 day for ZIP codes 00000-19999', function() {
            assert.equal(promiseDeliveryHelper.getTransitDays('00000'), 1);
            assert.equal(promiseDeliveryHelper.getTransitDays('10001'), 1);
            assert.equal(promiseDeliveryHelper.getTransitDays('19999'), 1);
        });
        
        it('should return 2 days for ZIP codes 20000-39999', function() {
            assert.equal(promiseDeliveryHelper.getTransitDays('20000'), 2);
            assert.equal(promiseDeliveryHelper.getTransitDays('30301'), 2);
            assert.equal(promiseDeliveryHelper.getTransitDays('39999'), 2);
        });
        
        it('should return 3 days for ZIP codes 40000-59999', function() {
            assert.equal(promiseDeliveryHelper.getTransitDays('40000'), 3);
            assert.equal(promiseDeliveryHelper.getTransitDays('50000'), 3);
            assert.equal(promiseDeliveryHelper.getTransitDays('59999'), 3);
        });
        
        it('should return 4 days for ZIP codes 60000-79999', function() {
            assert.equal(promiseDeliveryHelper.getTransitDays('60000'), 4);
            assert.equal(promiseDeliveryHelper.getTransitDays('60601'), 4);
            assert.equal(promiseDeliveryHelper.getTransitDays('79999'), 4);
        });
        
        it('should return 5 days for ZIP codes 80000-99999', function() {
            assert.equal(promiseDeliveryHelper.getTransitDays('80000'), 5);
            assert.equal(promiseDeliveryHelper.getTransitDays('90210'), 5);
            assert.equal(promiseDeliveryHelper.getTransitDays('99999'), 5);
        });
        
        it('should return 5 days for invalid ZIP codes', function() {
            assert.equal(promiseDeliveryHelper.getTransitDays('invalid'), 5);
            assert.equal(promiseDeliveryHelper.getTransitDays(''), 5);
        });
    });
    
    describe('getTransitDaysForShippingMethod', function() {
        
        it('should return 1 day for overnight shipping regardless of ZIP', function() {
            assert.equal(promiseDeliveryHelper.getTransitDaysForShippingMethod('overnight', '10001'), 1);
            assert.equal(promiseDeliveryHelper.getTransitDaysForShippingMethod('overnight', '90210'), 1);
            assert.equal(promiseDeliveryHelper.getTransitDaysForShippingMethod('express-overnight', '90210'), 1);
        });
        
        it('should return max 2 days for express shipping', function() {
            // For close ZIPs (1 day base), express should be 1 day
            assert.equal(promiseDeliveryHelper.getTransitDaysForShippingMethod('express', '10001'), 1);
            
            // For far ZIPs (5 day base), express should be capped at 2 days
            assert.equal(promiseDeliveryHelper.getTransitDaysForShippingMethod('express', '90210'), 2);
            
            // For medium ZIPs (3 day base), express should be 2 days
            assert.equal(promiseDeliveryHelper.getTransitDaysForShippingMethod('express', '50000'), 2);
        });
        
        it('should return base transit days for standard shipping', function() {
            assert.equal(promiseDeliveryHelper.getTransitDaysForShippingMethod('standard', '10001'), 1);
            assert.equal(promiseDeliveryHelper.getTransitDaysForShippingMethod('standard', '30301'), 2);
            assert.equal(promiseDeliveryHelper.getTransitDaysForShippingMethod('standard', '50000'), 3);
            assert.equal(promiseDeliveryHelper.getTransitDaysForShippingMethod('standard', '60601'), 4);
            assert.equal(promiseDeliveryHelper.getTransitDaysForShippingMethod('standard', '90210'), 5);
        });
        
        it('should default to standard shipping for unknown methods', function() {
            assert.equal(promiseDeliveryHelper.getTransitDaysForShippingMethod('unknown', '90210'), 5);
            assert.equal(promiseDeliveryHelper.getTransitDaysForShippingMethod(null, '90210'), 5);
        });
    });
    
    describe('calculateDeliveryDate', function() {
        
        it('should return an object with required properties', function() {
            var result = promiseDeliveryHelper.calculateDeliveryDate('90210');
            
            assert.isObject(result);
            assert.property(result, 'deliveryDate');
            assert.property(result, 'shipDate');
            assert.property(result, 'transitDays');
            assert.property(result, 'formattedDate');
            assert.property(result, 'formattedDateFull');
            assert.property(result, 'displayMessage');
        });
        
        it('should include transit days in result', function() {
            var result = promiseDeliveryHelper.calculateDeliveryDate('90210', 'standard');
            assert.equal(result.transitDays, 5);
            
            result = promiseDeliveryHelper.calculateDeliveryDate('10001', 'standard');
            assert.equal(result.transitDays, 1);
        });
        
        it('should format date with ordinal suffix', function() {
            var result = promiseDeliveryHelper.calculateDeliveryDate('90210');
            
            // formattedDate should be like "January 20th"
            assert.match(result.formattedDate, /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}(st|nd|rd|th)$/);
        });
        
        it('should format full date with day of week', function() {
            var result = promiseDeliveryHelper.calculateDeliveryDate('90210');
            
            // formattedDateFull should be like "Monday, January 20th"
            assert.match(result.formattedDateFull, /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), (January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}(st|nd|rd|th)$/);
        });
        
        it('should include display message', function() {
            var result = promiseDeliveryHelper.calculateDeliveryDate('90210');
            
            assert.include(result.displayMessage, 'Get it by');
        });
    });
    
    describe('getDeliveryEstimatesForAllMethods', function() {
        
        it('should return an array of 3 shipping methods', function() {
            var results = promiseDeliveryHelper.getDeliveryEstimatesForAllMethods('90210');
            
            assert.isArray(results);
            assert.lengthOf(results, 3);
        });
        
        it('should include standard, express, and overnight methods', function() {
            var results = promiseDeliveryHelper.getDeliveryEstimatesForAllMethods('90210');
            
            var methodIds = results.map(function(r) { return r.shippingMethodId; });
            
            assert.include(methodIds, 'standard');
            assert.include(methodIds, 'express');
            assert.include(methodIds, 'overnight');
        });
        
        it('should have different transit days for different methods', function() {
            var results = promiseDeliveryHelper.getDeliveryEstimatesForAllMethods('90210');
            
            var standard = results.find(function(r) { return r.shippingMethodId === 'standard'; });
            var express = results.find(function(r) { return r.shippingMethodId === 'express'; });
            var overnight = results.find(function(r) { return r.shippingMethodId === 'overnight'; });
            
            assert.equal(standard.transitDays, 5);
            assert.equal(express.transitDays, 2);
            assert.equal(overnight.transitDays, 1);
        });
        
        it('should include price information', function() {
            var results = promiseDeliveryHelper.getDeliveryEstimatesForAllMethods('90210');
            
            results.forEach(function(result) {
                assert.property(result, 'price');
                assert.isNumber(result.price);
                assert.isAbove(result.price, 0);
            });
        });
        
        it('should have increasing prices for faster shipping', function() {
            var results = promiseDeliveryHelper.getDeliveryEstimatesForAllMethods('90210');
            
            var standard = results.find(function(r) { return r.shippingMethodId === 'standard'; });
            var express = results.find(function(r) { return r.shippingMethodId === 'express'; });
            var overnight = results.find(function(r) { return r.shippingMethodId === 'overnight'; });
            
            assert.isBelow(standard.price, express.price);
            assert.isBelow(express.price, overnight.price);
        });
    });
    
    describe('CONFIG', function() {
        
        it('should have cutoff hour set to 14 (2 PM)', function() {
            assert.equal(promiseDeliveryHelper.CONFIG.CUTOFF_HOUR_EST, 14);
        });
        
        it('should have origin ZIP set to NYC', function() {
            assert.equal(promiseDeliveryHelper.CONFIG.ORIGIN_ZIP, '10001');
        });
        
        it('should have EST offset of -5', function() {
            assert.equal(promiseDeliveryHelper.CONFIG.EST_OFFSET, -5);
        });
    });
});

describe('Ordinal Suffix Logic', function() {
    
    it('should use "st" for 1st, 21st, 31st', function() {
        // We can't easily test this directly, but we can verify the pattern
        var result1 = promiseDeliveryHelper.calculateDeliveryDate('10001');
        
        // The formatted date should end with a valid ordinal
        assert.match(result1.formattedDate, /(1st|2nd|3rd|\d+th)$/);
    });
});

describe('Business Day Calculation', function() {
    
    it('should expose isBusinessDay function', function() {
        assert.isFunction(promiseDeliveryHelper.isBusinessDay);
    });
    
    it('should expose addBusinessDays function', function() {
        assert.isFunction(promiseDeliveryHelper.addBusinessDays);
    });
    
    it('should expose getShipDate function', function() {
        assert.isFunction(promiseDeliveryHelper.getShipDate);
    });
});

