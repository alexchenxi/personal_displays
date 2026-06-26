import Stripe from "stripe";

export async function getOrCreateTestClockCustomer(
  stripe: Stripe,
  email: string,
): Promise<Stripe.Customer> {
  const searchResult = await stripe.customers.search({
    query: `email:'${email}'`,
  });

  let customer: Stripe.Customer | undefined = searchResult
    .data[0] as Stripe.Customer;

  if (customer && (!customer.test_clock || customer.deleted)) {
    try {
      await stripe.customers.del(customer.id);
    } catch (e) {
      console.warn("Failed to delete customer without test clock", e);
    }
    customer = undefined;
  }

  if (!customer) {
    const testClock = await stripe.testHelpers.testClocks.create({
      frozen_time: Math.floor(Date.now() / 1000),
      name: "Test clock for " + email,
    });

    customer = await stripe.customers.create({
      email: email,
      name: "Test Customer",
      test_clock: testClock.id,
    });
  }

  return customer;
}
