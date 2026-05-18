import { NextResponse } from "next/server";
import { getClients } from "@/app/api/config";

export async function POST(req: Request) {
  try {
    const stripe = await getClients();
    const { customerId } = await req.json();

    const customerSession = await stripe.customerSessions.create({
      customer: customerId,
      components: {
        payment_element: {
          enabled: true,
          features: {
            payment_method_redisplay_limit: 10,
            payment_method_redisplay: "enabled",
            payment_method_save: "enabled",
            payment_method_save_usage: "off_session",
            payment_method_remove: "enabled",
            payment_method_allow_redisplay_filters: [
              "unspecified",
              "always",
              "limited",
            ],
          },
        },
      },
    });

    return NextResponse.json(
      { customer_session_client_secret: customerSession.client_secret },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
}
