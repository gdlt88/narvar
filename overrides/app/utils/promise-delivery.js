/*
 * Copyright (c) 2024, Narvar, Inc.
 * All rights reserved.
 *
 * Promise Delivery Date Utility
 *
 * This module contains the business logic for calculating estimated delivery dates.
 * It mirrors the logic in the SFRA cartridge (int_promise_delivery) for consistency.
 *
 * Calculation Logic:
 * Promise Date = Ship Date + Transit Days (business days only)
 *
 * - Ship Date: Today if before 2 PM EST cutoff, else next business day
 * - Transit Days: Based on origin→destination ZIP range
 * - Business Days: Excludes weekends and US federal holidays
 */

// Configuration constants
export const CONFIG = {
    CUTOFF_HOUR_EST: 14, // 2 PM EST cutoff
    ORIGIN_ZIP: '10001', // NYC origin
    EST_OFFSET: -5 // EST timezone offset
}

// US Federal Holidays (2024-2025)
export const HOLIDAYS = [
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
    '2025-12-25' // Christmas
]

/**
 * Format a Date object as YYYY-MM-DD string
 * @param {Date} date - Date object
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const formatDateString = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * Check if a date is a US federal holiday
 * @param {Date} date - Date object to check
 * @returns {boolean} True if the date is a holiday
 */
export const isHoliday = (date) => {
    const dateStr = formatDateString(date)
    return HOLIDAYS.includes(dateStr)
}

/**
 * Check if a date is a business day (not weekend, not holiday)
 * @param {Date} date - Date object to check
 * @returns {boolean} True if the date is a business day
 */
export const isBusinessDay = (date) => {
    const dayOfWeek = date.getDay()
    // Check if weekend (0 = Sunday, 6 = Saturday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false
    }
    // Check if holiday
    return !isHoliday(date)
}

/**
 * Get the next business day from a given date
 * @param {Date} date - Starting date
 * @returns {Date} Date object for next business day
 */
export const getNextBusinessDay = (date) => {
    const nextDay = new Date(date)
    nextDay.setDate(nextDay.getDate() + 1)
    while (!isBusinessDay(nextDay)) {
        nextDay.setDate(nextDay.getDate() + 1)
    }
    return nextDay
}

/**
 * Add business days to a date
 * @param {Date} startDate - Starting date
 * @param {number} businessDays - Number of business days to add
 * @returns {Date} Date object for the resulting date
 */
export const addBusinessDays = (startDate, businessDays) => {
    const currentDate = new Date(startDate)
    let daysAdded = 0

    while (daysAdded < businessDays) {
        currentDate.setDate(currentDate.getDate() + 1)
        if (isBusinessDay(currentDate)) {
            daysAdded++
        }
    }

    return currentDate
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
export const getTransitDays = (destinationZip) => {
    const zipNum = parseInt(destinationZip, 10)

    if (isNaN(zipNum)) {
        return 5 // Default to 5 days for invalid ZIPs
    }

    if (zipNum >= 0 && zipNum <= 19999) return 1
    if (zipNum >= 20000 && zipNum <= 39999) return 2
    if (zipNum >= 40000 && zipNum <= 59999) return 3
    if (zipNum >= 60000 && zipNum <= 79999) return 4
    if (zipNum >= 80000 && zipNum <= 99999) return 5

    return 5 // Default to 5 days for unknown ZIPs
}

/**
 * Get transit days for a specific shipping method
 * @param {string} shippingMethodId - Shipping method ID
 * @param {string} destinationZip - Destination ZIP code
 * @returns {number} Number of transit days
 */
export const getTransitDaysForShippingMethod = (shippingMethodId, destinationZip) => {
    const baseTransitDays = getTransitDays(destinationZip)

    // Adjust transit days based on shipping method
    switch (shippingMethodId) {
        case 'overnight':
        case 'express-overnight':
            return 1 // Overnight shipping
        case 'express':
        case '2-day':
            return Math.min(2, baseTransitDays) // Express - max 2 days
        case 'standard':
        default:
            return baseTransitDays // Standard shipping uses base transit days
    }
}

/**
 * Get the ship date based on current time and 2 PM EST cutoff
 * @returns {Date} Date object for ship date
 */
export const getShipDate = () => {
    const now = new Date()

    // Convert to EST
    const estOffset = CONFIG.EST_OFFSET
    const utc = now.getTime() + now.getTimezoneOffset() * 60000
    const estTime = new Date(utc + 3600000 * estOffset)
    const estHour = estTime.getHours()

    // Create today's date (midnight)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // If before 2 PM EST and today is a business day, ship today
    if (estHour < CONFIG.CUTOFF_HOUR_EST && isBusinessDay(today)) {
        return today
    }

    // Otherwise, ship next business day
    return getNextBusinessDay(today)
}

/**
 * Calculate the promise delivery date
 * Promise Date = Ship Date + Transit Days (business days only)
 *
 * @param {string} destinationZip - Destination ZIP code
 * @param {string} [shippingMethodId] - Optional shipping method ID
 * @returns {Object} Object containing deliveryDate and formatted strings
 */
export const calculateDeliveryDate = (destinationZip, shippingMethodId = null) => {
    const shipDate = getShipDate()
    const transitDays = shippingMethodId
        ? getTransitDaysForShippingMethod(shippingMethodId, destinationZip)
        : getTransitDays(destinationZip)
    const deliveryDate = addBusinessDays(shipDate, transitDays)

    // Format the date for display
    const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ]
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    const dayOfWeek = days[deliveryDate.getDay()]
    const month = months[deliveryDate.getMonth()]
    const dayOfMonth = deliveryDate.getDate()

    // Add ordinal suffix
    let suffix = 'th'
    if (dayOfMonth === 1 || dayOfMonth === 21 || dayOfMonth === 31) suffix = 'st'
    else if (dayOfMonth === 2 || dayOfMonth === 22) suffix = 'nd'
    else if (dayOfMonth === 3 || dayOfMonth === 23) suffix = 'rd'

    return {
        deliveryDate,
        shipDate,
        transitDays,
        formattedDate: `${month} ${dayOfMonth}${suffix}`,
        formattedDateFull: `${dayOfWeek}, ${month} ${dayOfMonth}${suffix}`,
        displayMessage: `Get it by ${month} ${dayOfMonth}${suffix}`
    }
}

/**
 * Validate a US ZIP code
 * @param {string} zipCode - ZIP code to validate
 * @returns {boolean} True if valid 5-digit US ZIP code
 */
export const isValidZipCode = (zipCode) => {
    if (!zipCode || typeof zipCode !== 'string') {
        return false
    }
    const cleaned = zipCode.replace(/\D/g, '')
    return cleaned.length === 5
}

/**
 * Get delivery estimates for all shipping methods
 * @param {string} destinationZip - Destination ZIP code
 * @returns {Array} Array of shipping method delivery estimates
 */
export const getDeliveryEstimatesForAllMethods = (destinationZip) => {
    const shippingMethods = [
        {id: 'standard', name: 'Standard Shipping', price: 5.99},
        {id: 'express', name: 'Express Shipping', price: 12.99},
        {id: 'overnight', name: 'Overnight', price: 24.99}
    ]

    return shippingMethods.map((method) => {
        const estimate = calculateDeliveryDate(destinationZip, method.id)
        return {
            shippingMethodId: method.id,
            shippingMethodName: method.name,
            price: method.price,
            transitDays: estimate.transitDays,
            deliveryDate: estimate.formattedDate,
            displayMessage: estimate.displayMessage
        }
    })
}

// Default export with all functions
export default {
    calculateDeliveryDate,
    getTransitDays,
    getTransitDaysForShippingMethod,
    getShipDate,
    isBusinessDay,
    isValidZipCode,
    getDeliveryEstimatesForAllMethods,
    addBusinessDays,
    CONFIG,
    HOLIDAYS
}
