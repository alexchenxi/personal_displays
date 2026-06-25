import type React from "react";
import countryCurrencyMap from "@/resources/country-currency.json";

export interface OptionType {
  value: string;
  label: string;
}

export interface StripePaymentState {
  customerId: string;
  setCustomerId: (id: string) => void;
  country: string;
  setCountry: (code: string) => void;
  currency: string;
  setCurrency: (code: string) => void;
  amount: number;
  setAmount: (amount: number) => void;
  currencyList: OptionType[];
  paymentMethodSelectionMode: "dynamic" | "explicit";
  setPaymentMethodSelectionMode: (mode: "dynamic" | "explicit") => void;
  pmConfigs: OptionType[];
  selectedConfigId: string;
  setSelectedConfigId: (id: string) => void;
  configsLoading: boolean;
  fetchPmConfigs: () => void;
  selectedPmTypes: string[];
  setSelectedPmTypes: (types: string[]) => void;
  useStripeSDK: boolean;
  setUseStripeSDK: React.Dispatch<React.SetStateAction<boolean>>;
}

export function getCurrencyForCountry(countryCode: string): string | null {
  const code = (countryCurrencyMap as Record<string, string>)[countryCode];
  return code ? code.toLowerCase() : null;
}
