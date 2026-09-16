# Mobile Notifications

## Outcome

Notify mobile users about urgent account activity while allowing them to control notification categories.

## Work completed

- Added device-token registration and cleanup.
- Built notification preferences.
- Implemented delivery tracking for iOS and Android.

## Delivery notes

The project took nine engineering days. Expired device tokens caused unexpected retry work.

## Risks and lessons

- Design token cleanup before enabling high-volume sends.
- Test permission states on both mobile platforms.
- Separate critical security alerts from optional product notifications.
