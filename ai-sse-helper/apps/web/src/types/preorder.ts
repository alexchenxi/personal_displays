import Stripe from "stripe";

export interface ResponseError {
  error: string;
}

export interface AddressInfo {
  name?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  shippingRate?: string;
}

export interface ShippingRate {
  id: string;
  display_name: string;
  description?: string;
  delivery_estimate?: {
    minimum: { value: number; unit: string };
    maximum: { value: number; unit: string };
  };
  fixed_amount?: { amount: number; currency: string };
}

interface PreorderSessionStartResponse {
  customer: string;
  email: string;
  name: string;
  currency: string;
  customerSessionSecret: string;
  paymentMethodConfiguration: string;
  shippingAddress?: AddressInfo;
  shippingRateList?: ShippingRate[];
}

export type PreorderSessionStart = PreorderSessionStartResponse | ResponseError;

interface PreorderSessionCompleteResponse {
  paymentMethod?: string;
  invoice?: string;
}

export type PreorderSessionComplete =
  | PreorderSessionCompleteResponse
  | ResponseError;
