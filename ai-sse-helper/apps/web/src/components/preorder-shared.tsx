"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

// Stripe initialization
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
);

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Helper function for fetch with JSON response
export const fetchJson = async <T,>(url: string, options: RequestInit = {}) => {
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
export const primaryButtonStyle: React.CSSProperties = {
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

export const secondaryButtonStyle: React.CSSProperties = {
  padding: "6px 12px",
  fontSize: "12px",
  cursor: "pointer",
  backgroundColor: "#f5f5f5",
  color: "#333",
  border: "1px solid #ddd",
  borderRadius: "4px",
  transition: "background-color 0.2s",
};

// Order Entry Component: Collects optional Order ID before checkout
export function OrderEntry({
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
