import { Stripe } from "stripe";

const clients = {} as {
  stripe: Stripe;
};

export const getClients = async () => {
  let { stripe } = clients;
  if (!stripe) {
    const apiKey = process.env["STRIPE_SECRET_KEY"] as string;
    const version = process.env["STRIPE_API_VERSION"] as any;
    stripe = new Stripe(apiKey, { apiVersion: version });
    clients.stripe = stripe;
  }
  return stripe;
};
