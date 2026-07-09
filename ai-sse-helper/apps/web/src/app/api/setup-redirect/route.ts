import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const shippingRate = request.nextUrl.searchParams.get("shippingRate");
  return NextResponse.json({ success: true, shippingRate });
}
