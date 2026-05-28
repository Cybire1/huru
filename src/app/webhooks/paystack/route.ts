import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runtimeConfig } from "@/lib/huru/config";
import { verifyCheckoutTransaction } from "@/lib/huru/paystack";
import { applySuccessfulConsumerCreditPurchase, applySuccessfulCreditPurchase } from "@/lib/huru/store";

function isValidSignature(body: string, signature: string | null) {
  // Fail closed: production must have a signing key set, or webhooks are rejected.
  // Dev-only escape hatch: allow when key absent AND running on non-production NODE_ENV.
  if (!runtimeConfig.paystackWebhookSigningKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[paystack-webhook] PAYSTACK_WEBHOOK_SECRET not set — accepting unsigned webhook in non-production env.",
      );
      return true;
    }
    console.error(
      "[paystack-webhook] PAYSTACK_WEBHOOK_SECRET not set in production. Webhook rejected.",
    );
    return false;
  }

  if (!signature) {
    return false;
  }

  const digest = createHmac("sha512", runtimeConfig.paystackWebhookSigningKey)
    .update(body)
    .digest("hex");

  const left = Buffer.from(digest);
  const right = Buffer.from(signature);
  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!isValidSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: {
    event?: string;
    data?: {
      reference?: string;
      id?: string | number;
      status?: string;
      amount?: number;
      currency?: string;
      fees?: number;
      gateway_response?: string;
      paid_at?: string;
      metadata?: {
        credits_awarded?: number | string;
        project_public_id?: string;
        consumer_public_id?: string;
        pack_id?: string;
      };
    };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed JSON." }, { status: 400 });
  }

  if (payload.event === "charge.success") {
    const reference = payload.data?.reference;
    if (reference) {
      const verifiedData = runtimeConfig.paystackSecretKey
        ? await verifyCheckoutTransaction(reference)
        : (payload.data as Record<string, unknown>);

      const purchasePayload = {
        id:
          typeof verifiedData.id === "string" || typeof verifiedData.id === "number"
            ? verifiedData.id
            : payload.data?.id ?? null,
        status:
          typeof verifiedData.status === "string"
            ? verifiedData.status
            : payload.data?.status ?? "success",
        amount:
          typeof verifiedData.amount === "number"
            ? verifiedData.amount
            : payload.data?.amount ?? null,
        currency:
          typeof verifiedData.currency === "string"
            ? verifiedData.currency
            : payload.data?.currency ?? null,
        fees:
          typeof verifiedData.fees === "number"
            ? verifiedData.fees
            : payload.data?.fees ?? null,
        gateway_response:
          typeof verifiedData.gateway_response === "string"
            ? verifiedData.gateway_response
            : payload.data?.gateway_response ?? null,
        paid_at:
          typeof verifiedData.paid_at === "string"
            ? verifiedData.paid_at
            : payload.data?.paid_at ?? null,
        metadata:
          typeof verifiedData.metadata === "object" && verifiedData.metadata
            ? (verifiedData.metadata as Record<string, unknown>)
            : payload.data?.metadata ?? null,
        rawPayload:
          typeof verifiedData === "object" && verifiedData
            ? (verifiedData as Record<string, unknown>)
            : {},
      };

      const consumerPublicId =
        (purchasePayload.metadata as Record<string, unknown> | null)?.consumer_public_id;

      if (consumerPublicId && typeof consumerPublicId === "string") {
        await applySuccessfulConsumerCreditPurchase(reference, purchasePayload);
      } else {
        await applySuccessfulCreditPurchase(reference, purchasePayload);
      }
    }
  }

  return NextResponse.json({ received: true });
}
