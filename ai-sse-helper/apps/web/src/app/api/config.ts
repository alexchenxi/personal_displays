import { Stripe } from "stripe";

const clients = {} as {
  stripe: Stripe;
};

const apiKey = process.env["STRIPE_API_KEY"] as string;
const version = process.env["STRIPE_API_VERSION"] as any;

export const getClients = async () => {
  let { stripe } = clients;
  if (!stripe) {
    stripe = new Stripe(apiKey, { apiVersion: version });
  }
  return stripe;
};
