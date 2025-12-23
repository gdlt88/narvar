/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import React, {useEffect} from 'react'
import {FormattedMessage, FormattedNumber, useIntl} from 'react-intl'
import {
    Box,
    Button,
    Container,
    Flex,
    Stack,
    Text,
    VStack
} from '@salesforce/retail-react-app/app/components/shared/ui'
import {useForm} from 'react-hook-form'
import {useCheckout} from '@salesforce/retail-react-app/app/pages/checkout/util/checkout-context'
import {
    ToggleCard,
    ToggleCardEdit,
    ToggleCardSummary
} from '@salesforce/retail-react-app/app/components/toggle-card'
import {
    useShippingMethodsForShipment,
    useShopperBasketsMutation
} from '@salesforce/commerce-sdk-react'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import {useCurrency} from '@salesforce/retail-react-app/app/hooks'
import {isPickupShipment} from '@salesforce/retail-react-app/app/utils/shipment-utils'
import LoadingSpinner from '@salesforce/retail-react-app/app/components/loading-spinner'
import PropTypes from 'prop-types'

import ShippingProductCards from '@salesforce/retail-react-app/app/pages/checkout/partials/shipping-product-cards'
// Use the overridden ShippingMethodOptions with delivery dates
import ShippingMethodOptions from './shipping-method-options'

// Import Promise Delivery utility for storing selected delivery date
import {calculateDeliveryDate} from '../../../utils/promise-delivery'

/**
 * Get the shipping method ID that matches our delivery calculation
 * @param {string} shippingMethodId - The shipping method ID (e.g., "001", "002")
 * @param {string} shippingMethodName - The shipping method name (e.g., "Ground", "2-Day Express")
 */
const getPromiseMethodId = (shippingMethodId, shippingMethodName = '') => {
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

    // Default to standard
    return 'standard'
}

// Component to handle combined product cards and shipping options for multiship
const MultiAddressShipmentMethod = ({shipment, basketId, currency, control, basket}) => {
    const {formatMessage} = useIntl()

    if (!shipment.shippingAddress) {
        return null
    }

    return (
        <VStack spacing={6} align="stretch">
            {/* Delivery Address */}
            <Box>
                <Text fontWeight="bold" fontSize="md" mb={1}>
                    {formatMessage(
                        {
                            defaultMessage: 'Shipping to {name}',
                            id: 'shipping_options.label.shipping_to'
                        },
                        {
                            name: `${shipment.shippingAddress.firstName} ${shipment.shippingAddress.lastName}`
                        }
                    )}
                </Text>
                <Text fontSize="sm" color="gray.600">
                    {shipment.shippingAddress.address1}, {shipment.shippingAddress.city},{' '}
                    {shipment.shippingAddress.stateCode} {shipment.shippingAddress.postalCode}
                </Text>
            </Box>

            {/* Combined Product Cards and Shipping Options */}
            <Box
                border="1px solid"
                borderColor="gray.200"
                borderRadius="lg"
                pt={2}
                pb={4}
                px={2}
                bg="white"
            >
                <VStack spacing={4} align="stretch">
                    {/* Product Cards */}
                    <ShippingProductCards shipment={shipment} basket={basket} />

                    {/* Shipping Options */}
                    <ShippingMethodOptions
                        shipment={shipment}
                        basketId={basketId}
                        currency={currency}
                        control={control}
                    />
                </VStack>
            </Box>
        </VStack>
    )
}

MultiAddressShipmentMethod.propTypes = {
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
    control: PropTypes.object.isRequired,
    basket: PropTypes.shape({
        productItems: PropTypes.arrayOf(
            PropTypes.shape({
                itemId: PropTypes.string.isRequired,
                shipmentId: PropTypes.string,
                productName: PropTypes.string,
                image: PropTypes.string,
                imageUrl: PropTypes.string,
                primaryImage: PropTypes.string,
                images: PropTypes.array,
                quantity: PropTypes.number,
                variationValues: PropTypes.object,
                variations: PropTypes.object
            })
        )
    }).isRequired
}

export default function ShippingMethods() {
    const {formatMessage} = useIntl()
    const {step, STEPS, goToStep, goToNextStep} = useCheckout()
    const {
        data: basket,
        derivedData: {totalShippingCost},
        isLoading: isBasketLoading
    } = useCurrentBasket()
    const {currency} = useCurrency()
    const updateShippingMethod = useShopperBasketsMutation('updateShippingMethodForShipment')

    // Hook for shipping methods for the main shipment - we'll use this as a fallback
    const {data: shippingMethods} = useShippingMethodsForShipment(
        {
            parameters: {
                basketId: basket?.basketId,
                shipmentId: 'me'
            }
        },
        {
            enabled: Boolean(basket?.basketId) && step === STEPS.SHIPPING_OPTIONS
        }
    )

    const deliveryShipments =
        (basket &&
            basket.shipments &&
            basket.shipments.filter(
                (shipment) => shipment.shippingAddress && !isPickupShipment(shipment)
            )) ||
        []

    const hasMultipleDeliveryShipments = deliveryShipments.length > 1

    // Build initial form values
    const getInitialValues = () => {
        const values = {}
        deliveryShipments.forEach((shipment) => {
            values[`shippingMethodId_${shipment.shipmentId}`] =
                (shipment.shippingMethod && shipment.shippingMethod.id) ||
                shippingMethods?.defaultShippingMethodId ||
                ''
        })
        return values
    }

    const form = useForm({
        mode: 'onChange',
        defaultValues: getInitialValues()
    })

    // Update form when shipments change
    useEffect(() => {
        const currentValues = form.getValues()
        const newDefaults = getInitialValues()

        // Only reset if there are new fields or values have not been set yet
        const hasNewFields = Object.keys(newDefaults).some(
            (key) => !(key in currentValues) || currentValues[key] === ''
        )
        if (hasNewFields) {
            form.reset(newDefaults)
            deliveryShipments.forEach(async (shipment) => {
                const methodId = newDefaults[`shippingMethodId_${shipment.shipmentId}`]
                const hasMethodInBasket = shipment.shippingMethod && shipment.shippingMethod.id

                // auto-submit if;
                // - default method to submit present
                // - the shipment doesn't already have a method in basket
                // - user hasn't manually selected
                if (
                    methodId &&
                    !hasMethodInBasket &&
                    methodId === shippingMethods?.defaultShippingMethodId
                ) {
                    try {
                        await updateShippingMethod.mutateAsync({
                            parameters: {
                                basketId: basket.basketId,
                                shipmentId: shipment.shipmentId
                            },
                            body: {
                                id: methodId
                            }
                        })
                    } catch (error) {
                        console.warn(error)
                    }
                }
            })
        }
    }, [deliveryShipments.length, shippingMethods?.defaultShippingMethodId])

    const submitForm = async (formData) => {
        // Submit shipping method for each shipment and calculate delivery dates
        const promises = deliveryShipments.map(async (shipment) => {
            const methodId = formData[`shippingMethodId_${shipment.shipmentId}`]
            if (methodId) {
                await updateShippingMethod.mutateAsync({
                    parameters: {
                        basketId: basket.basketId,
                        shipmentId: shipment.shipmentId
                    },
                    body: {
                        id: methodId
                    }
                })
            }
        })

        await Promise.all(promises)

        // Calculate and store the selected delivery date as a custom attribute on the basket
        // This will be transferred to the order when it's placed
        try {
            // Get the first delivery shipment's details for the promise date
            const primaryShipment = deliveryShipments[0]
            if (primaryShipment?.shippingAddress?.postalCode) {
                const selectedMethodId = formData[`shippingMethodId_${primaryShipment.shipmentId}`]
                const promiseMethodId = getPromiseMethodId(selectedMethodId)
                const deliveryResult = calculateDeliveryDate(
                    primaryShipment.shippingAddress.postalCode,
                    promiseMethodId
                )

                // Store the selected delivery date in localStorage for reference
                // (basket custom attributes require OCAPI/SCAPI configuration)
                if (typeof window !== 'undefined') {
                    localStorage.setItem(
                        'customerSelectedDeliveryDate',
                        deliveryResult.formattedDateFull
                    )
                    localStorage.setItem(
                        'customerSelectedDeliveryDateISO',
                        deliveryResult.deliveryDate.toISOString()
                    )
                }

                // Note: To store on the order, you would need to:
                // 1. Configure a custom attribute 'c_customerSelectedDeliveryDate' on the Order object in Business Manager
                // 2. Use updateBasket to set a custom attribute on the basket (if supported)
                // 3. Or use a hook/job to transfer this from session to order
                console.log(
                    '[Promise Delivery] Selected delivery date:',
                    deliveryResult.formattedDateFull
                )
            }
        } catch (error) {
            console.warn('[Promise Delivery] Error storing delivery date:', error)
        }

        goToNextStep()
    }

    // Calculate total shipping info
    const freeLabel = formatMessage({
        defaultMessage: 'Free',
        id: 'checkout_confirmation.label.free'
    })

    // Check if all shipments have valid shipping info
    const hasValidShippingInfo =
        deliveryShipments.length > 0 && deliveryShipments.every((s) => s.shippingAddress)

    const isFormValid =
        form.formState.isValid ||
        deliveryShipments.every((s) => s.shippingMethod && s.shippingMethod.id)

    // Show loading spinner if basket is loading
    if (isBasketLoading) {
        return (
            <ToggleCard
                id="step-2"
                title={formatMessage({
                    defaultMessage: 'Shipping & Gift Options',
                    id: 'shipping_options.title.shipping_gift_options'
                })}
                editing={step === STEPS.SHIPPING_OPTIONS}
                isLoading={true}
                disabled={true}
                onEdit={() => goToStep(STEPS.SHIPPING_OPTIONS)}
                editLabel={formatMessage({
                    defaultMessage: 'Edit Shipping Options',
                    id: 'toggle_card.action.editShippingOptions'
                })}
            >
                <ToggleCardEdit>
                    <Box display="flex" justifyContent="center" alignItems="center" minH="200px">
                        <LoadingSpinner />
                    </Box>
                </ToggleCardEdit>
            </ToggleCard>
        )
    }

    return (
        <ToggleCard
            id="step-2"
            title={formatMessage({
                defaultMessage: 'Shipping & Gift Options',
                id: 'shipping_options.title.shipping_gift_options'
            })}
            editing={step === STEPS.SHIPPING_OPTIONS}
            isLoading={form.formState.isSubmitting}
            disabled={!hasValidShippingInfo}
            onEdit={() => goToStep(STEPS.SHIPPING_OPTIONS)}
            editLabel={formatMessage({
                defaultMessage: 'Edit Shipping Options',
                id: 'toggle_card.action.editShippingOptions'
            })}
        >
            <ToggleCardEdit>
                <form
                    onSubmit={form.handleSubmit(submitForm)}
                    data-testid="sf-checkout-shipping-options-form"
                >
                    <Stack spacing={6}>
                        {/* Dynamically create shipping method options for each shipment */}
                        {deliveryShipments.map((shipment) => (
                            <Box key={shipment.shipmentId}>
                                {hasMultipleDeliveryShipments ? (
                                    // Multiship: Show both product cards and shipping options
                                    <MultiAddressShipmentMethod
                                        shipment={shipment}
                                        basketId={basket.basketId}
                                        currency={currency}
                                        control={form.control}
                                        basket={basket}
                                    />
                                ) : (
                                    // Single ship: Show only shipping options
                                    <ShippingMethodOptions
                                        shipment={shipment}
                                        basketId={basket.basketId}
                                        currency={currency}
                                        control={form.control}
                                    />
                                )}
                            </Box>
                        ))}

                        <Box>
                            <Container variant="form">
                                <Button w="full" type="submit" isDisabled={!isFormValid}>
                                    <FormattedMessage
                                        defaultMessage="Continue to Payment"
                                        id="shipping_options.button.continue_to_payment"
                                    />
                                </Button>
                            </Container>
                        </Box>
                    </Stack>
                </form>
            </ToggleCardEdit>

            {hasValidShippingInfo && (
                <ToggleCardSummary>
                    {deliveryShipments.length === 1 ? (
                        // Single shipment summary
                        <Box>
                            {deliveryShipments[0].shippingMethod && (
                                <>
                                    <Flex justify="space-between" w="full">
                                        <Text>{deliveryShipments[0].shippingMethod.name}</Text>
                                        <Text fontWeight="bold">
                                            {totalShippingCost === 0 ? (
                                                freeLabel
                                            ) : (
                                                <FormattedNumber
                                                    value={totalShippingCost}
                                                    style="currency"
                                                    currency={currency}
                                                />
                                            )}
                                        </Text>
                                    </Flex>
                                    <Text fontSize="sm" color="gray.700">
                                        {deliveryShipments[0].shippingMethod.description}
                                    </Text>
                                    {/* Show selected delivery date in summary */}
                                    {deliveryShipments[0].shippingAddress?.postalCode && (
                                        <Text
                                            fontSize="sm"
                                            color="green.600"
                                            fontWeight="semibold"
                                            mt={1}
                                        >
                                            📦 Get it by{' '}
                                            {
                                                calculateDeliveryDate(
                                                    deliveryShipments[0].shippingAddress.postalCode,
                                                    getPromiseMethodId(
                                                        deliveryShipments[0].shippingMethod.id
                                                    )
                                                ).formattedDate
                                            }
                                        </Text>
                                    )}
                                </>
                            )}
                        </Box>
                    ) : (
                        // Multiple shipments summary
                        <Stack spacing={2}>
                            {deliveryShipments.map((shipment) => {
                                const itemCost = shipment.shippingTotal || 0
                                return (
                                    <Box key={shipment.shipmentId}>
                                        <Flex justify="space-between" w="full">
                                            <Box flex="1">
                                                {shipment.shippingMethod ? (
                                                    <>
                                                        <Text mt={2}>
                                                            {shipment.shippingMethod.name}
                                                        </Text>
                                                        <Text fontSize="sm" color="gray.700">
                                                            {shipment.shippingMethod.description}
                                                        </Text>
                                                        {/* Show delivery date per shipment */}
                                                        {shipment.shippingAddress?.postalCode && (
                                                            <Text
                                                                fontSize="sm"
                                                                color="green.600"
                                                                fontWeight="semibold"
                                                                mt={0.5}
                                                            >
                                                                📦 Get it by{' '}
                                                                {
                                                                    calculateDeliveryDate(
                                                                        shipment.shippingAddress
                                                                            .postalCode,
                                                                        getPromiseMethodId(
                                                                            shipment.shippingMethod
                                                                                .id
                                                                        )
                                                                    ).formattedDate
                                                                }
                                                            </Text>
                                                        )}
                                                    </>
                                                ) : (
                                                    <Text mt={2} fontSize="sm" color="gray.500">
                                                        {formatMessage({
                                                            defaultMessage:
                                                                'No shipping method selected',
                                                            id: 'shipping_options.label.no_method_selected'
                                                        })}
                                                    </Text>
                                                )}
                                            </Box>
                                            <Text fontWeight="bold" fontSize="sm">
                                                {itemCost === 0 ? (
                                                    freeLabel
                                                ) : (
                                                    <FormattedNumber
                                                        value={itemCost}
                                                        style="currency"
                                                        currency={currency}
                                                    />
                                                )}
                                            </Text>
                                        </Flex>
                                    </Box>
                                )
                            })}
                            {deliveryShipments.length > 1 && (
                                <Box borderTopWidth="1px" pt={2} mt={2}>
                                    <Flex justify="space-between" w="full">
                                        <Text fontWeight="semibold">
                                            {formatMessage({
                                                defaultMessage: 'Total Shipping',
                                                id: 'shipping_options.label.total_shipping'
                                            })}
                                        </Text>
                                        <Text fontWeight="bold">
                                            <FormattedNumber
                                                value={totalShippingCost}
                                                style="currency"
                                                currency={currency}
                                            />
                                        </Text>
                                    </Flex>
                                </Box>
                            )}
                        </Stack>
                    )}
                </ToggleCardSummary>
            )}
        </ToggleCard>
    )
}
