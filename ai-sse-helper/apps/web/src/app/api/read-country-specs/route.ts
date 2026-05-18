import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export async function POST(req: Request) {
  try {
    const { countryCode } = await req.json();

    if (!countryCode) {
      return NextResponse.json(
        { error: "countryCode is required" },
        { status: 400 },
      );
    }

    const filePath = path.join(
      process.cwd(),
      "stripe",
      "country-specs",
      `${countryCode}.json`,
    );

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `No country spec found for: ${countryCode}` },
        { status: 404 },
      );
    }

    const spec = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    return NextResponse.json(
      { supportedCurrencies: spec.supported_payment_currencies },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
}
