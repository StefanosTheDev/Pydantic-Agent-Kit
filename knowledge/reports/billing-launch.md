# Billing Launch

## Outcome

Launch self-service subscriptions for small-business customers and replace manual invoice requests.

## Work completed

- Integrated Stripe Checkout and customer portal.
- Added receipt emails and failed-payment notifications.
- Updated pricing-page calls to action.

## Delivery notes

The project took eight engineering days. Payment-webhook edge cases added two days beyond the first estimate.

## Risks and lessons

- Confirm webhook retry behavior before estimating integration work.
- Test tax settings with production-like accounts early.
- Keep pricing copy changes separate from payment-state logic.
