"use client";

import { useEffect, useRef, useState } from "react";

type PayPalButtonsOptions = {
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onCancel: () => void;
  onError: () => void;
};

type PayPalSdk = {
  Buttons: (
    options: PayPalButtonsOptions,
  ) => {
    render: (target: HTMLElement) => Promise<unknown>;
    close: () => Promise<void>;
  };
};

declare global {
  interface Window {
    paypal?: PayPalSdk;
  }
}

type CheckoutState = "loading" | "ready" | "working" | "complete" | "error";

async function responseError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }
  return "Sandbox checkout is temporarily unavailable.";
}

export default function PayPalSandboxCheckout() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [state, setState] = useState<CheckoutState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/checkout/config", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Checkout configuration unavailable");
        const body: unknown = await response.json();
        if (
          typeof body !== "object" ||
          body === null ||
          !("clientId" in body) ||
          (body.clientId !== null && typeof body.clientId !== "string")
        ) {
          throw new Error("Checkout configuration unavailable");
        }
        return body.clientId;
      })
      .then((id) => {
        if (!active) return;
        if (typeof id !== "string" || !id) {
          setState("error");
          setMessage("PayPal Sandbox credentials are not configured.");
          return;
        }
        setClientId(id);
        setState("ready");
      })
      .catch(() => {
        if (!active) return;
        setState("error");
        setMessage("PayPal Sandbox configuration could not be loaded.");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!clientId) return;

    const script = document.createElement("script");
    const source = new URL("https://www.paypal.com/sdk/js");
    source.searchParams.set("client-id", clientId);
    source.searchParams.set("currency", "USD");
    source.searchParams.set("intent", "capture");
    script.src = source.toString();
    script.async = true;
    script.onload = () => setSdkLoaded(true);
    script.onerror = () => {
      setState("error");
      setMessage("PayPal Sandbox buttons could not be loaded.");
    };
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [clientId]);

  useEffect(() => {
    if (!sdkLoaded || !window.paypal || !containerRef.current) return;

    const buttons = window.paypal.Buttons({
      createOrder: async () => {
        setState("working");
        setMessage("");
        const response = await fetch("/api/checkout/orders", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            requestId: crypto.randomUUID(),
            items: [{ productId: "sandbox-demo-item", quantity: 1 }],
          }),
        });
        if (!response.ok) throw new Error(await responseError(response));
        const body: unknown = await response.json();
        if (
          typeof body !== "object" ||
          body === null ||
          !("orderId" in body) ||
          typeof body.orderId !== "string"
        ) {
          throw new Error("Could not start the Sandbox checkout.");
        }
        return body.orderId;
      },
      onApprove: async ({ orderID }) => {
        setState("working");
        const response = await fetch("/api/checkout/capture", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderId: orderID }),
        });
        if (!response.ok) throw new Error(await responseError(response));
        setState("complete");
        setMessage("Sandbox order captured. No item will be fulfilled.");
      },
      onCancel: () => {
        setState("ready");
        setMessage("Checkout cancelled. No payment was captured.");
      },
      onError: () => {
        setState("error");
        setMessage("Sandbox checkout failed. Please try again.");
      },
    });

    void buttons.render(containerRef.current).catch(() => {
      setState("error");
      setMessage("PayPal Sandbox buttons could not be rendered.");
    });

    return () => {
      void buttons.close();
    };
  }, [sdkLoaded]);

  return (
    <section aria-labelledby="sandbox-checkout-title" className="sandbox-checkout">
      <div className="sandbox-checkout-heading">
        <span className="step-icon step-icon--pay">P</span>
        <div>
          <h4 id="sandbox-checkout-title">Try a demo checkout</h4>
          <p>Server-priced sample item · $1.00 USD</p>
        </div>
      </div>
      <p className="sandbox-checkout-notice">
        Sandbox demo checkout — no real fulfillment or merchant purchase.
      </p>
      {state === "loading" && <p className="checkout-status">Checking Sandbox setup…</p>}
      {state === "ready" && !sdkLoaded && (
        <p className="checkout-status">Loading PayPal Sandbox…</p>
      )}
      {state === "working" && <p aria-live="polite" className="checkout-status">Waiting for PayPal…</p>}
      {state === "complete" && (
        <p aria-live="polite" className="checkout-status checkout-status--success">{message}</p>
      )}
      {state === "error" && (
        <p aria-live="polite" className="checkout-status checkout-status--error">{message}</p>
      )}
      {clientId && sdkLoaded && (
        <div hidden={state !== "ready"} ref={containerRef} />
      )}
      {state === "ready" && !clientId && (
        <p className="checkout-status">Configure PayPal Sandbox credentials to enable checkout.</p>
      )}
      {state === "error" && (
        <button
          className="checkout-retry"
          onClick={() => window.location.reload()}
          type="button"
        >
          Reload checkout
        </button>
      )}
    </section>
  );
}
