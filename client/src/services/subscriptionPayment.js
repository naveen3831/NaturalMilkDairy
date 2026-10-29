import { api, getApiUrl } from './api';

/**
 * Loads Razorpay checkout.js script asynchronously
 */
export const loadRazorpay = () =>
  new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

/**
 * Fetch customer's subscription history
 */
export async function getSubscriptionHistory() {
  try {
    const res = await api.get('/api/customers/me/subscriptions');
    const data = await res.json();
    if (data && data.success && Array.isArray(data.subscriptions)) {
      return data.subscriptions;
    }
    // Fallback route
    const fallbackRes = await api.get('/api/subscriptions/my');
    const fallbackData = await fallbackRes.json();
    if (fallbackData && fallbackData.success && Array.isArray(fallbackData.subscriptions)) {
      return fallbackData.subscriptions;
    }
    return [];
  } catch (err) {
    console.error('Failed to get subscription history:', err);
    return [];
  }
}

/**
 * Report subscription failure / cancellation to server
 */
export async function reportSubscriptionFailure(orderId, reason = 'Payment dismissed') {
  try {
    const res = await api.post('/api/customers/me/subscription/fail', {
      orderId,
      reason,
    });
    return await res.json();
  } catch (err) {
    console.warn('Could not report subscription failure:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Start full Razorpay checkout flow for a subscription (new, upgrade, extend)
 */
export async function startSubscriptionPayment(params = {}) {
  const {
    planPayload,
    user,
    purpose = 'new',
    days,
    milkQty,
    curdQty,
    milkType,
    frequency,
    planName,
    extraProducts,
    address,
    area,
    landmark,
    whatsapp,
    mobile,
    name,
    customerName,
    email,
    onOrderCreated,
    onSuccess,
    onFailure,
    onError,
    onDismiss,
  } = params;

  const triggerFailure = (info) => {
    if (typeof onFailure === 'function') onFailure(info);
    if (typeof onError === 'function') {
      const err = info?.error instanceof Error ? info.error : new Error(info?.reason || 'Payment failed or was cancelled.');
      onError(err);
    }
  };

  const isLoaded = await loadRazorpay();
  if (!isLoaded) {
    const err = new Error('Unable to connect to Razorpay payment gateway. Please check your internet connection and try again.');
    triggerFailure({ reason: err.message, error: err });
    throw err;
  }

  // Construct unified order payload
  const resolvedPurpose = params.purpose || planPayload?.purpose || 'new';
  const bodyPayload = {
    ...(planPayload || {}),
    purpose: resolvedPurpose,
  };

  if (days !== undefined || planPayload?.days !== undefined) {
    bodyPayload.days = days !== undefined ? days : planPayload.days;
  }
  if (milkQty !== undefined || planPayload?.milkQty !== undefined) {
    bodyPayload.milkQty = milkQty !== undefined ? milkQty : planPayload.milkQty;
  }
  if (curdQty !== undefined || planPayload?.curdQty !== undefined) {
    bodyPayload.curdQty = curdQty !== undefined ? curdQty : planPayload.curdQty;
  }
  if (milkType || planPayload?.milkType) {
    bodyPayload.milkType = milkType || planPayload.milkType;
  }
  if (frequency || planPayload?.frequency) {
    bodyPayload.frequency = frequency || planPayload.frequency;
  }
  if (planName || planPayload?.planName) {
    bodyPayload.planName = planName || planPayload.planName;
  }
  if (extraProducts !== undefined || planPayload?.extraProducts !== undefined) {
    bodyPayload.extraProducts = extraProducts !== undefined ? extraProducts : planPayload.extraProducts;
  }

  // Contact and delivery details
  const finalAddress = address || planPayload?.address || user?.address || 'Doorstep Delivery';
  const finalArea = area || planPayload?.area || user?.area || user?.assignedArea || 'Madhapur';
  const finalLandmark = landmark || planPayload?.landmark || user?.landmark || '';
  const finalMobile = mobile || planPayload?.mobile || user?.mobile || '';
  const finalWhatsapp = whatsapp || planPayload?.whatsapp || user?.whatsapp || finalMobile;
  const finalName = name || customerName || planPayload?.name || planPayload?.customerName || user?.name || 'Valued Customer';
  const finalEmail = email || planPayload?.email || user?.email || '';

  bodyPayload.address = finalAddress;
  bodyPayload.area = finalArea;
  bodyPayload.landmark = finalLandmark;
  bodyPayload.mobile = finalMobile;
  bodyPayload.whatsapp = finalWhatsapp;
  bodyPayload.name = finalName;
  if (finalEmail) bodyPayload.email = finalEmail;

  // 1. Create order on server
  const orderRes = await api.post('/api/customers/me/subscription/order', bodyPayload);
  const orderData = await orderRes.json();

  if (!orderRes.ok || !orderData.success) {
    const errorMsg = orderData.message || 'Could not initiate subscription order.';
    const err = new Error(errorMsg);
    triggerFailure({ reason: errorMsg, error: err });
    throw err;
  }

  const { order, subscription } = orderData;
  if (typeof onOrderCreated === 'function') {
    onOrderCreated({ order, subscription });
  }

  let paymentResolved = false;

  const keyId = order.keyId || order.key || 'rzp_test_TZpr4ebY4Qvo8k';
  const description =
    resolvedPurpose === 'upgrade'
      ? `Subscription Upgrade - ${bodyPayload.planName || `${bodyPayload.milkQty || 1}L Plan`}`
      : resolvedPurpose === 'extend'
      ? `Subscription Extension (+${bodyPayload.days || 30} Days)`
      : '30-Day Fresh Morning Milk Delivery';

  const options = {
    key: keyId,
    amount: order.amount,
    currency: order.currency || 'INR',
    name: 'Natural Milk Dairy',
    description,
    order_id: order.id,
    prefill: {
      name: finalName,
      contact: finalMobile || finalWhatsapp,
      email: finalEmail,
    },
    theme: {
      color: '#0d5c3a',
    },
    modal: {
      ondismiss: async () => {
        if (!paymentResolved) {
          paymentResolved = true;
          const reason = 'Payment window was closed before completion.';
          await reportSubscriptionFailure(order.id, reason);
          if (typeof onDismiss === 'function') {
            onDismiss({ orderId: order.id, reason, order, subscription });
          }
          triggerFailure({ orderId: order.id, reason, order, subscription, error: new Error(reason) });
        }
      },
    },
    handler: async (response) => {
      paymentResolved = true;
      try {
        const verifyRes = await api.post('/api/customers/me/subscription/verify', {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData.success) {
          const verifyErr = verifyData.message || 'Payment verification failed.';
          await reportSubscriptionFailure(order.id, verifyErr);
          triggerFailure({ orderId: order.id, reason: verifyErr, order, subscription, error: new Error(verifyErr) });
          return;
        }

        if (typeof onSuccess === 'function') {
          onSuccess({
            response,
            subscription: verifyData.subscription || subscription,
            order,
            message: verifyData.message,
          });
        }
      } catch (err) {
        const errMsg = err.message || 'Payment verification failed.';
        await reportSubscriptionFailure(order.id, errMsg);
        triggerFailure({ orderId: order.id, reason: errMsg, order, subscription, error: err });
      }
    },
  };

  const rzp = new window.Razorpay(options);

  rzp.on('payment.failed', async (failedResponse) => {
    paymentResolved = true;
    const reason = failedResponse.error?.description || 'Payment failed at gateway';
    await reportSubscriptionFailure(order.id, reason);
    triggerFailure({
      orderId: order.id,
      reason,
      code: failedResponse.error?.code,
      error: failedResponse.error || new Error(reason),
      order,
      subscription,
    });
  });

  rzp.open();
  return { order, subscription, rzp };
}
