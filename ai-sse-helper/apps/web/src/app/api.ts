const listPaymentMethodConfigurations = async () => {
  try {
    const res = await fetch(`/api/list-payment-method-configurations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accepts: "application/json",
      },
    })
    return await res.json()
  } catch (error) {
    return { error }
  }
}

const createPaymentIntentWithConfirmationToken = async (
  configurationId: string,
  currency: string,
  amount: number,
  customerId: string,
  explicit: boolean,
  paymentType: string | string[],
  useStripeSdk: boolean,
) => {
  try {
    const res = await fetch(
      `/api/payment-intents-confirmation-token?type=create-payment-intents-confirm-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accepts: "application/json",
        },
        body: JSON.stringify({
          configurationId,
          currency,
          amount,
          customerId,
          explicit,
          paymentType,
          useStripeSdk,
        }),
      },
    )
    return await res.json()
  } catch (error) {
    return { error }
  }
}

const confirmPaymentIntentWithConfirmationToken = async (
  confirmationTokenId: string,
  paymentIntentsId: string,
  useStripeSdk: boolean,
) => {
  try {
    const res = await fetch(
      `/api/payment-intents-confirmation-token?type=confirm-payment-intents-confirm-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accepts: "application/json",
        },
        body: JSON.stringify({
          confirmationTokenId,
          paymentIntentsId,
          useStripeSdk,
        }),
      },
    )
    return await res.json()
  } catch (error) {
    return { error }
  }
}

const createSession = async (customerId: string) => {
  try {
    const res = await fetch(`/api/create-customer-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accepts: "application/json",
      },
      body: JSON.stringify({ customerId }),
    })
    return await res.json()
  } catch (error) {
    return { error }
  }
}

export {
  createSession,
  createPaymentIntentWithConfirmationToken,
  listPaymentMethodConfigurations,
  confirmPaymentIntentWithConfirmationToken,
}
