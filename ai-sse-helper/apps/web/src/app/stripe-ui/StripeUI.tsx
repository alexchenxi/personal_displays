"use client"
import "@ant-design/v5-patch-for-react-19"
import {
  Button,
  Card,
  Typography,
  message,
  Input,
  Row,
  InputNumber,
  Select,
  Flex,
  Space,
  Radio,
  Col,
  Switch,
} from "antd"
import type { InputNumberProps } from "antd"
import {
  confirmPaymentIntentWithConfirmationToken,
  createPaymentIntentWithConfirmationToken,
  createSession,
  listPaymentMethodConfigurations,
} from "../api"
import countryCurrencyMap from "../../resources/country-currency.json"
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"
import { loadStripe, StripeElementsOptions, Stripe } from "@stripe/stripe-js"
import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import GlobalLoading from "@/components/GlobalLoading"

const { Title } = Typography

// Dynamically build country list from all JSON files under /stripe/country-specs/
interface WebpackRequireContext {
  keys(): string[]
}
declare const require: {
  context(dir: string, deep: boolean, filter: RegExp): WebpackRequireContext
}
const countrySpecsContext = require.context(
  "../../resources/country-specs",
  false,
  /\.json$/,
)

const COUNTRY_LIST = countrySpecsContext
  .keys()
  .map((key: string) => {
    const code = key.replace("./", "").replace(".json", "")
    return { value: code, label: code }
  })
  .sort((a: { value: string }, b: { value: string }) =>
    a.value.localeCompare(b.value),
  )

interface OptionType {
  value: string
  label: string
}

interface StripeUIProps {
  pmTypeOptions: OptionType[]
}

import type { MessageInstance } from "antd/es/message/interface"

interface FormContainerProps {
  notify: MessageInstance
  setIsProcessing: (processing: boolean) => void
  customerId: string
  amount: number
  currency: string
  setCustomerSessionClientSecret: (clientSecret: string | null) => void
  paymentMethodSelectionMode: string
  selectedConfigId: string
  selectedPmTypes: string[]
  isUseSDK: boolean
}

const FormContainer = ({
  notify,
  setIsProcessing,
  setCustomerSessionClientSecret,
  currency,
  amount,
  customerId,
  paymentMethodSelectionMode,
  selectedPmTypes,
  isUseSDK,
  selectedConfigId,
}: FormContainerProps) => {
  const elements = useElements()
  const stripe = useStripe()
  const handleConfirm = async () => {
    if (!stripe || !elements) {
      notify.error("Payment system is not ready. Please refresh.")
      return
    }

    try {
      setIsProcessing(true)
      // step1, submit the payment element to validate the input
      const { error: submitError } = await elements.submit()

      if (submitError) {
        notify.error(submitError.message || "Invalid payment details")
        setIsProcessing(false)
        return
      }

      // step2, create a confirmation token
      const { error, confirmationToken } = await stripe.createConfirmationToken(
        {
          elements,
        },
      )

      if (error) {
        notify.error(error.message || "Failed to create confirmation token")
        setIsProcessing(false)
        return
      }

      if (confirmationToken) {
        // step3, create a payment intent with the confirmation token
        const { paymentIntentsId, error: createError } =
          await createPaymentIntentWithConfirmationToken(
            selectedConfigId,
            currency,
            amount,
            customerId,
            paymentMethodSelectionMode === "explicit",
            selectedPmTypes || "",
            isUseSDK,
          )
        if (createError) {
          notify.error(
            createError.raw?.message || "Create Payment Intent failed",
          )
          return
        }

        const {
          clientSecret,
          status,
          error: confirmError,
        } = await confirmPaymentIntentWithConfirmationToken(
          confirmationToken.id,
          paymentIntentsId,
          isUseSDK,
        )
        if (confirmError) {
          notify.error(
            confirmError.raw?.message || "Confirm Payment Intent failed",
          )
          return
        }
        switch (status) {
          case "succeeded":
            notify.success("Payment successful")
            break
          case "requires_action":
            if (!clientSecret) {
              notify.error("Missing client secret for next action")
              break
            }
            const { error: confirmError, paymentIntent } =
              await stripe.handleNextAction({ clientSecret })

            if (confirmError) {
              notify.error(confirmError.message || "Action required failed")
            } else {
              // After handling action, check the final status
              if (paymentIntent?.status === "succeeded") {
                notify.success("Payment successful after action")
              } else {
                notify.warning(
                  `Payment status: ${paymentIntent?.status || "unknown"}`,
                )
              }
            }
            break

          default:
            console.error("Unexpected payment status:", status)
            notify.warning(`Something went wrong. Status: ${status}`)
            break
        }
      }
    } catch (err) {
      console.error(err)
      notify.error(
        err instanceof Error ? err.message : "An unexpected error occurred",
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePaymentElementError = (e: { error?: { message?: string } }) => {
    // Resetting session secret on error might be aggressive depending on business logic,
    // but keeping original behavior.
    setCustomerSessionClientSecret(null)
    notify.error(e.error?.message || "Payment Element error")
  }

  return (
    <>
      <Title level={4}>Collect a Payment Method</Title>
      <PaymentElement onLoadError={handlePaymentElementError} />
      <Row align="middle" className="mt-4">
        <Col span={8}>
          <Button
            type="primary"
            onClick={handleConfirm}
            disabled={!stripe || !elements}
          >
            Confirm Payment
          </Button>
        </Col>
      </Row>
    </>
  )
}

export default function StripeUI({ pmTypeOptions }: StripeUIProps) {
  // --- State ---
  const [customerId, setCustomerId] = useState(
    process.env["NEXT_PUBLIC_TEST_CUSTOMER_ID"] || "",
  )
  const [country, setCountry] = useState<string>("US")
  const [currency, setCurrency] = useState<string>("")
  const [amount, setAmount] = useState<number>(10000)
  const [currencyList, setCurrencyList] = useState<OptionType[]>([])
  const [customerSessionClientSecret, setCustomerSessionClientSecret] =
    useState<string | null>(null)

  // Payment method selection mode: dynamic = use a payment method configuration, explicit = raw payment method types
  const [paymentMethodSelectionMode, setPaymentMethodSelectionMode] = useState<
    "dynamic" | "explicit"
  >("dynamic")

  // List of payment method configurations fetched from Stripe (for dynamic mode)
  const [pmConfigs, setPmConfigs] = useState<OptionType[]>([])
  const [selectedConfigId, setSelectedConfigId] = useState<string>("")
  const [configsLoading, setConfigsLoading] = useState(false)

  // Explicit mode: user selection from static PM_TYPE_OPTIONS
  const [selectedPmTypes, setSelectedPmTypes] = useState<string[]>([])

  const [stripePromise, setStripePromise] =
    useState<Promise<Stripe | null> | null>(null)
  const [stripeReady, setStripeReady] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [useStripeSDK, setUseStripeSDK] = useState(true)

  const [messageApi, contextHolder] = message.useMessage()
  const isMountedRef = useRef(true)

  const loadCurrencyForCountry = useCallback(
    (countryCode: string) => {
      // Safe access to the map
      const currencyCode = (countryCurrencyMap as Record<string, string>)[
        countryCode
      ]

      if (currencyCode) {
        const formattedCurrency = currencyCode.toLowerCase()
        setCurrencyList([
          { value: formattedCurrency, label: currencyCode.toUpperCase() },
        ])
        setCurrency(formattedCurrency)
      } else {
        setCurrencyList([])
        setCurrency("")
        messageApi.warning("No currency found for this country")
      }
    },
    [messageApi],
  )

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Initialize Stripe on mount
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_API_KEY
    if (!apiKey) {
      messageApi.error("Configuration Error: Missing Stripe API Key")
      return
    }
    const promise = loadStripe(apiKey)
    Promise.resolve().then(() => setStripePromise(promise))
    promise.then((stripe) => {
      if (!isMountedRef.current) return
      if (!stripe) {
        messageApi.error("Failed to initialize Stripe")
        return
      }
      setStripeReady(true)
      loadCurrencyForCountry("US")
    })
  }, [])

  // --- Helpers ---

  const fetchPmConfigs = useCallback(async () => {
    setConfigsLoading(true)
    setPmConfigs([])
    setSelectedConfigId("")
    try {
      const response = await listPaymentMethodConfigurations()
      if (!isMountedRef.current) return

      if (response.error) {
        throw new Error(response.error.raw?.message || response.error.code)
      }

      // The endpoint returns { configurations: [{id, name}, ...] }
      const list: Array<{ id: string; name: string }> =
        response.configurations ?? []
      const options: OptionType[] = list.map((c) => ({
        value: c.id,
        label: c.name ? `${c.name} (${c.id})` : c.id,
      }))
      setPmConfigs(options)
      if (options.length > 0) setSelectedConfigId(options[0].value)
    } catch (err) {
      if (!isMountedRef.current) return
      console.error(err)
      messageApi.error("Failed to load payment method configurations")
    } finally {
      if (isMountedRef.current) setConfigsLoading(false)
    }
  }, [messageApi])

  const handleCountryChange = (value: string) => {
    setCountry(value)
    setCustomerSessionClientSecret(null)
    loadCurrencyForCountry(value)
  }

  const handlePaymentMethodSelectionModeChange = (
    value: "dynamic" | "explicit",
  ) => {
    setPaymentMethodSelectionMode(value)
    setCustomerSessionClientSecret(null)
    setSelectedPmTypes([])
    if (value === "dynamic") {
      fetchPmConfigs()
    }
  }

  const handleInitializeSession = async () => {
    setIsProcessing(true)
    setCustomerSessionClientSecret(null)

    try {
      const response = await createSession(customerId)
      if (!isMountedRef.current) return

      if (response.error) {
        throw new Error(response.error.raw?.message || response.error.code)
      }

      if (response.customer_session_client_secret) {
        setCustomerSessionClientSecret(response.customer_session_client_secret)
      } else {
        throw new Error("No customer session secret returned")
      }
    } catch (err) {
      if (!isMountedRef.current) return
      console.error(err)
      messageApi.error(
        err instanceof Error ? err.message : "Failed to initialize session",
      )
    } finally {
      if (isMountedRef.current) setIsProcessing(false)
    }
  }

  const onChangeAmount: InputNumberProps["onChange"] = (value) => {
    if (value !== null && value !== undefined) {
      // Ensure integer for Stripe amount (smallest currency unit)
      setAmount(Math.floor(Number(value)))
    }
  }

  // --- Computed ---

  const isReadyToInitialize = useMemo(
    () =>
      stripeReady &&
      !!customerId.trim() &&
      !!currency &&
      amount > 0 &&
      (paymentMethodSelectionMode === "dynamic"
        ? !!selectedConfigId
        : selectedPmTypes.length > 0),
    [
      stripeReady,
      customerId,
      currency,
      amount,
      paymentMethodSelectionMode,
      selectedConfigId,
      selectedPmTypes,
    ],
  )

  const elementsOptions: StripeElementsOptions = useMemo(() => {
    if (!customerSessionClientSecret) return {}

    const opts: StripeElementsOptions & {
      paymentMethodConfiguration?: string
      paymentMethodTypes?: string[]
    } = {
      customerSessionClientSecret: customerSessionClientSecret,
      currency,
      amount,
      mode: "payment",
    }

    if (paymentMethodSelectionMode === "dynamic" && selectedConfigId) {
      opts.paymentMethodConfiguration = selectedConfigId
    }

    if (
      paymentMethodSelectionMode === "explicit" &&
      selectedPmTypes.length > 0
    ) {
      opts.paymentMethodTypes = selectedPmTypes
    }

    return opts
  }, [
    customerSessionClientSecret,
    currency,
    amount,
    paymentMethodSelectionMode,
    selectedConfigId,
    selectedPmTypes,
  ])

  // --- Render ---

  return (
    <>
      {isProcessing && <GlobalLoading />}
      <div
        className="min-h-screen"
        style={{
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        }}
      >
        <div className="mx-auto max-w-6xl px-4 py-8">
          {contextHolder}
          <Title
            level={2}
            style={{
              textAlign: "center",
              marginBottom: 32,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Stripe Payment Demo
          </Title>

          {/* Configuration Panel */}
          <Card
            style={{
              borderRadius: 12,
              boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
              marginBottom: 24,
            }}
          >
            <Row gutter={[16, 16]} align="middle">
              {/* Customer ID */}
              <Col xs={24} sm={12} md={6}>
                <div
                  style={{ marginBottom: 4, fontWeight: 500, color: "#555" }}
                >
                  Customer
                </div>
                <Input
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value)
                    setCustomerSessionClientSecret(null)
                  }}
                  placeholder="cus_xxx"
                  disabled={isProcessing}
                />
              </Col>

              {/* Country */}
              <Col xs={12} sm={6} md={4}>
                <div
                  style={{ marginBottom: 4, fontWeight: 500, color: "#555" }}
                >
                  Country / Region
                </div>
                <Select
                  showSearch
                  value={country}
                  style={{ width: "100%" }}
                  onChange={handleCountryChange}
                  options={COUNTRY_LIST}
                  placeholder="Select"
                  disabled={isProcessing}
                  filterOption={(input, option) =>
                    (option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                />
              </Col>

              {/* Currency */}
              <Col xs={12} sm={6} md={3}>
                <div
                  style={{ marginBottom: 4, fontWeight: 500, color: "#555" }}
                >
                  Currency
                </div>
                <Select
                  showSearch
                  value={currency || undefined}
                  style={{ width: "100%" }}
                  onChange={(val) => {
                    setCurrency(val)
                    setCustomerSessionClientSecret(null)
                  }}
                  options={currencyList}
                  placeholder="Select"
                  disabled={isProcessing || !country}
                />
              </Col>

              {/* Amount */}
              <Col xs={24} sm={12} md={5}>
                <div
                  style={{ marginBottom: 4, fontWeight: 500, color: "#555" }}
                >
                  Amount
                </div>
                <InputNumber
                  style={{ width: "100%" }}
                  value={amount}
                  onChange={onChangeAmount}
                  min={1}
                  step={1}
                  disabled={isProcessing}
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(value) => Number(value?.replace(/\$\s?|(,*)/g, ""))}
                />
              </Col>
            </Row>
          </Card>

          {/* Payment method mode selection */}
          <Card
            style={{
              borderRadius: 12,
              boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
              marginBottom: 24,
            }}
          >
            <Space direction="vertical" size={12}>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#333" }}>
                Payment Method Configuration
              </div>
              <Row gutter={[24, 12]} align="middle">
                <Col>
                  <span style={{ marginRight: 12, color: "#555" }}>Mode:</span>
                  <Radio.Group
                    value={paymentMethodSelectionMode}
                    onChange={(e) =>
                      handlePaymentMethodSelectionModeChange(e.target.value)
                    }
                    disabled={isProcessing}
                  >
                    <Radio value="dynamic">Dynamic</Radio>
                    <Radio value="explicit">Explicit</Radio>
                  </Radio.Group>
                </Col>
                <Col>
                  <Space>
                    <span style={{ color: "#555" }}>Use Stripe SDK:</span>
                    <Switch
                      checked={useStripeSDK}
                      onChange={() => setUseStripeSDK((prev) => !prev)}
                    />
                  </Space>
                </Col>
              </Row>

              {/* Dynamic: show dropdown of Stripe payment method configurations */}
              {paymentMethodSelectionMode === "dynamic" && (
                <Flex align="center" gap={12} wrap="wrap">
                  <div>
                    <div
                      style={{
                        marginBottom: 4,
                        fontWeight: 500,
                        color: "#555",
                      }}
                    >
                      Configuration
                    </div>
                    <Select
                      style={{ width: 360 }}
                      value={selectedConfigId || undefined}
                      onChange={(val) => {
                        setSelectedConfigId(val)
                        setCustomerSessionClientSecret(null)
                      }}
                      options={pmConfigs}
                      loading={configsLoading}
                      placeholder={
                        configsLoading
                          ? "Loading configurations..."
                          : pmConfigs.length === 0
                            ? "Click to load configurations"
                            : "Select a configuration"
                      }
                      disabled={isProcessing}
                      onOpenChange={(open) => {
                        if (open && pmConfigs.length === 0 && !configsLoading) {
                          fetchPmConfigs()
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={fetchPmConfigs}
                    loading={configsLoading}
                    disabled={isProcessing}
                    style={{ marginTop: 22 }}
                  >
                    Refresh
                  </Button>
                </Flex>
              )}

              {/* Explicit: multi-select from static SDK-derived payment method types */}
              {paymentMethodSelectionMode === "explicit" && (
                <div>
                  <div
                    style={{ marginBottom: 4, fontWeight: 500, color: "#555" }}
                  >
                    Payment Types
                  </div>
                  <Select
                    mode="multiple"
                    showSearch
                    style={{ width: "100%", maxWidth: 600 }}
                    value={selectedPmTypes}
                    onChange={(val) => {
                      setSelectedPmTypes(val)
                      setCustomerSessionClientSecret(null)
                    }}
                    options={pmTypeOptions}
                    placeholder="Select payment types"
                    disabled={isProcessing}
                  />
                </div>
              )}
            </Space>
          </Card>

          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <Button
              type="primary"
              size="large"
              disabled={!isReadyToInitialize}
              onClick={handleInitializeSession}
              loading={isProcessing}
            >
              Initialize Session
            </Button>
          </div>

          {/* Payment Element — rendered only after customer session is ready */}
          {customerSessionClientSecret && stripePromise && (
            <Card
              style={{
                borderRadius: 12,
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
              }}
            >
              <Elements stripe={stripePromise} options={elementsOptions}>
                <FormContainer
                  setCustomerSessionClientSecret={
                    setCustomerSessionClientSecret
                  }
                  notify={messageApi}
                  setIsProcessing={setIsProcessing}
                  amount={amount}
                  customerId={customerId}
                  currency={currency}
                  paymentMethodSelectionMode={paymentMethodSelectionMode}
                  selectedPmTypes={selectedPmTypes}
                  isUseSDK={useStripeSDK}
                  selectedConfigId={selectedConfigId}
                />
              </Elements>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
