'use strict';

/**
 * Promise Delivery Date Helper
 * 
 * This module contains the business logic for calculating estimated delivery dates.
 * 
 * Calculation Logic:
 * Promise Date = Ship Date + Transit Days (business days only)
 * 
 * - Ship Date: Today if before 2 PM EST cutoff, else next business day
 * - Transit Days: Based on origin→destination ZIP range
 * - Business Days: Excludes weekends and US federal holidays
 */

var Calendar = require('dw/util/Calendar');
var Site = require('dw/system/Site');

// Configuration constants
var CONFIG = {
    CUTOFF_HOUR_EST: 14, // 2 PM EST cutoff
    ORIGIN_ZIP: '10001', // NYC origin
    EST_OFFSET: -5 // EST timezone offset
};

// US Federal Holidays (2024-2025)
var HOLIDAYS = [
    '2024-01-01', // New Year's Day
    '2024-01-15', // MLK Day
    '2024-02-19', // Presidents Day
    '2024-05-27', // Memorial Day
    '2024-07-04', // Independence Day
    '2024-09-02', // Labor Day
    '2024-10-14', // Columbus Day
    '2024-11-11', // Veterans Day
    '2024-11-28', // Thanksgiving
    '2024-12-25', // Christmas
    '2025-01-01', // New Year's Day
    '2025-01-20', // MLK Day
    '2025-02-17', // Presidents Day
    '2025-05-26', // Memorial Day
    '2025-07-04', // Independence Day
    '2025-09-01', // Labor Day
    '2025-10-13', // Columbus Day
    '2025-11-11', // Veterans Day
    '2025-11-27', // Thanksgiving
    '2025-12-25'  // Christmas
];

/**
 * Format a Calendar date as YYYY-MM-DD string
 * @param {dw.util.Calendar} calendar - Calendar object
 * @returns {string} Date string in YYYY-MM-DD format
 */
function formatDateString(calendar) {
    var year = calendar.get(Calendar.YEAR);
    var month = String(calendar.get(Calendar.MONTH) + 1).padStart(2, '0');
    var day = String(calendar.get(Calendar.DAY_OF_MONTH)).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

/**
 * Check if a date is a US federal holiday
 * @param {dw.util.Calendar} calendar - Calendar object to check
 * @returns {boolean} True if the date is a holiday
 */
function isHoliday(calendar) {
    var dateStr = formatDateString(calendar);
    return HOLIDAYS.indexOf(dateStr) !== -1;
}

/**
 * Check if a date is a business day (not weekend, not holiday)
 * @param {dw.util.Calendar} calendar - Calendar object to check
 * @returns {boolean} True if the date is a business day
 */
function isBusinessDay(calendar) {
    var dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK);
    // Check if weekend (1 = Sunday, 7 = Saturday in dw.util.Calendar)
    if (dayOfWeek === Calendar.SUNDAY || dayOfWeek === Calendar.SATURDAY) {
        return false;
    }
    // Check if holiday
    return !isHoliday(calendar);
}

/**
 * Get the next business day from a given date
 * @param {dw.util.Calendar} calendar - Starting calendar object
 * @returns {dw.util.Calendar} Calendar object for next business day
 */
function getNextBusinessDay(calendar) {
    var nextDay = new Calendar(calendar.getTime());
    nextDay.add(Calendar.DAY_OF_MONTH, 1);
    while (!isBusinessDay(nextDay)) {
        nextDay.add(Calendar.DAY_OF_MONTH, 1);
    }
    return nextDay;
}

/**
 * Add business days to a date
 * @param {dw.util.Calendar} startDate - Starting calendar object
 * @param {number} businessDays - Number of business days to add
 * @returns {dw.util.Calendar} Calendar object for the resulting date
 */
function addBusinessDays(startDate, businessDays) {
    var currentDate = new Calendar(startDate.getTime());
    var daysAdded = 0;

    while (daysAdded < businessDays) {
        currentDate.add(Calendar.DAY_OF_MONTH, 1);
        if (isBusinessDay(currentDate)) {
            daysAdded++;
        }
    }

    return currentDate;
}

/**
 * Get transit days based on destination ZIP range
 * Origin: 10001 (NYC)
 * 
 * | Destination ZIP | Transit Days |
 * |-----------------|--------------|
 * | 00000-19999     | 1            |
 * | 20000-39999     | 2            |
 * | 40000-59999     | 3            |
 * | 60000-79999     | 4            |
 * | 80000-99999     | 5            |
 * 
 * @param {string} destinationZip - Destination ZIP code
 * @returns {number} Number of transit days
 */
function getTransitDays(destinationZip) {
    var zipNum = parseInt(destinationZip, 10);

    if (isNaN(zipNum)) {
        return 5; // Default to 5 days for invalid ZIPs
    }

    if (zipNum >= 0 && zipNum <= 19999) return 1;
    if (zipNum >= 20000 && zipNum <= 39999) return 2;
    if (zipNum >= 40000 && zipNum <= 59999) return 3;
    if (zipNum >= 60000 && zipNum <= 79999) return 4;
    if (zipNum >= 80000 && zipNum <= 99999) return 5;

    return 5; // Default to 5 days for unknown ZIPs
}

/**
 * Get transit days for a specific shipping method
 * @param {string} shippingMethodId - Shipping method ID
 * @param {string} destinationZip - Destination ZIP code
 * @returns {number} Number of transit days
 */
function getTransitDaysForShippingMethod(shippingMethodId, destinationZip) {
    var baseTransitDays = getTransitDays(destinationZip);
    
    // Adjust transit days based on shipping method
    switch (shippingMethodId) {
        case 'overnight':
        case 'express-overnight':
            return 1; // Overnight shipping
        case 'express':
        case '2-day':
            return Math.min(2, baseTransitDays); // Express - max 2 days
        case 'standard':
        default:
            return baseTransitDays; // Standard shipping uses base transit days
    }
}

/**
 * Get the ship date based on current time and 2 PM EST cutoff
 * @returns {dw.util.Calendar} Calendar object for ship date
 */
function getShipDate() {
    var now = new Calendar();
    
    // Get current hour in EST
    // Note: In production, use Site timezone configuration
    var estCalendar = new Calendar();
    estCalendar.setTimeZone('America/New_York');
    var estHour = estCalendar.get(Calendar.HOUR_OF_DAY);

    // Create today's date
    var today = new Calendar();
    today.set(Calendar.HOUR_OF_DAY, 0);
    today.set(Calendar.MINUTE, 0);
    today.set(Calendar.SECOND, 0);
    today.set(Calendar.MILLISECOND, 0);

    // If before 2 PM EST and today is a business day, ship today
    if (estHour < CONFIG.CUTOFF_HOUR_EST && isBusinessDay(today)) {
        return today;
    }

    // Otherwise, ship next business day
    return getNextBusinessDay(today);
}

/**
 * Calculate the promise delivery date
 * Promise Date = Ship Date + Transit Days (business days only)
 * 
 * @param {string} destinationZip - Destination ZIP code
 * @param {string} [shippingMethodId] - Optional shipping method ID
 * @returns {Object} Object containing deliveryDate and formatted string
 */
function calculateDeliveryDate(destinationZip, shippingMethodId) {
    var shipDate = getShipDate();
    var transitDays = shippingMethodId 
        ? getTransitDaysForShippingMethod(shippingMethodId, destinationZip)
        : getTransitDays(destinationZip);
    var deliveryDate = addBusinessDays(shipDate, transitDays);

    // Format the date for display
    var months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    var dayOfWeek = days[deliveryDate.get(Calendar.DAY_OF_WEEK) - 1];
    var month = months[deliveryDate.get(Calendar.MONTH)];
    var dayOfMonth = deliveryDate.get(Calendar.DAY_OF_MONTH);
    
    // Add ordinal suffix
    var suffix = 'th';
    if (dayOfMonth === 1 || dayOfMonth === 21 || dayOfMonth === 31) suffix = 'st';
    else if (dayOfMonth === 2 || dayOfMonth === 22) suffix = 'nd';
    else if (dayOfMonth === 3 || dayOfMonth === 23) suffix = 'rd';

    return {
        deliveryDate: deliveryDate,
        shipDate: shipDate,
        transitDays: transitDays,
        formattedDate: month + ' ' + dayOfMonth + suffix,
        formattedDateFull: dayOfWeek + ', ' + month + ' ' + dayOfMonth + suffix,
        displayMessage: 'Get it by ' + month + ' ' + dayOfMonth + suffix
    };
}

/**
 * Validate a US ZIP code
 * @param {string} zipCode - ZIP code to validate
 * @returns {boolean} True if valid 5-digit US ZIP code
 */
function isValidZipCode(zipCode) {
    if (!zipCode || typeof zipCode !== 'string') {
        return false;
    }
    var cleaned = zipCode.replace(/\D/g, '');
    return cleaned.length === 5;
}

/**
 * Get delivery estimates for all shipping methods
 * @param {string} destinationZip - Destination ZIP code
 * @returns {Array} Array of shipping method delivery estimates
 */
function getDeliveryEstimatesForAllMethods(destinationZip) {
    var shippingMethods = [
        { id: 'standard', name: 'Standard Shipping', price: 5.99 },
        { id: 'express', name: 'Express Shipping', price: 12.99 },
        { id: 'overnight', name: 'Overnight', price: 24.99 }
    ];

    return shippingMethods.map(function(method) {
        var estimate = calculateDeliveryDate(destinationZip, method.id);
        return {
            shippingMethodId: method.id,
            shippingMethodName: method.name,
            price: method.price,
            transitDays: estimate.transitDays,
            deliveryDate: estimate.formattedDate,
            displayMessage: estimate.displayMessage
        };
    });
}

module.exports = {
    calculateDeliveryDate: calculateDeliveryDate,
    getTransitDays: getTransitDays,
    getTransitDaysForShippingMethod: getTransitDaysForShippingMethod,
    getShipDate: getShipDate,
    isBusinessDay: isBusinessDay,
    isValidZipCode: isValidZipCode,
    getDeliveryEstimatesForAllMethods: getDeliveryEstimatesForAllMethods,
    addBusinessDays: addBusinessDays,
    CONFIG: CONFIG
};

