import { creditPacks, runtimeConfig } from "@/lib/huru/config";
import { createConsumerCreditPurchase, createCreditPurchase } from "@/lib/huru/store";
import type { HuruConsumerRecord, HuruCreditPack, HuruProjectRecord } from "@/lib/huru/types";

export function listCreditPacks(): HuruCreditPack[] {
  return [...creditPacks];
}

export function getCreditPack(packId: string) {
  return creditPacks.find((pack) => pack.packId === packId) ?? null;
}

export async function createCheckoutSession(input: {
  project: HuruProjectRecord;
  packId: string;
  email: string;
  successUrl?: string;
  cancelUrl?: string;
}) {
  const pack = getCreditPack(input.packId);
  if (!pack) {
    throw new Error("Unknown credit pack.");
  }

  const reference = `huru_topup_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
  await createCreditPurchase(input.project, pack, reference);

  if (!runtimeConfig.paystackSecretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured.");
  }

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtimeConfig.paystackSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: pack.amountMinor,
      currency: pack.currency,
      reference,
      callback_url: input.successUrl ?? `${runtimeConfig.appUrl}/billing/success`,
      metadata: {
        product: "huru_credits",
        project_public_id: input.project.publicId,
        pack_id: pack.packId,
        credits_awarded: pack.creditsAwarded,
        cancel_url: input.cancelUrl ?? `${runtimeConfig.appUrl}/billing/cancel`,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Paystack initialize failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    data?: { authorization_url?: string; reference?: string };
  };

  return {
    id: `chk_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
    object: "checkout.session",
    provider: "paystack",
    reference: payload.data?.reference ?? reference,
    authorization_url: payload.data?.authorization_url ?? "",
    amount: pack.amountMinor,
    currency: pack.currency,
    status: "pending",
    credits_awarded: pack.creditsAwarded,
    mode: "live",
  };
}

export async function verifyCheckoutTransaction(reference: string) {
  if (!runtimeConfig.paystackSecretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured.");
  }

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${runtimeConfig.paystackSecretKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Paystack verify failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    data?: Record<string, unknown>;
  };

  return payload.data ?? {};
}

export async function createConsumerCheckoutSession(input: {
  project: HuruProjectRecord;
  consumer: HuruConsumerRecord;
  packId: string;
  successUrl?: string;
  cancelUrl?: string;
}) {
  const pack = getCreditPack(input.packId);
  if (!pack) {
    throw new Error("Unknown credit pack.");
  }

  const reference = `huru_topup_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
  await createConsumerCreditPurchase(input.project, input.consumer, pack, reference);

  if (!runtimeConfig.paystackSecretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured.");
  }

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtimeConfig.paystackSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.consumer.email,
      amount: pack.amountMinor,
      currency: pack.currency,
      reference,
      callback_url: input.successUrl ?? `${runtimeConfig.appUrl}/billing/success`,
      metadata: {
        product: "huru_credits",
        project_public_id: input.project.publicId,
        consumer_public_id: input.consumer.id,
        pack_id: pack.packId,
        credits_awarded: pack.creditsAwarded,
        cancel_url: input.cancelUrl ?? `${runtimeConfig.appUrl}/billing/cancel`,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Paystack initialize failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    data?: { authorization_url?: string; reference?: string };
  };

  return {
    id: `chk_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
    object: "checkout.session",
    provider: "paystack",
    reference: payload.data?.reference ?? reference,
    authorization_url: payload.data?.authorization_url ?? "",
    amount: pack.amountMinor,
    currency: pack.currency,
    status: "pending",
    credits_awarded: pack.creditsAwarded,
    mode: "live",
  };
}

export async function createQuickCheckoutUrl(
  project: HuruProjectRecord,
  consumer: HuruConsumerRecord,
  packId?: string,
): Promise<string> {
  const session = await createConsumerCheckoutSession({
    project,
    consumer,
    packId: packId ?? "pack_starter",
  });
  return session.authorization_url;
}
