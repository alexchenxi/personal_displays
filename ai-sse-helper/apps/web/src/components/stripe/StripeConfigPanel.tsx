"use client";

import { useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Input,
  Select,
  InputNumber,
  Button,
  Space,
  Radio,
  Switch,
} from "antd";
import type { InputNumberProps } from "antd";
import type { StripePaymentState, OptionType } from "./constants";

interface StripeConfigPanelProps {
  state: StripePaymentState;
  countryList: OptionType[];
  pmTypeOptions: OptionType[];
  customerSessionClientSecret: string | null;
  setCustomerSessionClientSecret: (secret: string | null) => void;
  isProcessing: boolean;
  stripeLoading: boolean;
  stripeError: string | null;
}

export default function StripeConfigPanel({
  state,
  countryList,
  pmTypeOptions,
  setCustomerSessionClientSecret,
  isProcessing,
  stripeLoading,
  stripeError,
}: StripeConfigPanelProps) {
  const disabled = isProcessing || stripeLoading || !!stripeError;

  const resetSession = () => setCustomerSessionClientSecret(null);

  const onChangeAmount: InputNumberProps["onChange"] = (value) => {
    if (value !== null && value !== undefined) {
      state.setAmount(Math.floor(Number(value)));
    }
  };

  const handleCountryChange = (value: string) => {
    state.setCountry(value);
    resetSession();
  };

  const handlePaymentMethodSelectionChange = (
    value: "dynamic" | "explicit",
  ) => {
    state.setPaymentMethodSelectionMode(value);
    resetSession();
    state.setSelectedPmTypes([]);
    if (value === "dynamic") {
      state.fetchPmConfigs();
    }
  };

  const currencyOptions = useMemo(
    () =>
      state.currencyList.map((c) => ({
        value: c.value,
        label: c.label,
      })),
    [state.currencyList],
  );

  return (
    <>
      {/* Configuration Panel */}
      <Card
        style={{
          borderRadius: 12,
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
          marginBottom: 24,
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 4, fontWeight: 500, color: "#555" }}>
              Customer
            </div>
            <Input
              value={state.customerId}
              onChange={(e) => {
                state.setCustomerId(e.target.value);
                resetSession();
              }}
              placeholder="cus_xxx"
              disabled={disabled}
            />
          </Col>

          <Col xs={12} sm={6} md={4}>
            <div style={{ marginBottom: 4, fontWeight: 500, color: "#555" }}>
              Country / Region
            </div>
            <Select
              showSearch
              value={state.country}
              style={{ width: "100%" }}
              onChange={handleCountryChange}
              options={countryList}
              placeholder="Select"
              disabled={disabled}
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </Col>

          <Col xs={12} sm={6} md={3}>
            <div style={{ marginBottom: 4, fontWeight: 500, color: "#555" }}>
              Currency
            </div>
            <Select
              showSearch
              value={state.currency || undefined}
              style={{ width: "100%" }}
              onChange={(val) => {
                state.setCurrency(val);
                resetSession();
              }}
              options={currencyOptions}
              placeholder="Select"
              disabled={disabled || !state.country}
            />
          </Col>

          <Col xs={24} sm={12} md={5}>
            <div style={{ marginBottom: 4, fontWeight: 500, color: "#555" }}>
              Amount
            </div>
            <InputNumber
              style={{ width: "100%" }}
              value={state.amount}
              onChange={onChangeAmount}
              min={1}
              step={1}
              disabled={disabled}
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
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#333" }}>
            Payment Method Configuration
          </div>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={12} md={12}>
              <Space wrap>
                <span style={{ color: "#555" }}>Mode:</span>
                <Radio.Group
                  value={state.paymentMethodSelectionMode}
                  onChange={(e) =>
                    handlePaymentMethodSelectionChange(e.target.value)
                  }
                  disabled={disabled}
                >
                  <Radio value="dynamic">Dynamic</Radio>
                  <Radio value="explicit">Explicit</Radio>
                </Radio.Group>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={12}>
              <Space>
                <span style={{ color: "#555" }}>Use Stripe SDK:</span>
                <Switch
                  checked={state.useStripeSDK}
                  onChange={() => state.setUseStripeSDK((prev) => !prev)}
                />
              </Space>
            </Col>
          </Row>

          {state.paymentMethodSelectionMode === "dynamic" && (
            <Row gutter={[12, 12]} align="bottom">
              <Col xs={24} sm={18} md={16}>
                <div
                  style={{ marginBottom: 4, fontWeight: 500, color: "#555" }}
                >
                  Configuration
                </div>
                <Select
                  style={{ width: "100%" }}
                  value={state.selectedConfigId || undefined}
                  onChange={(val) => {
                    state.setSelectedConfigId(val);
                    resetSession();
                  }}
                  options={state.pmConfigs}
                  loading={state.configsLoading}
                  placeholder={
                    state.configsLoading
                      ? "Loading configurations..."
                      : state.pmConfigs.length === 0
                        ? "Click to load configurations"
                        : "Select a configuration"
                  }
                  disabled={disabled}
                  onOpenChange={(open) => {
                    if (
                      open &&
                      state.pmConfigs.length === 0 &&
                      !state.configsLoading
                    ) {
                      state.fetchPmConfigs();
                    }
                  }}
                />
              </Col>
              <Col xs={24} sm={6} md={8}>
                <Button
                  onClick={state.fetchPmConfigs}
                  loading={state.configsLoading}
                  disabled={disabled}
                  block
                >
                  Refresh
                </Button>
              </Col>
            </Row>
          )}

          {state.paymentMethodSelectionMode === "explicit" && (
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500, color: "#555" }}>
                Payment Types
              </div>
              <Select
                mode="multiple"
                showSearch
                style={{ width: "100%", maxWidth: 600 }}
                value={state.selectedPmTypes}
                onChange={(val) => {
                  state.setSelectedPmTypes(val);
                  resetSession();
                }}
                options={pmTypeOptions}
                placeholder="Select payment types"
                disabled={disabled}
              />
            </div>
          )}
        </Space>
      </Card>
    </>
  );
}
