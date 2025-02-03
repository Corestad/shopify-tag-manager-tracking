/*
Corestad GTM Integration for Shopify

Copyright (c) 2025 Corestad GmbH. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at:

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Author: Corestad GmbH 
Website: https://corestad.com */

// --- Global Setup ---
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }

const debug = false; // Set to false to disable debugging logs
const debugLog = (message, data = null) => {
  if (debug) console.log(`[DEBUG]: ${message}`, data || "");
};

// --- Configuration Settings ---
const gtmConfig = {
  gtm_id: 'GTM-XXXXXXX',
  gtm_url: 'https://www.googletagmanager.com/'
};

const privacyConfig = {
  cs: false,           // Strict: Only fire if explicit consent is available.
  cm: true,            // Consent Mode enabled.
  cgtm: true,          // CMP is loaded within GTM.
  cshy: false,         // Use Shopify Privacy API for consent management.
  store_managed: false, // All consent settings handled by the store.
  store_implement: false, // GTM container is not placed by the store.
  cm_default: {
    ad_storage: "denied",
    analytics_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  }
};

// Fallback consent for custom/external consent management.
let uConsent = {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied'
};

const checkoutPages = /\/(checkouts|orders)/.test(document.location.href);

// --- Helper Functions ---
function hasRequiredConsent(consent) {
  return consent &&
         consent.ad_storage === "granted" &&
         consent.analytics_storage === "granted";
}

// --- Cookie & Privacy Data Loading ---
async function loadCookieConsentData() {
  const cookieNames = ["_tracking_consent", "_cmp_a", "_shp_cmp"];
  for (const name of cookieNames) {
    const value = await browser.cookie.get(name);
    if (value) return value;
  }
  return undefined;
}

async function loadPrivacySettings() {
  const cookieConsentData = await loadCookieConsentData();
  if (!cookieConsentData) return privacyConfig;
  const shopifyConsent = JSON.parse(decodeURIComponent(cookieConsentData)).purposes;
  const loadedPrivacySettings = {
    ad_storage: shopifyConsent.m ? "granted" : "denied",
    analytics_storage: shopifyConsent.a ? "granted" : "denied",
    ad_user_data: shopifyConsent.m ? "granted" : "denied",
    ad_personalization: shopifyConsent.m ? "granted" : "denied"
  };
  return Object.assign({}, privacyConfig, { cm_shfy: loadedPrivacySettings });
}

// --- Core Functions ---
async function initAllScripts() {
  const dPrivacy = (await loadPrivacySettings()) || {};

  // If store-managed, fire GTM unconditionally.
  if (privacyConfig.store_managed && !privacyConfig.store_implement) {
    initTagManager();
    return;
  }
  if (privacyConfig.store_implement) return;

  // --- Lax Mode ---
  if (!dPrivacy.cs) {
    debugLog('Privacy is set to Lax');
    if (dPrivacy.cm) {
      debugLog('Consent Mode is Enabled');
      if (dPrivacy.cgtm) {
        debugLog('CMP is managed through GTM');
        initTagManager();
      } else if (dPrivacy.cshy) {
        debugLog('Shopify is used for Consent Signals');
        setDefaultConsent(dPrivacy.cm_default);
        initTagManager();
        consentUpdate(dPrivacy.cm_shfy || {});
        _trackObj({ event: 'consent_update', consent_states: dPrivacy.cm_shfy || {} });
      } else {
        debugLog('Custom Event Management is used');
        setDefaultConsent(uConsent);
        initTagManager();
        consentUpdate(uConsent);
        _trackObj({ event: 'consent_update', consent_states: uConsent });
      }
    } else {
      debugLog('Consent Mode is off');
      if (dPrivacy.cgtm) {
        debugLog('CMP is managed through GTM');
        initTagManager();
      } else if (dPrivacy.cshy) {
        debugLog('Shopify is used for Consent Signals');
        initTagManager();
        _trackObj({ event: 'consent_update', consent_states: dPrivacy.cm_shfy || {} });
      } else {
        debugLog('Custom Event Management is used');
        initTagManager();
        _trackObj({ event: 'consent_update', consent_states: uConsent });
      }
    }
  }
  // --- Strict Mode ---
  else {
    debugLog('Privacy is set to Strict');
    if (dPrivacy.cm) {
      debugLog('Consent Mode is Enabled');
      if (dPrivacy.cgtm) {
        debugLog('CMP is managed through GTM');
        if (hasRequiredConsent(dPrivacy.cm_shfy)) {
          initTagManager();
        } else {
          debugLog('No consent set');
        }
      } else if (dPrivacy.cshy) {
        debugLog('Shopify is used for Consent Signals');
        if (hasRequiredConsent(dPrivacy.cm_shfy)) {
          setDefaultConsent(dPrivacy.cm_default);
          initTagManager();
          consentUpdate(dPrivacy.cm_shfy || {});
          _trackObj({ event: 'consent_update', consent_states: dPrivacy.cm_shfy || {} });
        } else {
          debugLog('No consent set');
        }
      } else {
        if (hasRequiredConsent(uConsent)) {
          setDefaultConsent(uConsent);
          initTagManager();
          consentUpdate(uConsent);
          _trackObj({ event: 'consent_update', consent_states: uConsent });
        } else {
          debugLog('No consent set');
        }
      }
    } else {
      debugLog('Consent Mode is off');
      if (dPrivacy.cgtm) {
        debugLog('CMP is managed through GTM');
        if (hasRequiredConsent(dPrivacy.cm_shfy)) {
          initTagManager();
        } else {
          debugLog('No consent set');
        }
      } else if (dPrivacy.cshy) {
        debugLog('Shopify is used for Consent Signals');
        if (hasRequiredConsent(dPrivacy.cm_shfy)) {
          initTagManager();
          _trackObj({ event: 'consent_update', consent_states: dPrivacy.cm_shfy || {} });
        } else {
          debugLog('No consent set');
        }
      } else {
        if (hasRequiredConsent(uConsent)) {
          debugLog('Custom Event Management is used');
          initTagManager();
          _trackObj({ event: 'consent_update', consent_states: uConsent });
        } else {
          debugLog('No consent set');
        }
      }
    }
  }
}

function setDefaultConsent(consentSettings) {
  if (gtmLoaded) return;
  debugLog("Default Consent Set");
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'defaultConsent',
    'gtm.consent': { ...consentSettings }
  });
}

async function consentUpdate(updatedPrivacy) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'consentUpdate',
    'gtm.consent': {
      ad_storage: updatedPrivacy.ad_storage,
      analytics_storage: updatedPrivacy.analytics_storage,
      ad_user_data: updatedPrivacy.ad_user_data,
      ad_personalization: updatedPrivacy.ad_personalization
    }
  });
  try {
    uConsent = { ...updatedPrivacy };
    currentConsents = { ...updatedPrivacy };
  } catch (e) {
    debugLog("Error updating uConsent variable: ", e);
  }
  debugLog("Consent updates: ", updatedPrivacy);
}

function initTagManager() {
  if (gtmLoaded) return;
  (function(w, d, s, l, i, p) {
    w[l] = w[l] || [];
    w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    const f = d.getElementsByTagName(s)[0];
    const j = d.createElement(s);
    const dl = l !== "dataLayer" ? "&l=" + l : "";
    j.async = true;
    j.src = p + "gtm.js?id=" + i + dl;
    f.parentNode.insertBefore(j, f);
  })(window, document, "script", "dataLayer", gtmConfig?.gtm_id, gtmConfig?.gtm_url);
  debugLog('GTM initialised');
  gtmLoaded = true;
}

// --- Track Object Function (Declared Only Once) ---
const _trackObj = (eventPayload) => {
  debugLog(`Tracking event: ${eventPayload.event}`, eventPayload);
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(eventPayload);
  debugLog("Event pushed to dataLayer", eventPayload);
};

const determinePageEvent = () => {
  const template = cosd.template_name.toLowerCase();
  let eventPayload = null;
  if (template.includes("product")) {
    eventPayload = {
      event: "view_item",
      ecommerce: {
        currency: cosd.currency,
        value: cosd.items[0]?.price || 0,
        items: cosd.items
      }
    };
  } else if (template.includes("collection")) {
    eventPayload = {
      event: "view_item_list",
      ecommerce: {
        item_list_name: cosd.collection?.collection_title || "",
        item_list_id: cosd.collection?.collection_id || "",
        items: cosd.items
      }
    };
  } else if (template.includes("cart")) {
    eventPayload = {
      event: "view_cart",
      ecommerce: {
        currency: cosd.currency,
        value: cosd.total || 0,
        items: cosd.cart_items
      }
    };
  }
  if (eventPayload) _trackObj(eventPayload);
};

// --- Network Request Interception ---
(function interceptFetch() {
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("/cart/add") || url.includes("/cart/change")) {
      const isAdd = url.includes("/cart/add");
      const eventType = isAdd ? "add_to_cart" : "remove_from_cart";
      try {
        const response = await originalFetch(input, init);
        if (response.ok) {
          const clonedResponse = response.clone();
          const data = await clonedResponse.json();
          emitCartEvent(eventType, data);
        }
        return response;
      } catch (error) {
        console.error(`[ERROR] Intercepting ${eventType}:`, error);
        throw error;
      }
    }
    return originalFetch.apply(this, arguments);
  };
})();

function emitCartEvent(eventType, data) {
  let items = [];
  let totalValue = 0;
  if (Array.isArray(data.items)) {
    items = data.items.map(item => ({
      item_id: item.product_id,
      item_name: item.product_title || item.title,
      item_brand: item.vendor,
      item_category: item.product_type || "",
      item_variant: item.variant_id,
      price: item.price / 100,
      quantity: item.quantity
    }));
    totalValue = data.total_price / 100;
  } else {
    items = [{
      item_id: data.product_id,
      item_name: data.product_title || data.title,
      item_brand: data.vendor,
      item_category: data.product_type || "",
      item_variant: data.variant_id,
      price: data.price / 100,
      quantity: data.quantity
    }];
    totalValue = (data.price * data.quantity) / 100;
  }
  const eventPayload = {
    event: eventType,
    ecommerce: {
      currency: cosd.currency,
      value: totalValue,
      items: items
    }
  };
  debugLog(`${eventType} event captured`, eventPayload);
  _trackObj(eventPayload);
}

(function interceptXHR() {
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    this.addEventListener("load", function() {
      if (url.includes("/cart/add") || url.includes("/cart/change")) {
        const isAdd = url.includes("/cart/add");
        const eventType = isAdd ? "add_to_cart" : "remove_from_cart";
        try {
          const responseData = JSON.parse(this.responseText);
          emitCartEvent(eventType, responseData);
        } catch (error) {
          console.error(`[ERROR] Parsing XHR response for ${eventType}:`, error);
        }
      }
    });
    originalOpen.apply(this, arguments);
  };
})();

// --- Checkout & Customer Data Handling ---
const checkoutEcom = (event) => ({
  transaction_id: event.data?.checkout?.order?.id || null,
  currency: event.data?.checkout?.currencyCode,
  shipping: event.data?.checkout?.shippingLine?.price?.amount || 0,
  value: event.data?.checkout?.totalPrice?.amount || 0,
  discount: event.data?.checkout?.discountApplications[0]?.amount || 0,
  coupon: event.data?.checkout?.discountApplications[0]?.title || null,
  tax: event.data?.checkout?.totalTax?.amount || 0,
  items: (event.data?.checkout?.lineItems || []).map(item => ({
    item_id: item.variant?.product?.id,
    variant_id: item.variant?.id,
    item_name: item.title,
    coupon: item.discountAllocations?.discountApplication?.title,
    discount: item.discountAllocations?.amount?.amount,
    item_variant: item.variant?.title,
    price: item.variant?.price?.amount,
    quantity: item.quantity,
    item_brand: item.variant?.product?.vendor,
    item_category: item.variant?.product?.type
  }))
});

const getUserData = async (usrData) => {
  const [shaEmail, shaFirstName, shaLastName] = await Promise.all([
    sha256(usrData.email),
    sha256(usrData.firstName),
    sha256(usrData.lastName)
  ]);
  return {
    sha256_email_address: shaEmail,
    sha256_first_name: shaFirstName,
    sha256_last_name: shaLastName,
    email: usrData?.email,
    first_name: usrData?.shippingAddress?.firstName,
    last_name: usrData?.shippingAddress?.lastName,
    phone: usrData?.phone,
    country: usrData?.shippingAddress?.country
  };
};

if (checkoutPages) initAllScripts();

// --- Analytics Event Subscriptions ---
analytics.subscribe("checkout_completed", async (event) => {
  const userData = await getUserData(event.data?.checkout || {});
  const eventValues = {
    event: "purchase",
    ecommerce: checkoutEcom(event) || {},
    user_data: userData,
    page_location: event.context.document.location.href,
    id: event.id,
    timestamp: event.timestamp,
    token: event.data?.checkout?.token,
    client_id: event.clientId
  };
  _trackObj(eventValues);
});

analytics.subscribe("checkout_started", async (event) => {
  const userData = await getUserData(event.data?.checkout || {});
  const eventValues = {
    event: "begin_checkout",
    ecommerce: checkoutEcom(event) || {},
    user_data: userData,
    page_location: event.context.document.location.href,
    id: event.id,
    timestamp: event.timestamp,
    token: event.data?.checkout?.token,
    client_id: event.clientId
  };
  _trackObj(eventValues);
});

analytics.subscribe("payment_info_submitted", async (event) => {
  const userData = await getUserData(event.data?.checkout || {});
  const eventValues = {
    event: "add_payment_info",
    ecommerce: checkoutEcom(event) || {},
    user_data: userData,
    page_location: event.context.document.location.href,
    id: event.id,
    timestamp: event.timestamp,
    token: event.data?.checkout?.token,
    client_id: event.clientId
  };
  _trackObj(eventValues);
});

analytics.subscribe("checkout_shipping_info_submitted", async (event) => {
  const userData = await getUserData(event.data?.checkout || {});
  const eventValues = {
    event: "add_shipping_info",
    ecommerce: checkoutEcom(event) || {},
    user_data: userData,
    page_location: event.context.document.location.href,
    id: event.id,
    timestamp: event.timestamp,
    token: event.data?.checkout?.token,
    client_id: event.clientId
  };
  _trackObj(eventValues);
});

// --- Utility Tools ---
async function sha256(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgUint8);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function defConsentAttributes(obj) {
  for (let k in obj) {
    obj[k] = obj[k] === true ? "granted" : "denied";
  }
  return obj;
}
