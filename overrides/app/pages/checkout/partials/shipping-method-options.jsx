/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import React, {useMemo} from 'react'
import {FormattedNumber, useIntl} from 'react-intl'
import {
    Box,
    Flex,
    Stack,
    Text,
    VStack,
    Radio,
    RadioGroup
} from '@salesforce/retail-react-app/app/components/shared/ui'
import {Controller} from 'react-hook-form'
import {useShippingMethodsForShipment} from '@salesforce/commerce-sdk-react'
import PropTypes from 'prop-types'
import LoadingSpinner from '@salesforce/retail-react-app/app/components/loading-spinner'
import {STORE_LOCATOR_IS_ENABLED} from '@salesforce/retail-react-app/app/constants'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'

// Import Promise Delivery utility for delivery date calculation
import {calculateDeliveryDate} from '../../../utils/promise-delivery'

/**
 * Get the shipping method ID that matches our delivery calculation
 * Maps SFCC shipping method IDs/names to our promise delivery calculation
 * @param {string} shippingMethodId - The shipping method ID (e.g., "001", "002")
 * @param {string} shippingMethodName - The shipping method name (e.g., "Ground", "2-Day Express")
 */
const getPromiseMethodId = (shippingMethodId, shippingMethodName = '') => {
    // Check both ID and name for matching
    const idLower = shippingMethodId?.toLowerCase() || ''
    const nameLower = shippingMethodName?.toLowerCase() || ''

    // Check for overnight shipping
    if (
        idLower.includes('overnight') ||
        idLower.includes('next-day') ||
        nameLower.includes('overnight') ||
        nameLower.includes('next-day') ||
        nameLower.includes('next day')
    ) {
        return 'overnight'
    }

    // Check for express/2-day shipping
    if (
        idLower.includes('express') ||
        idLower.includes('2-day') ||
        idLower.includes('two-day') ||
        nameLower.includes('express') ||
        nameLower.includes('2-day') ||
        nameLower.includes('two-day') ||
        nameLower.includes('2 day')
    ) {
        return 'express'
    }

    // Default to standard (ground, standard, etc.)
    return 'standard'
}

// Component to handle shipping options for a single shipment (without product cards)
const ShippingMethodOptions = ({shipment, basketId, currency, control}) => {
    const {formatMessage} = useIntl()
    const storeLocatorEnabled = getConfig()?.app?.storeLocatorEnabled ?? STORE_LOCATOR_IS_ENABLED
    const {data: shippingMethods, isLoading: isShippingMethodsLoading} =
        useShippingMethodsForShipment(
            {
                parameters: {
                    basketId: basketId,
                    shipmentId: shipment.shipmentId
                }
            },
            {
                enabled: Boolean(basketId && shipment.shipmentId && shipment.shippingAddress)
            }
        )

    // Get the destination ZIP code from the shipping address
    const destinationZip = shipment.shippingAddress?.postalCode

    // Calculate delivery dates for each shipping method
    const deliveryDates = useMemo(() => {
        if (!destinationZip) {
            console.log('[ShippingMethodOptions] No destinationZip, returning empty')
            return {}
        }

        console.log('[ShippingMethodOptions] Calculating dates for ZIP:', destinationZip)
        const dates = {}
        const methods = ['standard', 'express', 'overnight']

        methods.forEach((methodId) => {
            try {
                const result = calculateDeliveryDate(destinationZip, methodId)
                dates[methodId] = result.formattedDate
                console.log(`[ShippingMethodOptions] ${methodId}: ${result.formattedDate}`, result)
            } catch (e) {
                console.error(`[ShippingMethodOptions] Error for ${methodId}:`, e)
                dates[methodId] = null
            }
        })

        console.log('[ShippingMethodOptions] Final dates:', dates)
        return dates
    }, [destinationZip])

    if (!shipment.shippingAddress) {
        return null
    }

    const fieldName = `shippingMethodId_${shipment.shipmentId}`

    // Filter out pickup shipping methods only if store locator/BOPIS is enabled
    const applicableShippingMethods = storeLocatorEnabled
        ? shippingMethods?.applicableShippingMethods?.filter(
              (method) => !method.c_storePickupEnabled
          ) || []
        : shippingMethods?.applicableShippingMethods || []

    return (
        <VStack spacing={6} align="stretch">
            {/* Shipping Options Only */}
            <Box pt={2} pb={6} px={2}>
                {isShippingMethodsLoading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" py={8}>
                        <LoadingSpinner />
                    </Box>
                ) : (
                    applicableShippingMethods.length > 0 && (
                        <Box px={4}>
                            <Controller
                                name={fieldName}
                                control={control}
                                defaultValue=""
                                rules={{required: true}}
                                render={({field}) => (
                                    <RadioGroup
                                        {...field}
                                        name={`shipping-options-radiogroup-${shipment.shipmentId}`}
                                    >
                                        <Stack spacing={2}>
                                            {applicableShippingMethods.map((opt) => {
                                                // Get the promise method ID for this shipping option
                                                // Pass both ID and name for better matching
                                                const promiseMethodId = getPromiseMethodId(
                                                    opt.id,
                                                    opt.name
                                                )
                                                const deliveryDate = deliveryDates[promiseMethodId]

                                                // Debug: log the mapping
                                                console.log('[ShippingMethodOptions] Mapping:', {
                                                    optId: opt.id,
                                                    optName: opt.name,
                                                    promiseMethodId,
                                                    deliveryDate
                                                })

                                                return (
                                                    <Radio value={opt.id} key={opt.id}>
                                                        <Box w="full">
                                                            <Flex
                                                                justify="space-between"
                                                                w="full"
                                                                align="flex-start"
                                                            >
                                                                <Box flex={1}>
                                                                    <Text
                                                                        fontSize="sm"
                                                                        fontWeight="medium"
                                                                    >
                                                                        {opt.name}
                                                                    </Text>
                                                                    {/* Show delivery date estimate */}
                                                                    {deliveryDate &&
                                                                        destinationZip && (
                                                                            <Text
                                                                                fontSize="sm"
                                                                                color="green.600"
                                                                                fontWeight="semibold"
                                                                                mt={0.5}
                                                                            >
                                                                                📦 Get it by{' '}
                                                                                {deliveryDate}
                                                                            </Text>
                                                                        )}
                                                                    <Text
                                                                        fontSize="xs"
                                                                        color="gray.600"
                                                                        mt={0.5}
                                                                    >
                                                                        {opt.description}
                                                                    </Text>
                                                                </Box>
                                                                <Box
                                                                    fontWeight="bold"
                                                                    fontSize="sm"
                                                                    ml={2}
                                                                >
                                                                    {opt.price === 0 ? (
                                                                        <Text color="green.600">
                                                                            {formatMessage({
                                                                                defaultMessage:
                                                                                    'Free',
                                                                                id: 'shipping_options.free'
                                                                            })}
                                                                        </Text>
                                                                    ) : (
                                                                        <FormattedNumber
                                                                            value={opt.price}
                                                                            style="currency"
                                                                            currency={currency}
                                                                        />
                                                                    )}
                                                                </Box>
                                                            </Flex>
                                                            {opt.shippingPromotions &&
                                                                opt.shippingPromotions.length >
                                                                    0 && (
                                                                    <VStack
                                                                        spacing={0.5}
                                                                        mt={1}
                                                                        align="flex-start"
                                                                    >
                                                                        {opt.shippingPromotions.map(
                                                                            (promo) => (
                                                                                <Text
                                                                                    key={
                                                                                        promo.promotionId
                                                                                    }
                                                                                    fontSize="xs"
                                                                                    color="green.600"
                                                                                >
                                                                                    {
                                                                                        promo.calloutMsg
                                                                                    }
                                                                                </Text>
                                                                            )
                                                                        )}
                                                                    </VStack>
                                                                )}
                                                        </Box>
                                                    </Radio>
                                                )
                                            })}
                                        </Stack>
                                    </RadioGroup>
                                )}
                            />
                        </Box>
                    )
                )}
            </Box>
        </VStack>
    )
}

ShippingMethodOptions.propTypes = {
    shipment: PropTypes.shape({
        shipmentId: PropTypes.string.isRequired,
        shippingAddress: PropTypes.shape({
            firstName: PropTypes.string,
            lastName: PropTypes.string,
            address1: PropTypes.string,
            city: PropTypes.string,
            stateCode: PropTypes.string,
            postalCode: PropTypes.string
        }),
        shippingMethod: PropTypes.shape({
            id: PropTypes.string
        })
    }).isRequired,
    basketId: PropTypes.string.isRequired,
    currency: PropTypes.string.isRequired,
    control: PropTypes.object.isRequired
}

export default ShippingMethodOptions
