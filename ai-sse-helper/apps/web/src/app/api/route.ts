import { NextResponse } from "next/server";
import { getClients } from "@/app/api/config";
import { Stripe } from "stripe";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const stripe = await getClients();
  switch (type) {
    case "get-customer":
      try {
        const customerId = searchParams.get("customer_id");
        if (!customerId) {
          return NextResponse.json({
            error: "customer_id parameter is null",
          });
        }
        const customer = await stripe.customers.retrieve(customerId);
        return NextResponse.json({ customer }, { status: 200 });
      } catch (err) {
        return NextResponse.json(
          {
            error: err,
          },
          { status: 400 },
        );
      }
    case "price-list":
      try {
        const list = await stripe.prices.list({
          active: true,
        });
        return NextResponse.json(list, { status: 200 });
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }
    default:
      return NextResponse.json({ message: "api not exist" }, { status: 404 });
  }
}

export async function POST(req: any) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const stripe = await getClients();

  switch (type) {
    case "summarize-payment":
      let request = await req.json();
      try {
        const confirmationToken = await stripe.confirmationTokens.retrieve(
          request.confirmation_token_id,
        );
        const response = summarizePaymentDetails(confirmationToken);
        return NextResponse.json({ response }, { status: 200 });
      } catch (err) {
        return NextResponse.json(
          {
            error: err,
          },
          { status: 400 },
        );
      }
    case "create-intent":
      try {
        let request = await req.json();
        const intent = await stripe.paymentIntents.create({
          customer: request.customerId,
          amount: request.amount,
          currency: request.currency,
          automatic_payment_methods: { enabled: true },
        });
        return NextResponse.json(
          {
            id: intent.id,
            obj: intent.object,
            client_secret: intent.client_secret,
          },
          { status: 200 },
        );
      } catch (err) {
        return NextResponse.json(
          {
            error: err,
          },
          { status: 400 },
        );
      }
    case "create-customer":
      try {
        const request = await req.json();
        const customer = await stripe.customers.create({
          name: request.name,
          email: request.email,
        });
        return NextResponse.json({
          customer,
        });
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }
    case "create-price":
      try {
        const request = await req.json();
        const price = await stripe.prices.create({
          currency: request.currency,
          unit_amount: request.amount,
          recurring: {
            interval: "month",
            usage_type: "licensed",
          },
          product_data: {
            name: request.productName,
          },
        });
        return NextResponse.json({
          price,
        });
      } catch (err) {
        return NextResponse.json(
          {
            error: err,
          },
          { status: 400 },
        );
      }
    case "create-subscription":
      try {
        const request = await req.json();
        const subscription = await stripe.subscriptions.create({
          customer: request.customerId,
          items: [{ price: request.priceId }],
          expand: ["pending_setup_intent"],
          payment_settings: {
            save_default_payment_method: "on_subscription",
          },
          default_payment_method: request.paymentMethodId,
        });
        let result = {
          subscription: subscription,
        } as any;
        if (
          subscription.status === "incomplete" &&
          subscription.latest_invoice
        ) {
          const invoice = await stripe.invoices.retrieve(
            subscription.latest_invoice as string,
            {
              expand: ["payments"],
            },
          );
          const payments = invoice.payments?.data.filter(
            (value) =>
              value.invoice === (subscription.latest_invoice as string),
          );
          if (payments) {
            result.paymentIntents = await stripe.paymentIntents.retrieve(
              payments[0].payment.payment_intent as string,
            );
          }
        }
        return NextResponse.json(result);
      } catch (err) {
        return NextResponse.json(
          {
            error: err,
          },
          { status: 400 },
        );
      }
    case "setup-intents":
      try {
        const request = await req.json();
        const setupIntents = await stripe.setupIntents.create({
          confirm: true,
          customer: request.customerId,
          confirmation_token: request.confirmation_token_id,
          return_url: request.return_url,
          automatic_payment_methods: {
            enabled: true,
          },
        });
        return NextResponse.json({
          setupIntents,
        });
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }
    case "default-payment-method":
      try {
        const request = await req.json();
        await stripe.customers.update(request.customerId, {
          invoice_settings: { default_payment_method: request.paymentMethodId },
        });
        return NextResponse.json({ message: "success" }, { status: 200 });
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }
    case "schedules-subscription":
      try {
        const request = await req.json();
        const subscription = await stripe.subscriptions.retrieve(
          request.subscriptionId,
        );

        // const discountCoupon = await stripe.coupons.create({
        //   percent_off: 100,
        //   duration: 'repeating',
        //   duration_in_months: 1,
        // });

        if (subscription) {
          const item = subscription.items.data[0];

          const subscriptionSchedules =
            await stripe.subscriptionSchedules.create({
              from_subscription: subscription.id,
            });

          let phases =
            subscriptionSchedules.phases as Array<Stripe.SubscriptionSchedule.Phase>;
          const updateParamsArray: Array<any> = [];
          if (subscriptionSchedules.current_phase) {
            const end_date = subscriptionSchedules.current_phase?.end_date;

            const trialData = end_date + 7 * 24 * 60 * 60; // 7 days
            const twoMonthsLater = end_date + 60 * 24 * 60 * 60; // 60 days
            const threeMonthsLater = end_date + 90 * 24 * 60 * 60; // 90 days
            phases.forEach((value) => {
              updateParamsArray.push({
                start_date: value.start_date,
                end_date: value.end_date,
                items: value.items,
              });
            });
            updateParamsArray.push(
              ...[
                {
                  start_date: end_date,
                  end_date: twoMonthsLater,
                  items: [{ price: item.price.id }],
                  trial_end: trialData,
                  billing_cycle_anchor: "automatic",
                },
                {
                  start_date: twoMonthsLater,
                  end_date: threeMonthsLater,
                  items: [
                    {
                      price: item.price.id,
                      discounts: [{ coupon: request.coupinId }],
                    },
                  ],
                },
              ],
            );
          }
          if (updateParamsArray) {
            await stripe.subscriptionSchedules.update(
              subscriptionSchedules.id,
              {
                end_behavior: "release",
                phases: updateParamsArray,
              },
            );
          }
        }
        return NextResponse.json({ message: "success" }, { status: 200 });
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }

    case "subscriptions-free-trial":
      try {
        const request = await req.json();

        // await stripe.subscriptions.create({
        //   customer: request.customerId,
        //   items: [
        //     {
        //       price: request.priceId,
        //     },
        //   ],
        //   trial_period_days: 7,
        // });

        const startData = Math.floor(Date.now() / 1000);
        const trialEnd = startData + 15 * 24 * 60 * 60;
        const cycleAnchorData = trialEnd + 15 * 24 * 60 * 60;

        await stripe.subscriptions.create({
          customer: request.customerId,
          items: [
            {
              price: request.priceId,
            },
          ],
          trial_end: trialEnd,
          billing_cycle_anchor: cycleAnchorData,
        });

        return NextResponse.json({ message: "success" }, { status: 200 });
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }
    case "lone-subscription":
      try {
        const request = await req.json();

        const product = await stripe.products.create({
          name: "temporary goods",
          type: "service",
        });
        if (product) {
          const subscription = await stripe.subscriptions.create({
            customer: request.customerId,
            metadata: {},
            items: [
              {
                price_data: {
                  currency: "usd",
                  unit_amount: 1500,
                  product: product.id,
                  recurring: {
                    interval: "month",
                    interval_count: 3,
                  },
                },
              },
            ],
          });
        }
        return NextResponse.json({ message: "success" }, { status: 200 });
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }

    case "meter-pd-price":
      try {
        const { customerId, event_name, display_name } = await req.json();
        const meter = await stripe.billing.meters.create({
          display_name,
          event_name,
          default_aggregation: {
            formula: "sum",
          },
          customer_mapping: {
            event_payload_key: "stripe_customer_id",
            type: "by_id",
          },
          value_settings: {
            event_payload_key: "amount",
          },
        });

        const price = await stripe.prices.create({
          currency: "usd",
          unit_amount: 1,
          billing_scheme: "per_unit",
          transform_quantity: {
            divide_by: 1000,
            round: "up",
          },
          recurring: {
            usage_type: "metered",
            interval: "month",
            meter: meter.id,
          },
          product_data: {
            name: display_name,
          },
        });

        await stripe.subscriptions.create({
          customer: customerId,
          items: [
            {
              price: price.id,
            },
          ],
        });

        return NextResponse.json({ message: "success" }, { status: 200 });
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }

    case "meter-events":
      try {
        const { event_name, customerId, amount } = await req.json();

        await stripe.billing.meterEvents.create({
          event_name,
          payload: {
            stripe_customer_id: customerId,
            amount,
          },
        });

        return NextResponse.json({ message: "success" }, { status: 200 });
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }

    case "meter-rate-card":
      try {
        const request = await req.json();

        const meter = await stripe.billing.meters.create({
          display_name: "Alpaca AI tokens(Rate Card)",
          event_name: "alpaca_ai_tokens_rate_card",
          default_aggregation: {
            formula: "sum",
          },
          customer_mapping: {
            event_payload_key: "stripe_customer_id",
            type: "by_id",
          },
          value_settings: {
            event_payload_key: "amount",
          },
        });

        const price = await stripe.prices.create({
          product: request.productId,
          currency: "usd",
          recurring: {
            interval: "month",
            usage_type: "metered",
            meter: meter.id,
          },
          billing_scheme: "tiered",
          tiers_mode: "volume",
          tiers: [
            { up_to: 1000, unit_amount: 100 },
            { up_to: 3000, unit_amount: 80 },
            { up_to: "inf", unit_amount: 50 },
          ],
          expand: ["tiers"],
        });

        const subscription = await stripe.subscriptions.create({
          customer: request.customerId,
          items: [
            {
              price: price.id,
            },
          ],
        });

        return NextResponse.json({ message: "success" }, { status: 200 });
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }

    case "meter-events-rate-card":
      try {
        const request = await req.json();

        const meterEvent = await stripe.billing.meterEvents.create({
          event_name: "alpaca_ai_tokens_rate_card",
          payload: {
            stripe_customer_id: request.customerId,
            amount: "500",
          },
        });

        return NextResponse.json({ message: "success" }, { status: 200 });
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }
    case "change-subs":
      try {
        const request = await req.json();
        const subscription = await stripe.subscriptions.retrieve(
          request.subscriptionId,
          { expand: ["latest_invoice"] },
        );
        if (subscription) {
          if (request.priceId === subscription.items.data[0].price.id) {
            return NextResponse.json(
              {
                message: "the priceId is the same as the current subscription",
              },
              { status: 400 },
            );
          }

          const updateParamsArray: Array<any> = [];

          const schedule = await stripe.subscriptionSchedules.create({
            from_subscription: subscription.id,
          });

          schedule.phases.forEach((value) => {
            updateParamsArray.push({
              start_date: value.start_date,
              end_date: value.end_date,
              items: value.items,
            });
          });

          updateParamsArray.push(
            ...[
              {
                items: [
                  {
                    price: request.priceId,
                  },
                ],
                billing_cycle_anchor: "automatic",
                iterations: 1,
              },
            ],
          );
          await stripe.subscriptionSchedules.update(schedule.id, {
            phases: updateParamsArray,
            end_behavior: "release",
          });
        }

        return NextResponse.json({ subscription }, { status: 200 });
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }

    case "create-intent-by-mode":
      try {
        const request = await req.json();
        const mode = request.mode;
        let intent: any = null;
        if (mode === "payment") {
          intent = await stripe.paymentIntents.create({
            amount: request.amount,
            currency: request.currency,
            automatic_payment_methods: { enabled: true },
            customer: request.customerId,
          });
        } else if (mode === "setup") {
          intent = await stripe.setupIntents.create({
            customer: request.customerId,
            automatic_payment_methods: { enabled: true },
          });
        } else if (mode === "subscription") {
          const subscription = await stripe.subscriptions.create({
            customer: request.customerId,
            items: [{ price: request.priceId }],
            payment_behavior: "default_incomplete",
          });
          const invoice = await stripe.invoices.retrieve(
            subscription.latest_invoice as string,
            {
              expand: ["payments"],
            },
          );
          const payments = invoice.payments?.data.filter(
            (value) =>
              value.invoice === (subscription.latest_invoice as string),
          );
          if (payments) {
            intent = await stripe.paymentIntents.retrieve(
              payments[0].payment.payment_intent as string,
            );
          }
        }

        return NextResponse.json(
          {
            client_secret: intent.client_secret,
          },
          { status: 200 },
        );
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }

    case "create-customer-session-alipay":
      try {
        const request = await req.json();
        const { customerId, amount } = request;
        const paymentIntent = await stripe.paymentIntents.create({
          // 支付金额（最小单位，如人民币分、美元美分，此处以人民币为例，需Stripe支持对应币种）
          amount: amount || 100, // 1元（分）
          currency: "cny", // 支付宝常用币种：cny（人民币）
          // 关联用户customerId
          customer: customerId,
          payment_method_types: ["wechat_pay", "alipay"],
          // automatic_payment_methods: {
          //   enabled: true,
          //   // allow_redirects: "never",//ali wechat card
          //   // allow_redirects: "always", //cash app，amazon pay

          // },
        });
        return NextResponse.json(
          {
            customer_session_client_secret: paymentIntent.client_secret,
          },
          { status: 200 },
        );
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }
    case "create-payment-intent-express":
      try {
        const request = await req.json();
        const { currency, amount, pyType } = request;
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount || 100,
          currency,
          payment_method_types: [pyType],
        });
        return NextResponse.json(
          {
            customer_session_client_secret: paymentIntent.client_secret,
          },
          { status: 200 },
        );
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }
    case "confirm-payment-intent-express":
      try {
        const request = await req.json();
        const {
          paymentIntentId,
          paymentMethodType,
          paymentMethodId,
          return_url,
        } = request;
        const confirmationResult = await stripe.paymentIntents.confirm(
          paymentIntentId,
          {
            payment_method_types: [paymentMethodType],
            payment_method: paymentMethodId,
            capture_method: "automatic",
            return_url: return_url || "http://localhost:3000/callback",
          },
        );
        return NextResponse.json(
          {
            res: confirmationResult,
          },
          { status: 200 },
        );
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }
    case "create-checkout-session":
      try {
        const { priceId, mode, return_url } = await req.json();
        const checkoutSession = await stripe.checkout.sessions.create({
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          mode: mode,
          ui_mode: "elements",
          return_url: return_url,
          customer_email: "customer@example.com",
          phone_number_collection: {
            enabled: true,
          },
          shipping_address_collection: {
            allowed_countries: ["US"],
          },
        });
        return NextResponse.json(
          {
            checkout_session_client_secret: checkoutSession.client_secret,
          },
          { status: 200 },
        );
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }
    case "multiple-checkout-session":
      try {
        const { priceIds, returnUrl } = await req.json();
        const ids = priceIds.split(",") as string[];
        let items: { price: string; quantity: number }[] = [];
        ids.forEach((value) => {
          items.push({ price: value, quantity: 1 });
        });
        console.log(items);
        const checkoutSession = await stripe.checkout.sessions.create({
          line_items: items,
          mode: "payment",
          ui_mode: "embedded",
          return_url: returnUrl,
          customer_email: "wayne.wang@take2games.com",
          phone_number_collection: {
            enabled: true,
          },
          shipping_address_collection: {
            allowed_countries: ["US"],
          },
        });
        return NextResponse.json(
          {
            checkout_session_client_secret: checkoutSession.client_secret,
          },
          { status: 200 },
        );
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }
    case "get-payment-methods-config":
      try {
        const configurations = await stripe.paymentMethodConfigurations.list(
          {},
        );

        const enabledPaymentMethods = configurations.data.flatMap((config) =>
          Object.entries(config)
            .filter(
              ([, value]) =>
                typeof value === "object" &&
                value?.display_preference?.preference === "on",
            )
            .map(([key]) => key),
        );
        return NextResponse.json(
          {
            payment_methods: enabledPaymentMethods,
          },
          { status: 200 },
        );
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }
    case "get-payment-methods":
      try {
        const { customer_id } = await req.json();
        const paymentMethods = await stripe.customers.listPaymentMethods(
          customer_id,
          { limit: 3 },
        );
        return NextResponse.json(
          {
            paymentMethods: paymentMethods,
          },
          { status: 200 },
        );
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }
    case "get-supported-currencies":
      try {
        const { countryCode } = await req.json();
        const countrySpec = await stripe.countrySpecs.retrieve(countryCode);

        // 提取支持的支付货币数组
        const supportedCurrencies = countrySpec.supported_payment_currencies;

        return NextResponse.json(
          {
            supportedCurrencies: supportedCurrencies,
          },
          { status: 200 },
        );
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }
    case "create-session-with-payment-method":
      try {
        const request = await req.json();
        const { currency, amount, customerId, paymentMethod } = request;
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: currency,
          description: "common pay test",
          payment_method_types: paymentMethod,
          customer: customerId,
          automatic_payment_methods: {
            enabled: false,
          },
          metadata: { userIdV2: "rs#rockstart.com#" + customerId },
          statement_descriptor_suffix: "Rockstar Games GTA5",
          payment_method_options: {
            acss_debit: {
              mandate_options: {
                payment_schedule: "sporadic",
                transaction_type: "personal",
              },
            },
          },
        });
        stripe.paymentIntents.confirm();
        return NextResponse.json(
          {
            customer_session_client_secret: paymentIntent.client_secret,
          },
          { status: 200 },
        );
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }
    case "get-all-custom-payment-methods":
      try {
        const paymentMethodTypes = await stripe.paymentMethods.list({
          limit: 100,
        });

        const customPaymentMethods = paymentMethodTypes.data.filter(
          (method) =>
            method.type === "custom" || method.type.startsWith("custom_"),
        );
        return NextResponse.json(
          {
            custom_payment_methods: customPaymentMethods,
          },
          { status: 200 },
        );
      } catch (error) {
        return NextResponse.json(
          {
            error: error,
          },
          { status: 400 },
        );
      }
    default:
      return NextResponse.json({ message: "api not exist" }, { status: 404 });
  }
}

function summarizePaymentDetails(confirmationToken: any) {
  return {
    confirmationToken: confirmationToken,
  };
}
