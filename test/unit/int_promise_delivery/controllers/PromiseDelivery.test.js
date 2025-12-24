'use strict';

/**
 * Unit Tests for Promise Delivery Controller
 * 
 * These tests verify the controller endpoints handle requests correctly.
 */

var assert = require('chai').assert;
var sinon = require('sinon');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('Promise Delivery Controller', function() {
    
    var mockServer;
    var mockRes;
    var mockReq;
    var mockNext;
    var mockHelper;
    var controller;
    var registeredRoutes;
    
    beforeEach(function() {
        registeredRoutes = {};
        
        // Mock the server module
        mockServer = {
            get: function(routeName, handler) {
                registeredRoutes[routeName] = handler;
            },
            exports: function() {
                return registeredRoutes;
            }
        };
        
        // Mock response object
        mockRes = {
            json: sinon.spy()
        };
        
        // Mock next function
        mockNext = sinon.spy();
        
        // Mock helper with default implementations
        mockHelper = {
            isValidZipCode: sinon.stub().returns(true),
            calculateDeliveryDate: sinon.stub().returns({
                transitDays: 5,
                formattedDate: 'January 20th',
                formattedDateFull: 'Monday, January 20th',
                displayMessage: 'Get it by January 20th'
            }),
            getDeliveryEstimatesForAllMethods: sinon.stub().returns([
                {
                    shippingMethodId: 'standard',
                    shippingMethodName: 'Standard Shipping',
                    price: 5.99,
                    transitDays: 5,
                    deliveryDate: 'January 20th',
                    displayMessage: 'Get it by January 20th'
                },
                {
                    shippingMethodId: 'express',
                    shippingMethodName: 'Express Shipping',
                    price: 12.99,
                    transitDays: 2,
                    deliveryDate: 'January 17th',
                    displayMessage: 'Get it by January 17th'
                },
                {
                    shippingMethodId: 'overnight',
                    shippingMethodName: 'Overnight',
                    price: 24.99,
                    transitDays: 1,
                    deliveryDate: 'January 15th',
                    displayMessage: 'Get it by January 15th'
                }
            ])
        };
        
        // Load controller with mocked dependencies
        controller = proxyquire('../../../../cartridges/int_promise_delivery/controllers/PromiseDelivery', {
            'server': mockServer,
            '*/cartridge/scripts/helpers/promiseDeliveryHelper': mockHelper
        });
    });
    
    afterEach(function() {
        sinon.restore();
    });
    
    describe('GetEstimate endpoint', function() {
        
        beforeEach(function() {
            mockReq = {
                querystring: {
                    zipCode: '90210',
                    shippingMethodId: 'standard'
                }
            };
        });
        
        it('should register GetEstimate route', function() {
            assert.property(registeredRoutes, 'GetEstimate');
            assert.isFunction(registeredRoutes.GetEstimate);
        });
        
        it('should return success response for valid ZIP code', function() {
            registeredRoutes.GetEstimate(mockReq, mockRes, mockNext);
            
            assert.isTrue(mockRes.json.calledOnce);
            
            var response = mockRes.json.firstCall.args[0];
            assert.isTrue(response.success);
            assert.equal(response.zipCode, '90210');
            assert.equal(response.shippingMethodId, 'standard');
            assert.equal(response.transitDays, 5);
            assert.equal(response.deliveryDate, 'January 20th');
        });
        
        it('should call next() after processing', function() {
            registeredRoutes.GetEstimate(mockReq, mockRes, mockNext);
            
            assert.isTrue(mockNext.calledOnce);
        });
        
        it('should return error for invalid ZIP code', function() {
            mockHelper.isValidZipCode.returns(false);
            
            registeredRoutes.GetEstimate(mockReq, mockRes, mockNext);
            
            var response = mockRes.json.firstCall.args[0];
            assert.isFalse(response.success);
            assert.equal(response.errorCode, 'INVALID_ZIP');
            assert.include(response.error, 'Invalid ZIP code');
        });
        
        it('should handle calculation errors gracefully', function() {
            mockHelper.calculateDeliveryDate.throws(new Error('Calculation failed'));
            
            registeredRoutes.GetEstimate(mockReq, mockRes, mockNext);
            
            var response = mockRes.json.firstCall.args[0];
            assert.isFalse(response.success);
            assert.equal(response.errorCode, 'CALCULATION_ERROR');
        });
        
        it('should default to standard shipping method if not provided', function() {
            mockReq.querystring.shippingMethodId = undefined;
            
            registeredRoutes.GetEstimate(mockReq, mockRes, mockNext);
            
            var response = mockRes.json.firstCall.args[0];
            assert.equal(response.shippingMethodId, 'standard');
        });
        
        it('should pass shippingMethodId to helper', function() {
            mockReq.querystring.shippingMethodId = 'overnight';
            
            registeredRoutes.GetEstimate(mockReq, mockRes, mockNext);
            
            assert.isTrue(mockHelper.calculateDeliveryDate.calledWith('90210', 'overnight'));
        });
    });
    
    describe('GetAllEstimates endpoint', function() {
        
        beforeEach(function() {
            mockReq = {
                querystring: {
                    zipCode: '90210'
                }
            };
        });
        
        it('should register GetAllEstimates route', function() {
            assert.property(registeredRoutes, 'GetAllEstimates');
            assert.isFunction(registeredRoutes.GetAllEstimates);
        });
        
        it('should return success response with all shipping methods', function() {
            registeredRoutes.GetAllEstimates(mockReq, mockRes, mockNext);
            
            assert.isTrue(mockRes.json.calledOnce);
            
            var response = mockRes.json.firstCall.args[0];
            assert.isTrue(response.success);
            assert.equal(response.zipCode, '90210');
            assert.isArray(response.shippingMethods);
            assert.lengthOf(response.shippingMethods, 3);
        });
        
        it('should call next() after processing', function() {
            registeredRoutes.GetAllEstimates(mockReq, mockRes, mockNext);
            
            assert.isTrue(mockNext.calledOnce);
        });
        
        it('should return error for invalid ZIP code', function() {
            mockHelper.isValidZipCode.returns(false);
            
            registeredRoutes.GetAllEstimates(mockReq, mockRes, mockNext);
            
            var response = mockRes.json.firstCall.args[0];
            assert.isFalse(response.success);
            assert.equal(response.errorCode, 'INVALID_ZIP');
        });
        
        it('should handle calculation errors gracefully', function() {
            mockHelper.getDeliveryEstimatesForAllMethods.throws(new Error('Calculation failed'));
            
            registeredRoutes.GetAllEstimates(mockReq, mockRes, mockNext);
            
            var response = mockRes.json.firstCall.args[0];
            assert.isFalse(response.success);
            assert.equal(response.errorCode, 'CALCULATION_ERROR');
        });
        
        it('should include all required fields in shipping method response', function() {
            registeredRoutes.GetAllEstimates(mockReq, mockRes, mockNext);
            
            var response = mockRes.json.firstCall.args[0];
            var method = response.shippingMethods[0];
            
            assert.property(method, 'shippingMethodId');
            assert.property(method, 'shippingMethodName');
            assert.property(method, 'price');
            assert.property(method, 'transitDays');
            assert.property(method, 'deliveryDate');
            assert.property(method, 'displayMessage');
        });
    });
});

