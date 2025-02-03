# GTM Integration for Shopify

This repository provides a comprehensive integration of Google Tag Manager (GTM) with Shopify. It focuses on handling e-commerce events and user consent management by leveraging both GTM and Shopify’s Customer Privacy API. Created by Corestad GmbH - https://corestad.com

---

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Configuration Variables](#configuration-variables)
  - [GTM Configuration (`gtmConfig`)](#gtm-configuration-gtmconfig)
  - [Privacy/Consent Configuration (`privacyConfig`)](#privacyconsent-configuration-privacyconfig)
  - [Custom Consent (`uConsent`)](#custom-consent-uconsent)
- [Code Overview](#code-overview)
  - [Theme Configuration (`cosd-tracker.js`)](#theme-configuration-cosd-trackerjs)
  - [Event Snippet (`cosd-ecom.liquid`)](#event-snippet-cosd-ecomliquid)
  - [Customer Events Configuration](#customer-events-configuration)
- [Event Tracking](#event-tracking)
- [Consent Management](#consent-management)
- [Customer Data Settings](#customer-data-settings)
- [Debugging](#debugging)
- [License](#license)
- [Disclaimer](#disclaimer)
- [Additional Notes](#additional-notes)

---

## Overview

The integration is designed to:
- Load and configure GTM based on user consent.
- Track various e-commerce events (e.g., product views, add-to-cart, and checkout events).
- Leverage Shopify’s Customer Privacy API for consent management.
- Dynamically adjust GTM behavior depending on the consent state.

---

## Installation

1. **Upload the Scripts:**
   - Upload `cosd-tracker.js` to your Shopify theme assets.
   - Add the `cosd-ecom.liquid` snippet into the Shopify theme snippets
   - Load `cosd-ecom.iquid` into your `theme.liquid` we recommend into the footer but consider the header if you have speed issues with the GTM loading. Example integration of `cosd-ecom.liquid` into `theme.liquid`:  
   ```js
   {% render 'cosd-ecom' %}
   ```
   - Update the configuration within the script variables as described below.
   - Replace the placeholder `GTM-XXXXXXX` in the configuration objects with your actual GTM container ID.

2. **Implement Customer Events:**
   - Create a new pixe in Settings > Customer events. Name is as you like.
   - To ensure proper functionality set within Customer privacy the "Permission" to "Not required" and "Data sale" to "Data collected does not qualify as data sales". Since our script should handle this we recommend these settings, but if you have connected shopify properly to your CMP this should make no difference. 
   - Paste the `settings_customer-events` snippet into the your newly created Pixel.
   - Adapt the configuration 
   - Update the configuration within the script variables as described below.
   - Replace the placeholder `GTM-XXXXXXX` in the configuration objects with your actual GTM container ID.

3. **Test the Integration:**
   - Enable debugging (see the [Debugging](#debugging) section) during development to verify that events and consent updates are logged as expected.

---

## Configuration Variables

### GTM Configuration (`gtmConfig`)

The `gtmConfig` object defines the basic settings for loading the GTM script:

```js
const gtmConfig = {
  gtm_id: 'GTM-XXXXXXX',             // Your GTM container ID
  gtm_url: 'https://www.googletagmanager.com/'  // URL from which GTM is loaded
};
```

## Privacy/Consent Configuration (`privacyConfig`)

This object governs how user consent is managed and dictates GTM’s behavior based on the current consent state. You can adjust these settings based on your store's privacy requirements.

- **`cs` (Consent Strict):**
  - `true`: GTM will only fire when explicit consent is provided.
  - `false`: GTM can initialize even without explicit consent (depending on other settings and Consent Mode).

- **`cm` (Consent Mode):**
  - `true`: Enables Consent Mode, allowing GTM to adjust behavior based on user consent signals.
  - `false`: GTM loads without applying any consent-based modifications.

- **`cgtm` (Consent Management via GTM):**
  - `true`: Indicates that consent management is integrated within the GTM container.
  - `false`: Consent must be handled externally, either via Shopify’s API or a custom solution.

- **`cshy` (Shopify Consent Handling):**
  - `true`: Utilizes Shopify’s built-in Privacy API to manage consent signals.
  - `false`: Relies on GTM or a custom consent solution instead of Shopify’s API.

- **`store_managed`:**
  - `true`: The store fully controls all consent settings, causing GTM to fire unconditionally.
  - `false`: The integration’s logic manages consent, meaning GTM firing depends on the configured consent states.

- **`store_implement`:**
  - `true`: Indicates that the GTM container is implemented directly by the store. In this case, the integration will not attempt to load GTM.
  - `false`: The integration will handle the GTM initialization.

- **`cm_default`:**
  - Defines the default consent state for various tracking categories. By default, all are set to `"denied"`:
    - `ad_storage`
    - `analytics_storage`
    - `ad_user_data`
    - `ad_personalization`

Example configuration:

```js
const privacyConfig = {
  cs: false,         // Lax mode: GTM may fire before explicit consent is obtained
  cm: true,          // Consent Mode is enabled
  cgtm: true,        // Consent is managed within the GTM container
  cshy: false,       // Shopify’s Privacy API is not used for consent management
  store_managed: false,
  store_implement: false,
  cm_default: {
    ad_storage: "denied",
    analytics_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  }
};
```

## Custom Consent (`uConsent`)

This variable provides a fallback or alternative consent configuration if you are managing consent via an external platform rather than relying solely on Shopify’s built-in Privacy API or GTM’s integrated consent management. It defines the initial state for various tracking and personalization categories, defaulting all values to `"denied"` until they are explicitly updated. This ensures that, by default, no tracking occurs until the proper consent is granted.

```js
let uConsent = {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied'
};
```

The `uConsent` object can be dynamically updated—via functions like `consentUpdate`—to reflect the user’s current consent choices. This update process ensures that GTM receives accurate signals about whether data tracking and personalization should be enabled.

---

## Code Overview

### Theme Configuration (`cosd-tracker.js`)

- **Initialization & Feature Loading:**
  - Uses `window.Shopify.loadFeatures` to load Shopify’s Customer Privacy API.
  - Depending on the `privacyConfig.cs` setting, GTM is either initialized immediately or waits for a consent event (`visitorConsentCollected`).

- **Consent Handling:**
  - Listens for consent events. If `cs` (Consent Strict) is `true`, GTM is loaded only after explicit consent is provided.
  - If `cs` is `false`, it calls `updateConsent` to adjust GTM’s behavior based on the latest privacy data.
  - Manages cookies and retrieves privacy settings through functions such as `defineConsentCookie`, `loadCookieConsentData`, and `loadPrivacySettings`.

- **GTM Initialization:**
  - The `initTagManager` function dynamically injects the GTM script using configuration details from `gtmConfig`.
  - A flag (`gtmLoaded`) prevents multiple initializations.

- **Event Tracking & Interception:**
  - The `_trackObj` function pushes event payloads into the GTM `dataLayer`.
  - The `determinePageEvent` function builds event payloads based on the page type (e.g., product, collection, cart).
  - Both `fetch` and `XMLHttpRequest` calls are intercepted to capture add-to-cart and remove-from-cart events.

### Event Snippet (`cosd-ecom.liquid`)

- **Global Setup:**
  - Initializes the global `dataLayer` and defines the `gtag` function.
  - Constructs a global `cosd` object populated with Shopify-specific data (e.g., page title, template, shop name, currency, product details, cart items).

- **Script Loading:**
  - Uses the helper function `loadScript` to asynchronously load `cosd-tracker.js`.
  - Once loaded, it triggers `determinePageEvent` to capture initial page view events and fires additional events (like `sh_info`) if user data is present.

### Customer Events Configuration

- **Checkout & Purchase Tracking:**
  - Subscribes to events such as `checkout_completed`, `checkout_started`, `payment_info_submitted`, and `checkout_shipping_info_submitted`.
  - The `checkoutEcom` function compiles comprehensive e-commerce transaction details.
  - The `getUserData` function securely hashes sensitive customer data using SHA-256 before dispatching it to GTM.
  - These events are then pushed to the GTM `dataLayer` via `_trackObj`.

- **Consent Updates:**
  - Functions like `setDefaultConsent` and `consentUpdate` ensure that GTM’s consent state is updated in real time based on either Shopify’s settings or the custom consent provided by `uConsent`.



## Event Tracking

- **Dispatching Events:**
  - All events—from page views to cart updates and checkout processes—are dispatched to the GTM `dataLayer` using the `_trackObj` function.
- **Interception of Network Requests:**
  - The integration intercepts network requests (using both `fetch` and `XMLHttpRequest`) to accurately capture cart modifications, ensuring that add-to-cart and remove-from-cart events are reliably tracked.


## Consent Management

- **Initial Consent Handling:**
  - The integration leverages Shopify’s Customer Privacy API to load user consent settings upon page load.
- **Dynamic Updates:**
  - As users change their consent preferences, functions such as `setDefaultConsent` and `consentUpdate` dynamically update GTM’s consent state.
- **Operational Modes:**
  - **Strict Mode (`cs: true`):** GTM is fired only once explicit consent is provided.
  - **Lax Mode (`cs: false`):** GTM may initialize before explicit consent, with updates applied later as consent changes.

## Customer Data Settings

The **sh_info** event is a key component of the integration that captures and transmits customer data to your GTM container via the dataLayer. This event is typically fired from the `cosd-ecom.liquid` snippet once the main tracking script (`cosd-tracker.js`) has loaded.

### When is it Triggered?
- The **sh_info** event is fired if user data is available (e.g., when a customer is logged in).
- In the Shopify Liquid template, the global `cosd` object is populated with customer details (if available), including hashed values for sensitive data.

### What Data Does It Include?
- **Hashed Customer Information:**  
  The event carries hashed versions of the customer's email, first name, and last name, generated using the SHA-256 algorithm to protect privacy.
- **Optional Plain Email:**  
  Depending on your configuration, the event may also include the plain email address for segmentation and personalization.

### Purpose and Use Cases
- **Enhanced Analytics:**  
  The event allows you to associate user-specific data with their browsing and purchasing behavior, creating more accurate customer profiles.
- **Personalization and Segmentation:**  
  Capturing user data helps tailor marketing strategies, create personalized campaigns, or build custom audiences in your analytics platform.
- **Privacy Compliance:**  
  Hashing sensitive customer information ensures useful data is transmitted while maintaining individual privacy.

### How It Works in the Code
- Once the main tracking script loads, the **sh_info** event is triggered by calling:
```js
_trackObj({ event: 'sh_info', user_data: cosd.user_data });
```
- The `cosd.user_data` object is constructed in the Liquid template when a customer is logged in. This ensures that the **sh_info** event is only sent if user data is available.

### How to Deactivate the sh_info Event
If you decide that you do not need to track the **sh_info** event, you can easily deactivate it. There are a couple of approaches you might take:

1. **Comment Out or Remove the Event Trigger:**
   - Locate the line in your `cosd-ecom.liquid` snippet (or wherever the event is fired) that calls the **sh_info** event. It typically looks like this:
```js
_trackObj({ event: 'sh_info', user_data: cosd.user_data });
```
   - Simply comment out or remove this line to prevent the event from being sent to the dataLayer.

2. **Control via a Configuration Flag:**
   - Introduce a configuration flag (e.g., `track_sh_info`) in your settings. For example:
```js
const track_sh_info = false; // Set to false to disable the sh_info event.
```
   - Then, wrap the event trigger in a conditional statement:
```js
if (track_sh_info && cosd.user_data) {
  _trackObj({ event: 'sh_info', user_data: cosd.user_data });
}
```
   - This approach allows you to easily enable or disable the event without modifying multiple parts of your code.

By following one of these methods, you can deactivate the **sh_info** event if it’s not needed, ensuring that only the desired data is tracked and transmitted.


## Debugging
- **Debug Flag:**
  - The `debug` variable (set to `false` by default) can be enabled (set to `true`) to activate detailed logging via the `debugLog` function.
- **Logging Details:**
  - Debug logs provide insights into the consent flow, GTM initialization, and event tracking processes—helpful for troubleshooting during development.


## Additional Notes

- **Customization:**
  - Modify the settings in `gtmConfig`, `privacyConfig`, and `uConsent` to match your store’s privacy policies and consent management requirements.
- **Further Documentation:**
  - We do not provie support for this integration, in case you require assistance, please contact us through our webiste [corestad.com](https://corestad.com).


## License

This project is licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. You may obtain a copy of the License at:

[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.


## Disclaimer
This code is provided as-is. Ensure compliance with local regulations (GDPR, CCPA, etc.) when managing user consent and data collection.
