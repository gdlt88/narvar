'use strict';

/**
 * Promise Delivery Controller
 * 
 * Provides API endpoints for calculating delivery dates.
 */

var server = require('server');
var promiseDeliveryHelper = require('*/cartridge/scripts/helpers/promiseDeliveryHelper');

/**
 * PromiseDelivery-GetEstimate
 * 
 * API endpoint to get delivery date estimate for a given ZIP code.
 * 
 * @param {string} zipCode - Destination ZIP code (query parameter)
 * @param {string} [shippingMethodId] - Optional shipping method ID (query parameter)
 * 
 * @returns {Object} JSON response with delivery estimate
 */
server.get('GetEstimate', function (req, res, next) {
    var zipCode = req.querystring.zipCode;
    var shippingMethodId = req.querystring.shippingMethodId;

    // Validate ZIP code
    if (!promiseDeliveryHelper.isValidZipCode(zipCode)) {
        res.json({
            success: false,
            error: 'Invalid ZIP code. Please enter a valid 5-digit US ZIP code.',
            errorCode: 'INVALID_ZIP'
        });
        return next();
    }

    try {
        var estimate = promiseDeliveryHelper.calculateDeliveryDate(zipCode, shippingMethodId);

        res.json({
            success: true,
            zipCode: zipCode,
            shippingMethodId: shippingMethodId || 'standard',
            transitDays: estimate.transitDays,
            deliveryDate: estimate.formattedDate,
            deliveryDateFull: estimate.formattedDateFull,
            displayMessage: estimate.displayMessage
        });
    } catch (e) {
        res.json({
            success: false,
            error: 'Unable to calculate delivery date. Please try again.',
            errorCode: 'CALCULATION_ERROR'
        });
    }

    return next();
});

/**
 * PromiseDelivery-GetAllEstimates
 * 
 * API endpoint to get delivery estimates for all shipping methods.
 * Used in checkout to display delivery dates per shipping method.
 * 
 * @param {string} zipCode - Destination ZIP code (query parameter)
 * 
 * @returns {Object} JSON response with delivery estimates for all methods
 */
server.get('GetAllEstimates', function (req, res, next) {
    var zipCode = req.querystring.zipCode;

    // Validate ZIP code
    if (!promiseDeliveryHelper.isValidZipCode(zipCode)) {
        res.json({
            success: false,
            error: 'Invalid ZIP code. Please enter a valid 5-digit US ZIP code.',
            errorCode: 'INVALID_ZIP'
        });
        return next();
    }

    try {
        var estimates = promiseDeliveryHelper.getDeliveryEstimatesForAllMethods(zipCode);

        res.json({
            success: true,
            zipCode: zipCode,
            shippingMethods: estimates
        });
    } catch (e) {
        res.json({
            success: false,
            error: 'Unable to calculate delivery dates. Please try again.',
            errorCode: 'CALCULATION_ERROR'
        });
    }

    return next();
});

module.exports = server.exports();

