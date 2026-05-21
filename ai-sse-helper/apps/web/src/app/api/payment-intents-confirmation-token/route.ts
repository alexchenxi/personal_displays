import { NextResponse } from "next/server"
import { getClients } from "@/app/api/config"
import Stripe from "stripe"

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type")
  const stripe = await getClients()

  switch (type) {
    case "create-payment-intents-confirm-token":
      try {
        const request = await req.json()
        const params: Stripe.PaymentIntentCreateParams = {
          amount: request.amount,
          customer: request.customerId,
          currency: request.currency,
          payment_method_configuration: request.configurationId,
          confirmation_method: "automatic",
        }
        const { paymentType } = request
        if (request.explicit) {
          delete params.payment_method_configuration
          delete params.confirmation_method
          if (typeof paymentType === "string") {
            params.payment_method_types = [paymentType]
          } else {
            params.payment_method_types = paymentType
          }
        }
        const intent = await stripe.paymentIntents.create(params)
        const res = NextResponse.json({
          status: intent.status,
          paymentIntentsId: intent.id,
        })
        res.cookies.set("paymentIntentsId", intent.id, {
          httpOnly: true,
          secure: true,
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
          sameSite: "strict",
        })
        return res
      } catch (err) {
        return NextResponse.json(
          {
            error: err,
          },
          { status: 400 },
        )
      }
    case "confirm-payment-intents-confirm-token":
      try {
        const request = await req.json()
        const domain = process.env.NEXT_PUBLIC_DOMAIN

        const params: Stripe.PaymentIntentConfirmParams = {
          confirmation_token: request.confirmationTokenId,
          return_url: `${domain}/stripe-ui`,
          use_stripe_sdk: request.useStripeSdk,
        }
        const intent = await stripe.paymentIntents.confirm(
          request.paymentIntentsId,
          params,
        )
        if (intent.status === "requires_action") {
          return NextResponse.json({
            status: intent.status,
            clientSecret: intent.client_secret,
          })
        }
        return NextResponse.json({
          status: intent.status,
        })
      } catch (err) {
        return NextResponse.json(
          {
            error: err,
          },
          { status: 400 },
        )
      }
    default:
      return NextResponse.json({ message: "api not exist" }, { status: 404 })
  }
}
