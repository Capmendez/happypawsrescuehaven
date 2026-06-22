/**
 * FLUTTERWAVE HELPER FUNCTIONS
 * 
 * Provides functions to dynamically inject the Flutterwave Inline script 
 * and trigger client-side payment workflows.
 */

export interface FlutterwaveConfig {
  public_key: string;
  tx_ref: string;
  amount: number;
  currency: string;
  payment_options: string;
  customer: {
    email: string;
    phone_number?: string;
    name: string;
  };
  customizations: {
    title: string;
    description: string;
    logo?: string;
  };
}

/**
 * Loads the Flutterwave inline SDK script dynamically.
 */
export const loadFlutterwaveScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).FlutterwaveCheckout) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.flutterwave.com/v3.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Triggers the Flutterwave Checkout modal interface.
 */
export const processPayment = async ({
  amount,
  email,
  name,
  txRef,
  callback,
  onClose,
}: {
  amount: number;
  email: string;
  name: string;
  txRef: string;
  callback: (response: any) => void;
  onClose: () => void;
}) => {
  const isScriptLoaded = await loadFlutterwaveScript();
  if (!isScriptLoaded) {
    console.error('Failed to load Flutterwave checkout SDK');
    alert('Payment system is temporarily offline. Please try again.');
    return;
  }

  const publicKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK_TEST-placeholder-key';

  const config: FlutterwaveConfig = {
    public_key: publicKey,
    tx_ref: txRef,
    amount,
    currency: 'USD', // Default currency
    payment_options: 'card,banktransfer',
    customer: {
      email,
      name,
    },
    customizations: {
      title: 'Happy Paws Rescue Haven',
      description: 'Adoption Fee / Donation Payment',
      logo: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=200&h=200', // dog photo
    },
  };

  const paymentConfig = {
    ...config,
    callback: (data: any) => {
      console.log('Flutterwave payment success:', data);
      callback(data);
    },
    onclose: () => {
      console.log('Flutterwave modal dismissed');
      onClose();
    },
  };

  (window as any).FlutterwaveCheckout(paymentConfig);
};
export default processPayment;
