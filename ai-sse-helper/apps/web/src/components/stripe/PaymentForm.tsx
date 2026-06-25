"use client";

import { Button, Typography, Row, Col } from "antd";
import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { MessageInstance } from "antd/es/message/interface";
import {
  confirmPaymentIntentWithConfirmationToken,
  createPaymentIntentWithConfirmationToken,
} from "@/app/api";

const { Title } = Typography;

interface PaymentFormProps {
  notify: MessageInstance;
  setIsProcessing: (processing: boolean) => void;
  customerId: string;
  amount: number;
  currency: string;
  setCustomerSessionClientSecret: (clientSecret: string | null) => void;
  paymentMethodSelectionMode: string;
  selectedConfigId: string;
  selectedPmTypes: string[];
  isUseSDK: boolean;
}

export default function PaymentForm({
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
}: PaymentFormProps) {
  const elements = useElements();
  const stripe = useStripe();

  const handleConfirm = async () => {
    if (!stripe || !elements) {
      notify.error("Payment system is not ready. Please refresh.");
      return;
    }

    try {
      setIsProcessing(true);

      const { error: submitError } = await elements.submit();
      if (submitError) {
        notify.error(submitError.message || "Invalid payment details");
        setIsProcessing(false);
        return;
      }

      const { error, confirmationToken } = await stripe.createConfirmationToken(
        {
          elements,
        },
      );

      if (error) {
        notify.error(error.message || "Failed to create confirmation token");
        setIsProcessing(false);
        return;
      }

      if (!confirmationToken) {
        notify.error("Failed to create confirmation token");
        setIsProcessing(false);
        return;
      }

      const { paymentIntentsId, error: createError } =
        await createPaymentIntentWithConfirmationToken(
          selectedConfigId,
          currency,
          amount,
          customerId,
          paymentMethodSelectionMode === "explicit",
          selectedPmTypes || "",
          isUseSDK,
        );

      if (createError) {
        notify.error(
          createError.raw?.message || "Create Payment Intent failed",
        );
        setIsProcessing(false);
        return;
      }

      const {
        clientSecret,
        status,
        error: confirmError,
      } = await confirmPaymentIntentWithConfirmationToken(
        confirmationToken.id,
        paymentIntentsId,
        isUseSDK,
      );

      if (confirmError) {
        notify.error(
          confirmError.raw?.message || "Confirm Payment Intent failed",
        );
        setIsProcessing(false);
        return;
      }

      switch (status) {
        case "succeeded":
          notify.success("Payment successful");
          break;
        case "requires_action":
          if (!clientSecret) {
            notify.error("Missing client secret for next action");
            break;
          }
          const { error: nextActionError, paymentIntent } =
            await stripe.handleNextAction({ clientSecret });

          if (nextActionError) {
            notify.error(nextActionError.message || "Action required failed");
          } else if (paymentIntent?.status === "succeeded") {
            notify.success("Payment successful after action");
          } else {
            notify.warning(
              `Payment status: ${paymentIntent?.status || "unknown"}`,
            );
          }
          break;
        default:
          console.error("Unexpected payment status:", status);
          notify.warning(`Something went wrong. Status: ${status}`);
      }
    } catch (err) {
      console.error(err);
      notify.error(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentElementError = (e: { error?: { message?: string } }) => {
    setCustomerSessionClientSecret(null);
    notify.error(e.error?.message || "Payment Element error");
  };

  return (
    <>
      <Title level={4}>Collect a Payment Method</Title>
      <PaymentElement onLoadError={handlePaymentElementError} />
      <Row align="middle" className="mt-4">
        <Col xs={24} sm={8}>
          <Button
            type="primary"
            onClick={handleConfirm}
            disabled={!stripe || !elements}
            block
          >
            Confirm Payment
          </Button>
        </Col>
      </Row>
    </>
  );
}
