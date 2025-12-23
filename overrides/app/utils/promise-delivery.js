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

// ============================================================================
// DYNAMIC HOLIDAY CALCULATION
// ============================================================================

/**
 * Get the Nth occurrence of a weekday in a given month
 * @param {number} year - The year
 * @param {number} month - The month (0-11)
 * @param {number} dayOfWeek - Day of week (0=Sunday, 1=Monday, etc.)
 * @param {number} occurrence - Which occurrence (1=first, 2=second, etc.)
 * @returns {Date} The date of the Nth weekday
 */
const getNthWeekdayOfMonth = (year, month, dayOfWeek, occurrence) => {
    const firstDay = new Date(year, month, 1)
    const firstDayOfWeek = firstDay.getDay()

    // Calculate days until the first occurrence of the target weekday
    let daysUntilFirst = dayOfWeek - firstDayOfWeek
    if (daysUntilFirst < 0) {
        daysUntilFirst += 7
    }

    // Calculate the date of the Nth occurrence
    const date = 1 + daysUntilFirst + (occurrence - 1) * 7
    return new Date(year, month, date)
}

/**
 * Get the last occurrence of a weekday in a given month
 * @param {number} year - The year
 * @param {number} month - The month (0-11)
 * @param {number} dayOfWeek - Day of week (0=Sunday, 1=Monday, etc.)
 * @returns {Date} The date of the last weekday
 */
const getLastWeekdayOfMonth = (year, month, dayOfWeek) => {
    // Start from the last day of the month
    const lastDay = new Date(year, month + 1, 0)
    const lastDayOfWeek = lastDay.getDay()

    // Calculate days to go back to reach the target weekday
    let daysToSubtract = lastDayOfWeek - dayOfWeek
    if (daysToSubtract < 0) {
        daysToSubtract += 7
    }

    return new Date(year, month + 1, -daysToSubtract)
}

/**
 * Get observed date for a holiday (handles weekend observance)
 * If holiday falls on Saturday, observed on Friday
 * If holiday falls on Sunday, observed on Monday
 * @param {Date} date - The actual holiday date
 * @returns {Date} The observed date
 */
const getObservedDate = (date) => {
    const dayOfWeek = date.getDay()
    if (dayOfWeek === 6) {
        // Saturday -> observe on Friday
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1)
    } else if (dayOfWeek === 0) {
        // Sunday -> observe on Monday
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
    }
    return date
}

/**
 * Calculate all US federal holidays for a given year
 * @param {number} year - The year to calculate holidays for
 * @returns {string[]} Array of holiday dates in YYYY-MM-DD format
 */
const calculateHolidaysForYear = (year) => {
    const holidays = []

    // New Year's Day - January 1 (observed)
    const newYears = getObservedDate(new Date(year, 0, 1))
    holidays.push(formatDateStringInternal(newYears))

    // Martin Luther King Jr. Day - 3rd Monday of January
    const mlkDay = getNthWeekdayOfMonth(year, 0, 1, 3)
    holidays.push(formatDateStringInternal(mlkDay))

    // Presidents Day - 3rd Monday of February
    const presidentsDay = getNthWeekdayOfMonth(year, 1, 1, 3)
    holidays.push(formatDateStringInternal(presidentsDay))

    // Memorial Day - Last Monday of May
    const memorialDay = getLastWeekdayOfMonth(year, 4, 1)
    holidays.push(formatDateStringInternal(memorialDay))

    // Independence Day - July 4 (observed)
    const independenceDay = getObservedDate(new Date(year, 6, 4))
    holidays.push(formatDateStringInternal(independenceDay))

    // Labor Day - 1st Monday of September
    const laborDay = getNthWeekdayOfMonth(year, 8, 1, 1)
    holidays.push(formatDateStringInternal(laborDay))

    // Columbus Day - 2nd Monday of October
    const columbusDay = getNthWeekdayOfMonth(year, 9, 1, 2)
    holidays.push(formatDateStringInternal(columbusDay))

    // Veterans Day - November 11 (observed)
    const veteransDay = getObservedDate(new Date(year, 10, 11))
    holidays.push(formatDateStringInternal(veteransDay))

    // Thanksgiving - 4th Thursday of November
    const thanksgiving = getNthWeekdayOfMonth(year, 10, 4, 4)
    holidays.push(formatDateStringInternal(thanksgiving))

    // Christmas Day - December 25 (observed)
    const christmas = getObservedDate(new Date(year, 11, 25))
    holidays.push(formatDateStringInternal(christmas))

    return holidays
}

/**
 * Internal format function (used before main formatDateString is defined)
 */
const formatDateStringInternal = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// Cache for calculated holidays (keyed by year)
const holidayCache = new Map()

/**
 * Get holidays for a specific year (with caching)
 * @param {number} year - The year
 * @returns {string[]} Array of holiday dates
 */
export const getHolidaysForYear = (year) => {
    if (!holidayCache.has(year)) {
        holidayCache.set(year, calculateHolidaysForYear(year))
    }
    return holidayCache.get(year)
}

/**
 * Check if a date is a US federal holiday (dynamically calculated)
 * @param {Date} date - Date object to check
 * @returns {boolean} True if the date is a holiday
 */
export const isHolidayDynamic = (date) => {
    const year = date.getFullYear()
    const dateStr = formatDateStringInternal(date)
    const holidays = getHolidaysForYear(year)
    return holidays.includes(dateStr)
}

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
 * Uses dynamic calculation - no need to maintain static holiday lists
 * @param {Date} date - Date object to check
 * @returns {boolean} True if the date is a holiday
 */
export const isHoliday = (date) => {
    return isHolidayDynamic(date)
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

    // Get current hour in EST/EDT using Intl API for proper timezone handling
    let estHour
    try {
        const estTimeStr = now.toLocaleString('en-US', {
            timeZone: 'America/New_York',
            hour: 'numeric',
            hour12: false
        })
        estHour = parseInt(estTimeStr, 10)
    } catch (e) {
        // Fallback: assume local time if timezone API fails
        estHour = now.getHours()
    }

    // Create today's date (midnight in local timezone)
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

    // Debug logging - log on both client and server
    console.log('[Promise Delivery] Debug:', {
        destinationZip,
        shippingMethodId,
        shipDate: shipDate ? shipDate.toString() : 'null',
        transitDays,
        deliveryDate: deliveryDate ? deliveryDate.toString() : 'null',
        deliveryMonth: deliveryDate ? deliveryDate.getMonth() : 'null',
        deliveryDay: deliveryDate ? deliveryDate.getDate() : 'null',
        deliveryYear: deliveryDate ? deliveryDate.getFullYear() : 'null'
    })

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
    getHolidaysForYear
}
