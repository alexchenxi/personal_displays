import { NextResponse } from "next/server";
import { getClients } from "@/app/api/config";

export async function POST() {
  try {
    const stripe = await getClients();
    const configurations = await stripe.paymentMethodConfigurations.list({});
    return NextResponse.json(
      {
        configurations: configurations.data.map((c) => ({
          id: c.id,
          name: c.name,
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
}
