import { connection } from "next/server";
import { getPublicPayPalClientId } from "@/server/integrations/paypal";

export async function GET() {
  await connection();
  return Response.json({
    clientId: getPublicPayPalClientId(),
    currency: "USD",
  });
}
