import {
  createMoyasarPayment,
  createMockMoyasarPayment,
  mapMoyasarStatus,
  mapPaymentMethod,
} from "@/lib/moyasar";
import {
  getRestaurantCheckoutMode,
  resolveMoyasarSecretKey,
  sanitizePaymentKey,
} from "@/lib/payment-keys";
import { processTapPayment } from "@/lib/tap";
import { processStripePayment } from "@/lib/stripe";
import { PaymentMethodType, PaymentProvider, PaymentStatus } from "@prisma/client";

export interface RestaurantPaymentConfig {
  defaultPaymentProvider: PaymentProvider;
  moyasarPublishableKey?: string | null;
  moyasarSecretKey?: string | null;
  tapPublishableKey?: string | null;
  tapSecretKey?: string | null;
  stripePublishableKey?: string | null;
  stripeSecretKey?: string | null;
  currency: string;
  paymentTestMode?: boolean;
}

export interface ProcessPaymentInput {
  amount: number;
  description: string;
  method: string;
  metadata?: Record<string, string>;
  callbackUrl: string;
}

export interface ProcessPaymentResult {
  status: PaymentStatus;
  provider: PaymentProvider;
  method: PaymentMethodType;
  externalId: string;
  metadata: object;
}

export async function processRestaurantPayment(
  config: RestaurantPaymentConfig,
  input: ProcessPaymentInput
): Promise<ProcessPaymentResult> {
  const provider = config.defaultPaymentProvider;
  const method = mapPaymentMethod(input.method);

  switch (provider) {
    case "MOYASAR": {
      const payload = {
        amount: Math.round(input.amount * 100),
        currency: config.currency,
        description: input.description,
        callback_url: input.callbackUrl,
        source: { type: input.method.toLowerCase() },
        metadata: input.metadata,
      };
      const restaurantHasOwnKey = Boolean(sanitizePaymentKey(config.moyasarSecretKey));
      const useMock =
        config.paymentTestMode ||
        getRestaurantCheckoutMode() === "mock" ||
        !restaurantHasOwnKey;

      const result = useMock
        ? createMockMoyasarPayment(payload)
        : await createMoyasarPayment(
            payload,
            resolveMoyasarSecretKey(config.moyasarSecretKey),
            { testMode: config.paymentTestMode }
          );
      return {
        status: mapMoyasarStatus(result.status),
        provider: "MOYASAR",
        method,
        externalId: result.id,
        metadata: result,
      };
    }
    case "TAP": {
      const result = await processTapPayment(
        {
          amount: input.amount,
          currency: config.currency,
          description: input.description,
          metadata: input.metadata,
        },
        config.tapSecretKey
      );
      return {
        status: result.status,
        provider: "TAP",
        method,
        externalId: result.id,
        metadata: result,
      };
    }
    case "STRIPE": {
      const result = await processStripePayment(
        {
          amount: Math.round(input.amount * 100),
          currency: config.currency.toLowerCase(),
          description: input.description,
          metadata: input.metadata,
        },
        config.stripeSecretKey
      );
      return {
        status: result.status,
        provider: "STRIPE",
        method,
        externalId: result.id,
        metadata: result,
      };
    }
    default:
      throw new Error("Payment provider not configured");
  }
}
