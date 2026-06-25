"use client";
import "@ant-design/v5-patch-for-react-19";
import { Button, Card, Typography, message, Alert, Spin } from "antd";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, Stripe, StripeElementsOptions } from "@stripe/stripe-js";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import GlobalLoading from "@/components/GlobalLoading";
import BackToHome from "@/components/BackToHome";
import { createSession, listPaymentMethodConfigurations } from "../api";
import StripeConfigPanel from "@/components/stripe/StripeConfigPanel";
import PaymentForm from "@/components/stripe/PaymentForm";
import { getCurrencyForCountry } from "@/components/stripe/constants";
import type {
  OptionType,
  StripePaymentState,
} from "@/components/stripe/constants";

const { Title } = Typography;

// Dynamically build country list from all JSON files under resources/country-specs/
interface WebpackRequireContext {
  keys(): string[];
}
declare const require: {
  context(dir: string, deep: boolean, filter: RegExp): WebpackRequireContext;
};
const countrySpecsContext = require.context(
  "../../resources/country-specs",
  false,
  /\.json$/,
);

const COUNTRY_LIST = countrySpecsContext
  .keys()
  .map((key: string) => {
    const code = key.replace("./", "").replace(".json", "");
    return { value: code, label: code };
  })
  .sort((a, b) => a.value.localeCompare(b.value));

interface StripeUIProps {
  pmTypeOptions: OptionType[];
}

export default function StripeUI({ pmTypeOptions }: StripeUIProps) {
  // --- Payment state ---
  const [customerId, setCustomerId] = useState(
    process.env["NEXT_PUBLIC_TEST_CUSTOMER_ID"] || "",
  );
  const [country, setCountry] = useState<string>("US");
  const [currency, setCurrency] = useState<string>("");
  const [amount, setAmount] = useState<number>(10000);
  const [currencyList, setCurrencyList] = useState<OptionType[]>([]);
  const [customerSessionClientSecret, setCustomerSessionClientSecret] =
    useState<string | null>(null);

  const [paymentMethodSelectionMode, setPaymentMethodSelectionMode] = useState<
    "dynamic" | "explicit"
  >("dynamic");
  const [pmConfigs, setPmConfigs] = useState<OptionType[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [configsLoading, setConfigsLoading] = useState(false);
  const [selectedPmTypes, setSelectedPmTypes] = useState<string[]>([]);
  const [useStripeSDK, setUseStripeSDK] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [messageApi, contextHolder] = message.useMessage();
  const messageApiRef = useRef(messageApi);
  // 使用 useEffect 在渲染后更新 ref，避免在渲染期间访问 ref
  useEffect(() => {
    messageApiRef.current = messageApi;
  }, [messageApi]);
  const isMountedRef = useRef(true);
  const paymentShownRef = useRef(false);

  // --- Stripe initialization ---
  const [stripePromise, setStripePromise] =
    useState<Promise<Stripe | null> | null>(null);
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(true);
  const [stripeError, setStripeError] = useState<string | null>(null);

  const initializeStripe = useCallback(() => {
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    if (!apiKey) {
      setStripeError(
        "Configuration Error: Missing Stripe API Key. Please set NEXT_PUBLIC_API_KEY in your environment variables.",
      );
      setStripeLoading(false);
      return;
    }

    setStripeLoading(true);
    setStripeError(null);
    setStripeReady(false);

    const promise = loadStripe(apiKey);
    setStripePromise(promise);

    promise
      .then((stripe) => {
        if (!isMountedRef.current) return;
        if (!stripe) {
          setStripeError(
            "Failed to initialize Stripe. Please check your API key and network connection.",
          );
          setStripeLoading(false);
          return;
        }
        if (!isMountedRef.current) return;
        setStripeReady(true);
        setStripeLoading(false);
      })
      .catch((err) => {
        if (!isMountedRef.current) return;
        console.error("Stripe initialization error:", err);
        setStripeError(
          `Failed to load Stripe.js: ${err instanceof Error ? err.message : "Unknown error"}. Please check your network connection and try again.`,
        );
        setStripeLoading(false);
      });
  }, []);

  const handleRetryStripe = useCallback(() => {
    initializeStripe();
  }, [initializeStripe]);

  // --- Currency loader ---
  const loadCurrencyForCountry = useCallback((countryCode: string) => {
    const currencyCode = getCurrencyForCountry(countryCode);
    if (currencyCode) {
      setCurrencyList([
        { value: currencyCode, label: currencyCode.toUpperCase() },
      ]);
      setCurrency(currencyCode);
    } else {
      setCurrencyList([]);
      setCurrency("");
      messageApiRef.current.warning("No currency found for this country");
    }
  }, []);

  // --- Mount: init Stripe + payment URL detection ---
  useEffect(() => {
    isMountedRef.current = true;
    // 使用 requestAnimationFrame 延迟 Stripe 初始化，避免在 effect 中同步调用 setState
    const rafId = requestAnimationFrame(() => {
      initializeStripe();
    });

    // Payment URL detection (redirect callback)
    if (!paymentShownRef.current) {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentIntent = urlParams.get("payment_intent");
      const clientSecret = urlParams.get("payment_intent_client_secret");
      const sourceType = urlParams.get("source_type");
      const redirectStatus = urlParams.get("redirect_status");

      if (sourceType !== "card" && paymentIntent && clientSecret) {
        if (redirectStatus === "succeeded") {
          messageApiRef.current.success(
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#52c41a",
                fontWeight: 500,
              }}
            >
              <span>
                Your payment <strong>&quot;{paymentIntent}&quot;</strong> is
                paid successfully
              </span>
            </div>,
            5,
          );
        } else {
          messageApiRef.current.warning(
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#ff4d4f",
                fontWeight: 500,
              }}
            >
              <span>
                Your payment <strong>&quot;{paymentIntent}&quot;</strong> failed
              </span>
            </div>,
            5,
          );
        }
        paymentShownRef.current = true;
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [initializeStripe]);

  // --- Load currency when stripe is ready or country changes ---
  useEffect(() => {
    if (!stripeReady) return;
    // 使用 setTimeout 将状态更新推迟到下一个事件循环，避免级联渲染
    setTimeout(() => {
      loadCurrencyForCountry(country);
    }, 0);
  }, [country, stripeReady, loadCurrencyForCountry]);

  // --- Fetch payment method configurations ---
  const fetchPmConfigs = useCallback(async () => {
    setConfigsLoading(true);
    setPmConfigs([]);
    setSelectedConfigId("");
    try {
      const response = await listPaymentMethodConfigurations();
      if (!isMountedRef.current) return;

      if (response.error) {
        throw new Error(response.error.raw?.message || response.error.code);
      }

      const list: Array<{ id: string; name: string }> =
        response.configurations ?? [];
      const options: OptionType[] = list.map((c) => ({
        value: c.id,
        label: c.name ? `${c.name} (${c.id})` : c.id,
      }));
      setPmConfigs(options);
      if (options.length > 0) setSelectedConfigId(options[0].value);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error(err);
      messageApi.error("Failed to load payment method configurations");
    } finally {
      if (isMountedRef.current) setConfigsLoading(false);
    }
  }, [messageApi]);

  // --- Initialize session ---
  const handleInitializeSession = async () => {
    setIsProcessing(true);
    setCustomerSessionClientSecret(null);

    try {
      const response = await createSession(customerId);
      if (!isMountedRef.current) return;

      if (response.error) {
        throw new Error(response.error.raw?.message || response.error.code);
      }

      if (response.customer_session_client_secret) {
        setCustomerSessionClientSecret(response.customer_session_client_secret);
      } else {
        throw new Error("No customer session secret returned");
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error(err);
      messageApi.error(
        err instanceof Error ? err.message : "Failed to initialize session",
      );
    } finally {
      if (isMountedRef.current) setIsProcessing(false);
    }
  };

  // --- Build payment state for child components ---
  const paymentState: StripePaymentState = useMemo(
    () => ({
      customerId,
      setCustomerId,
      country,
      setCountry,
      currency,
      setCurrency,
      amount,
      setAmount,
      currencyList,
      paymentMethodSelectionMode,
      setPaymentMethodSelectionMode,
      pmConfigs,
      selectedConfigId,
      setSelectedConfigId,
      configsLoading,
      fetchPmConfigs,
      selectedPmTypes,
      setSelectedPmTypes,
      useStripeSDK,
      setUseStripeSDK: (v) => setUseStripeSDK(v),
    }),
    [
      customerId,
      country,
      currency,
      amount,
      currencyList,
      paymentMethodSelectionMode,
      pmConfigs,
      selectedConfigId,
      configsLoading,
      fetchPmConfigs,
      selectedPmTypes,
      useStripeSDK,
    ],
  );

  // --- Computed ---
  const isReadyToInitialize = useMemo(
    () =>
      stripeReady &&
      !stripeLoading &&
      !stripeError &&
      !!customerId.trim() &&
      !!currency &&
      amount > 0 &&
      (paymentMethodSelectionMode === "dynamic"
        ? !!selectedConfigId
        : selectedPmTypes.length > 0),
    [
      stripeReady,
      stripeLoading,
      stripeError,
      customerId,
      currency,
      amount,
      paymentMethodSelectionMode,
      selectedConfigId,
      selectedPmTypes,
    ],
  );

  const elementsOptions: StripeElementsOptions = useMemo(() => {
    if (!customerSessionClientSecret) return {};

    const opts: StripeElementsOptions & {
      paymentMethodConfiguration?: string;
      paymentMethodTypes?: string[];
    } = {
      customerSessionClientSecret,
      currency,
      amount,
      mode: "payment",
    };

    if (paymentMethodSelectionMode === "dynamic" && selectedConfigId) {
      opts.paymentMethodConfiguration = selectedConfigId;
    }

    if (
      paymentMethodSelectionMode === "explicit" &&
      selectedPmTypes.length > 0
    ) {
      opts.paymentMethodTypes = selectedPmTypes;
    }

    return opts;
  }, [
    customerSessionClientSecret,
    currency,
    amount,
    paymentMethodSelectionMode,
    selectedConfigId,
    selectedPmTypes,
  ]);

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
        <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
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

          {/* Stripe Loading State */}
          {stripeLoading && (
            <Card
              style={{
                borderRadius: 12,
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
                marginBottom: 24,
                textAlign: "center",
              }}
            >
              <Spin size="large" />
              <div style={{ marginTop: 16, color: "#666" }}>
                Loading Stripe Payment System...
              </div>
            </Card>
          )}

          {/* Stripe Error State */}
          {stripeError && !stripeLoading && (
            <Card
              style={{
                borderRadius: 12,
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
                marginBottom: 24,
              }}
            >
              <Alert
                message="Stripe Loading Failed"
                description={
                  <div>
                    <p style={{ marginBottom: 12 }}>{stripeError}</p>
                    <div style={{ marginBottom: 8 }}>
                      <strong>Troubleshooting Steps:</strong>
                    </div>
                    <ul style={{ marginBottom: 12, paddingLeft: 20 }}>
                      <li>
                        Verify that your NEXT_PUBLIC_API_KEY environment
                        variable is correctly set
                      </li>
                      <li>Check your internet connection</li>
                      <li>Ensure the API key is valid and not expired</li>
                      <li>
                        Try clearing your browser cache and refreshing the page
                      </li>
                    </ul>
                  </div>
                }
                type="error"
                showIcon
                action={
                  <Button type="primary" onClick={handleRetryStripe}>
                    Retry
                  </Button>
                }
              />
            </Card>
          )}

          {/* Configuration Panel */}
          {stripeReady && (
            <StripeConfigPanel
              state={paymentState}
              countryList={COUNTRY_LIST}
              pmTypeOptions={pmTypeOptions}
              customerSessionClientSecret={customerSessionClientSecret}
              setCustomerSessionClientSecret={setCustomerSessionClientSecret}
              isProcessing={isProcessing}
              stripeLoading={stripeLoading}
              stripeError={stripeError}
            />
          )}

          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <Button
              type="primary"
              size="large"
              disabled={!isReadyToInitialize}
              onClick={handleInitializeSession}
              loading={isProcessing}
              className="w-full sm:w-auto"
            >
              Initialize Session
            </Button>
          </div>

          {/* Payment Element */}
          {customerSessionClientSecret && stripePromise && (
            <Card
              style={{
                borderRadius: 12,
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
              }}
            >
              <Elements stripe={stripePromise} options={elementsOptions}>
                <PaymentForm
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
      <BackToHome />
    </>
  );
}
