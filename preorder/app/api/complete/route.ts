import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { PreorderSessionComplete, ResponseError } from "../../types";

const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY || "");

function fnvHash(s: string): number {
  let hash = 2166136261;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

async function findInvoiceByOrderId(orderId: string): Promise<Stripe.Invoice | null> {
  const result = await stripe.invoices.search({
    query: `metadata['orderId']:'${orderId.replace(/'/g, "\\'")}'`,
  });
  return result.data[0] || null;
}

function parseShippingRate(returnUrl: string): string | undefined {
  try {
    const url = new URL(returnUrl);
    return url.searchParams.get("shippingRate") || undefined;
  } catch {
    return undefined;
  }
}

function buildShippingUpdate(
  token: Stripe.ConfirmationToken,
): Stripe.InvoiceUpdateParams {
  const params: Stripe.InvoiceUpdateParams = {};
  const s = token.shipping;
  if (s?.address) {
    params.shipping_details = {
      name: s.name || "",
      address: {
        line1: s.address.line1 || "",
        line2: s.address.line2 || "",
        city: s.address.city || "",
        state: s.address.state || "",
        postal_code: s.address.postal_code || "",
        country: s.address.country || "",
      },
    };
  }
  const shippingRateId = parseShippingRate(token.return_url || "");
  if (shippingRateId) {
    params.shipping_cost = { shipping_rate: shippingRateId };
  }
  return params;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customer: string = body.customer || "";
    const confirmationTokenId: string = body.confirmationTokenId || "";
    const orderId: string | undefined =
      body.orderId || body.orderID || undefined;

    if (!customer) {
      return NextResponse.json<ResponseError>(
        { error: "customer is required" },
        { status: 400 },
      );
    }
    if (!confirmationTokenId) {
      return NextResponse.json<ResponseError>(
        { error: "confirmationTokenId is required" },
        { status: 400 },
      );
    }

    let oldInvoice: Stripe.Invoice | null = null;
    if (orderId) {
      oldInvoice = await findInvoiceByOrderId(orderId);
    }

    const confirmationToken = await stripe.confirmationTokens.retrieve(
      confirmationTokenId,
    );

    const setupIntent = await stripe.setupIntents.create({
      customer,
      confirm: true,
      confirmation_token: confirmationTokenId,
      return_url: confirmationToken.return_url || "",
    });

    const paymentMethodId = setupIntent.payment_method?.toString();

    let invoice: Stripe.Invoice;

    if (oldInvoice) {
      const shippingUpdate = buildShippingUpdate(confirmationToken);
      invoice = await stripe.invoices.update(oldInvoice.id, {
        ...shippingUpdate,
        default_payment_method: paymentMethodId,
      });
    } else {
      const invoiceAmount = parseInt(
        process.env.PREORDER_INVOICE_AMOUNT || "2000",
        10,
      );
      invoice = await stripe.invoices.create({
        customer,
        auto_advance: true,
        collection_method: "charge_automatically",
        automatically_finalizes_at:
          Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60,
        default_payment_method: paymentMethodId,
      });

      const shippingUpdate = buildShippingUpdate(confirmationToken);
      invoice = await stripe.invoices.update(invoice.id, {
        ...shippingUpdate,
        metadata: { orderId: String(fnvHash(invoice.id)) },
      });

      await stripe.invoiceItems.create({
        customer,
        invoice: invoice.id,
        amount: invoiceAmount,
        tax_behavior:
          (process.env.PREORDER_INVOICE_TAX_BEHAVIOR ||
            "inclusive") as Stripe.InvoiceItemCreateParams.TaxBehavior,
        currency: process.env.PREORDER_INVOICE_CURRENCY || "usd",
      });
    }

    return NextResponse.json<PreorderSessionComplete>({
      paymentMethod: paymentMethodId,
      invoice: invoice.id,
    });
  } catch (error) {
    console.error("Error completing preorder session:", error);
    return NextResponse.json<ResponseError>(
      { error: "Failed to complete preorder session" },
      { status: 500 },
    );
  }
}
