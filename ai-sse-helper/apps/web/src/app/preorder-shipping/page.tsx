"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
  AddressElement,
  ContactDetailsElement,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  PreorderSessionStart,
  PreorderSessionComplete,
  AddressInfo,
  ShippingRate,
} from "@/types/preorder";
import BackToHome from "@/components/BackToHome";

// 1. Initialize Stripe outside of the component to avoid recreating it
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Helper function for fetch with JSON response
const fetchJson = async <T,>(url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: `HTTP error! status: ${response.status}` }));
    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`,
    );
  }
  return response.json() as T;
};

// Button styles
const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 20px",
  backgroundColor: "#1a73e8",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: "500",
  transition: "background-color 0.2s",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "6px 12px",
  fontSize: "12px",
  cursor: "pointer",
  backgroundColor: "#f5f5f5",
  color: "#333",
  border: "1px solid #ddd",
  borderRadius: "4px",
  transition: "background-color 0.2s",
};

// Container styles
const containerStyle: React.CSSProperties = {
  backgroundColor: "rgba(0, 0, 0, 0.04)",
  padding: "15px",
  borderRadius: "8px",
};

// Shipping method styles
const shippingMethodLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "12px",
  borderRadius: "6px",
  cursor: "pointer",
  backgroundColor: "white",
  transition: "border-color 0.2s, backgroundColor 0.2s",
};

const selectedShippingMethodStyle: React.CSSProperties = {
  ...shippingMethodLabelStyle,
  border: "2px solid #1a73e8",
  backgroundColor: "#f0f7ff",
};

const unselectedShippingMethodStyle: React.CSSProperties = {
  ...shippingMethodLabelStyle,
  border: "1px solid #ddd",
};

// Helper function: Format delivery estimate
const formatDeliveryEstimate = (
  estimate: ShippingRate["delivery_estimate"],
): string => {
  if (!estimate) return "";

  const { minimum, maximum } = estimate;
  const isSame =
    minimum.value === maximum.value && minimum.unit === maximum.unit;
  const unit = minimum.unit === "business_day" ? "business days" : minimum.unit;
  const value = isSame ? minimum.value : `${minimum.value}~${maximum.value}`;

  return `${value} ${unit}`;
};

// 2. CHILD COMPONENT: This can safely use the hooks because parent wraps it in <Elements>
function CheckoutForm({
  customer,
  orderId,
  addressInfo,
  email,
  shippingRateList,
}: {
  customer: string;
  orderId: string | null;
  addressInfo: AddressInfo | null;
  email?: string;
  shippingRateList?: ShippingRate[];
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [sessionComplete, setSessionComplete] =
    useState<PreorderSessionComplete | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [isContactComplete, setIsContactComplete] = useState(false);
  const [isAddressComplete, setIsAddressComplete] = useState(false);
  const [shippingRatesId, setShippingRatesId] = useState<string | null>(
    addressInfo?.shippingRate || null,
  );
  const [isShippingCollapsed, setIsShippingCollapsed] = useState(false);
  const [showShippingError, setShowShippingError] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);

  const handleContinue = useCallback(async () => {
    if (!elements) return;

    // Trigger inline validation display
    await elements.submit();

    if (!orderId && !shippingRatesId) {
      setShowShippingError(true);
      return;
    }

    if (isContactComplete && isAddressComplete) {
      setIsShippingCollapsed(true);
      setShowPayment(true);
    }
  }, [
    elements,
    orderId,
    shippingRatesId,
    isContactComplete,
    isAddressComplete,
  ]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!stripe || !elements) return;

      setIsProcessing(true);

      await elements.submit();

      const { error, confirmationToken } = await stripe.createConfirmationToken(
        {
          elements,
          params: {
            return_url: `${window.location.origin}/api/setup-redirect?shippingRate=${shippingRatesId}`,
          },
        },
      );

      if (error) {
        console.error(error);
        setIsProcessing(false);
        return;
      }

      try {
        const res = await fetchJson(`${API_BASE_URL}/api/complete`, {
          method: "POST",
          body: JSON.stringify({
            customer,
            confirmationTokenId: confirmationToken?.id,
            orderID: orderId,
          }),
        });
        setSessionComplete(res as PreorderSessionComplete);
      } catch (err) {
        setApiErrorMessage(
          err instanceof Error ? err.message : "An unexpected error occurred",
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [stripe, elements, shippingRatesId, customer, orderId],
  );

  const handleShippingRateChange = useCallback((value: string) => {
    setShippingRatesId(value);
    setShowShippingError(false);
  }, []);

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
          cursor: isShippingCollapsed ? "pointer" : "default",
        }}
        onClick={() => {
          setIsShippingCollapsed(false);
          setShowPayment(false);
        }}
      >
        <h3>Shipping Information</h3>
      </div>

      <div
        style={{
          overflow: "hidden",
          maxHeight: isShippingCollapsed ? "0" : "2000px",
          transition: "max-height 0.3s ease-in-out",
        }}
      >
        <div style={containerStyle}>
          <ContactDetailsElement
            options={{
              defaultValues: { email: email ?? "" },
            }}
            onChange={(e) => setIsContactComplete(e.complete)}
          />
          <AddressElement
            options={{
              mode: "shipping",
              blockPoBox: false,
              defaultValues: addressInfo?.address?.country
                ? {
                    name: addressInfo.name,
                    address: {
                      line1: addressInfo.address.line1,
                      line2: addressInfo.address.line2,
                      city: addressInfo.address.city,
                      state: addressInfo.address.state,
                      postal_code: addressInfo.address.postalCode,
                      country: addressInfo.address.country,
                    },
                  }
                : undefined,
            }}
            onChange={(e) => setIsAddressComplete(e.complete)}
          />
        </div>
        <div
          style={{
            ...containerStyle,
            marginTop: "15px",
            border: showShippingError ? "2px solid #dc3545" : "none",
          }}
        >
          <h3
            style={{
              marginBottom: "12px",
              fontSize: "15px",
              fontWeight: "600",
            }}
          >
            Shipping Methods
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {shippingRateList?.length ? (
              shippingRateList.map((item) => {
                const isSelected = shippingRatesId === item.id;
                return (
                  <label
                    key={item.id}
                    style={
                      isSelected
                        ? selectedShippingMethodStyle
                        : unselectedShippingMethodStyle
                    }
                  >
                    <input
                      type="radio"
                      name="shippingRate"
                      value={item.id}
                      checked={shippingRatesId === item.id}
                      onChange={(e) => handleShippingRateChange(e.target.value)}
                      style={{
                        marginRight: "12px",
                        width: "18px",
                        height: "18px",
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: isSelected ? "600" : "500",
                          fontSize: "14px",
                        }}
                      >
                        {item.display_name}
                      </div>
                      {item.delivery_estimate && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#666",
                            marginTop: "4px",
                            fontWeight: isSelected ? "500" : "400",
                          }}
                        >
                          {formatDeliveryEstimate(item.delivery_estimate)}
                        </div>
                      )}
                      {item.description && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#666",
                            marginTop: "2px",
                            fontWeight: isSelected ? "500" : "400",
                          }}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        fontWeight: isSelected ? "700" : "600",
                        fontSize: "14px",
                        color: "#1a73e8",
                      }}
                    >
                      {item.fixed_amount?.amount
                        ? `$${(item.fixed_amount.amount / 100).toFixed(2)}`
                        : "Free"}
                    </div>
                  </label>
                );
              })
            ) : (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "#666",
                  backgroundColor: "white",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                }}
              >
                No shipping methods available
              </div>
            )}
          </div>
          {showShippingError && (
            <div
              style={{
                color: "#dc3545",
                fontSize: "13px",
                marginTop: "10px",
                fontWeight: "500",
              }}
            >
              Please select a shipping method!
            </div>
          )}
        </div>
        <div style={{ marginTop: "20px" }}>
          <button
            type="button"
            onClick={handleContinue}
            style={primaryButtonStyle}
          >
            Continue
          </button>
        </div>
      </div>

      {showPayment && (
        <>
          <h3 style={{ marginTop: "20px", marginBottom: "10px" }}>
            Payment Details
          </h3>
          <PaymentElement />

          <button
            disabled={!stripe || isProcessing}
            style={{ ...primaryButtonStyle, marginTop: "20px" }}
          >
            {isProcessing
              ? "Processing..."
              : orderId
                ? "Update Payment"
                : "Preorder Now"}
          </button>
          {apiErrorMessage && (
            <div
              style={{
                marginTop: "12px",
                padding: "10px 14px",
                backgroundColor: "#fff0f0",
                border: "1px solid #dc3545",
                borderRadius: "4px",
                color: "#dc3545",
                fontSize: "14px",
              }}
            >
              {apiErrorMessage}
            </div>
          )}
        </>
      )}
    </form>
  );
}

// Order Entry Component: Collects optional Order ID before checkout
function OrderEntry({
  onProceed,
}: {
  onProceed: (orderId: string | null) => void;
}) {
  const [orderId, setOrderId] = useState("");

  const handleProceed = () => {
    const id = orderId.trim() || null;
    onProceed(id);
  };

  return (
    <div>
      <h3 style={{ marginBottom: "10px" }}>Order ID</h3>
      <input
        type="text"
        value={orderId}
        onChange={(e) => setOrderId(e.target.value)}
        placeholder="Enter Order ID (optional)"
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "10px",
          boxSizing: "border-box",
        }}
      />

      <button onClick={handleProceed} style={primaryButtonStyle}>
        Proceed
      </button>
    </div>
  );
}

// PARENT COMPONENT: Fetches data and provides the <Elements> context
export default function Page() {
  const [session, setSession] = useState<PreorderSessionStart | null>(null);
  const [showOrderEntry, setShowOrderEntry] = useState(true);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Fetch session only after proceeding from order entry
  useEffect(() => {
    if (showOrderEntry) return;
    fetchJson(`${API_BASE_URL}/api/start`, {
      method: "POST",
      body: JSON.stringify({ orderID: orderId }),
    }).then((data) => {
      setSession(data as PreorderSessionStart);
    });
  }, [showOrderEntry, orderId]);

  const handleProceed = async (id: string | null) => {
    setOrderId(id);
    setShowOrderEntry(false);
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", padding: "20px" }}>
      <h1>Pre-Order</h1>

      {/* Display Order ID or Return button (only when session is loaded) */}
      {!showOrderEntry && session && "customerSessionSecret" in session && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          {orderId && (
            <span style={{ color: "#666", fontStyle: "italic" }}>
              Order ID: {orderId}
            </span>
          )}
          <button
            onClick={() => {
              setShowOrderEntry(true);
              setOrderId(null);
              setSession(null);
            }}
            style={secondaryButtonStyle}
          >
            {orderId ? "Change ID" : "Return"}
          </button>
        </div>
      )}

      {/* Show Order Entry Page */}
      {showOrderEntry && <OrderEntry onProceed={handleProceed} />}

      {/* Show Checkout Page */}
      {!showOrderEntry &&
        (session && "customerSessionSecret" in session ? (
          <Elements
            stripe={stripePromise}
            options={{
              mode: "setup",
              currency: "usd",
              payment_method_configuration: session.paymentMethodConfiguration,
              customerSessionClientSecret: session.customerSessionSecret,
            }}
          >
            <CheckoutForm
              customer={session.customer}
              orderId={orderId}
              addressInfo={session.shippingAddress || null}
              email={session.email}
              shippingRateList={session.shippingRateList}
            />
          </Elements>
        ) : (
          <p>Loading payment details...</p>
        ))}
      <BackToHome />
    </div>
  );
}
