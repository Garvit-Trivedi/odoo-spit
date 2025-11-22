const WebhookConfig = require('../models/WebhookConfig');

/**
 * For hackathon: just logs active webhooks and payload.
 * In real app, you would POST to the URLs.
 */
const dispatchEvent = async (eventType, payload) => {
  const hooks = await WebhookConfig.find({ eventType, isActive: true });
  hooks.forEach((hook) => {
    console.log(
      `Webhook event ${eventType} would be sent to ${hook.url}`,
      payload
    );
  });
};

module.exports = { dispatchEvent };
