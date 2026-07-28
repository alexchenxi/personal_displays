import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { PreorderSessionStart, ResponseError, AddressInfo, ShippingRate } from "@/types/preorder";
import { getOrCreateTestClockCustomer } from "@/lib/stripeCustomer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

async function createCustomerSession(
  customer: Stripe.Customer,
): Promise<Stripe.CustomerSession> {
  return stripe.customerSessions.create({
    customer: customer.id,
    components: {
      payment_element: {
        enabled: true,
        features: {
          payment_method_remove: "enabled",
          payment_method_redisplay: "enabled",
          payment_method_allow_redisplay_filters: ["always", "limited"],
        },
      },
    },
  });
}

async function findInvoiceByOrderId(orderId: string): Promise<Stripe.Invoice | null> {
  const result = await stripe.invoices.search({
    query: `metadata['orderId']:'${orderId.replace(/'/g, "\\'")}'`,
  });
  return result.data[0] || null;
}

function extractShippingAddress(invoice: Stripe.Invoice): AddressInfo | undefined {
  const shipping = invoice.shipping_details;
  if (!shipping?.address) return undefined;

  const addressInfo: AddressInfo = {
    name: shipping.name || undefined,
    address: {
      line1: shipping.address.line1 || undefined,
      line2: shipping.address.line2 || undefined,
      city: shipping.address.city || undefined,
      state: shipping.address.state || undefined,
      postalCode: shipping.address.postal_code || undefined,
      country: shipping.address.country || undefined,
    },
  };

  const rate = invoice.shipping_cost?.shipping_rate;
  if (rate) {
    addressInfo.shippingRate = typeof rate === "string" ? rate : rate.id;
  }

  return addressInfo;
}

async function listShippingRates(): Promise<ShippingRate[]> {
  const rates = await stripe.shippingRates.list({ active: true, limit: 10 });
  return rates.data.map((rate) => ({
    id: rate.id,
    display_name: rate.display_name || "",
    description: (rate as any).description || undefined,
    delivery_estimate: rate.delivery_estimate
      ? {
          minimum: { value: rate.delivery_estimate.minimum!.value, unit: rate.delivery_estimate.minimum!.unit },
          maximum: { value: rate.delivery_estimate.maximum!.value, unit: rate.delivery_estimate.maximum!.unit },
        }
      : undefined,
    fixed_amount: rate.fixed_amount
      ? { amount: rate.fixed_amount.amount, currency: rate.fixed_amount.currency }
      : undefined,
  }));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId: string | undefined = body.orderId || body.orderID || undefined;
    const requestEmail: string | undefined = body.email || undefined;

    let shippingAddress: AddressInfo | undefined;
    let email = requestEmail || process.env.STRIPE_CUSTOMER_EMAIL || "";

    if (orderId) {
      const existingInvoice = await findInvoiceByOrderId(orderId);
      if (existingInvoice) {
        if (existingInvoice.customer_email) {
          email = existingInvoice.customer_email;
        }
        shippingAddress = extractShippingAddress(existingInvoice);
      }
    }

    if (!email) {
      throw new Error("STRIPE_CUSTOMER_EMAIL is missing.");
    }

    const customer = await getOrCreateTestClockCustomer(stripe, email);
    const customerSession = await createCustomerSession(customer);
    const shippingRateList = await listShippingRates();

    return NextResponse.json<PreorderSessionStart>({
      customer: customer.id || "",
      email: customer.email || "",
      name: customer.name || "",
      currency: customer.currency || "",
      customerSessionSecret: customerSession.client_secret,
      paymentMethodConfiguration:
        process.env.STRIPE_PAYMENT_METHOD_CONFIGURATION || "",
      shippingAddress,
      shippingRateList,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json<ResponseError>(
      { error: "Failed to create preorder session" },
      { status: 500 },
    );
  }
}
