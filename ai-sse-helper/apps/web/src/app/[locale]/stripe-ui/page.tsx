import fs from "fs";
import path from "path";
import StripeUI from "./StripeUI";

interface OptionType {
  value: string;
  label: string;
}

function readPmTypeOptions(): OptionType[] {
  try {
    const dtsPath = path.join(
      process.cwd(),
      "node_modules/stripe/cjs/resources/PaymentMethods.d.ts",
    );
    const content = fs.readFileSync(dtsPath, "utf-8");
    const match = content.match(
      /namespace PaymentMethodListParams \{[^}]*type Type = ([^;]+);/s,
    );
    if (!match) return [];
    return match[1]
      .split("|")
      .map((t) => t.trim().replace(/['"]/g, ""))
      .filter(Boolean)
      .map((t) => ({ value: t, label: t }));
  } catch {
    return [];
  }
}

export default function Page() {
  const pmTypeOptions = readPmTypeOptions();
  return <StripeUI pmTypeOptions={pmTypeOptions} />;
}
