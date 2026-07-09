"use client";

import React, { useState, useEffect } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
  AddressElement,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  PreorderSessionStart,
  PreorderSessionComplete,
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

type AddressInfo = {
  name?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
};

// 2. CHILD COMPONENT: This can safely use the hooks because parent wraps it in <Elements>
function CheckoutForm({
  customer,
  orderId,
  addressInfo,
}: {
  customer: string;
  orderId: string | null;
  addressInfo: AddressInfo | null;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [sessionComplete, setSessionComplete] =
    useState<PreorderSessionComplete | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);

    await elements.submit();

    const { error, confirmationToken } = await stripe.createConfirmationToken({
      elements,
      params: { return_url: `${window.location.origin}/api/setup-redirect` },
    });

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
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: "10px" }}>Shipping Address</h3>
      <AddressElement
        options={{
          mode: "shipping",
          blockPoBox: false,
          defaultValues: addressInfo?.address?.country
            ? {
                name: addressInfo.name,
                address: {
                  line1: addressInfo.address.line1 || undefined,
                  line2: addressInfo.address.line2 || undefined,
                  city: addressInfo.address.city || undefined,
                  state: addressInfo.address.state || undefined,
                  postal_code: addressInfo.address.postalCode || undefined,
                  country: addressInfo.address.country,
                },
              }
            : undefined,
        }}
      />

      <h3 style={{ marginTop: "20px", marginBottom: "10px" }}>
        Payment Details
      </h3>
      <PaymentElement />

      <button
        disabled={!stripe || isProcessing}
        style={{
          ...primaryButtonStyle,
          marginTop: "10px",
        }}
      >
        {isProcessing
          ? "Processing..."
          : orderId
            ? "Update Payment"
            : "Preorder Now"}
      </button>
      {errorMessage && (
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
          {errorMessage}
        </div>
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
              addressInfo={
                (session as { shippingAddress?: AddressInfo })
                  .shippingAddress || null
              }
            />
          </Elements>
        ) : (
          <p>Loading payment details...</p>
        ))}
      <BackToHome />
    </div>
  );
}
