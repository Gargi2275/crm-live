interface RazorpayOptions {
  key: string;
  amount?: number;
  currency?: string;
  name?: string;
  image?: string;
  description?: string;
  order_id?: string;
  handler?: (response: any) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  [key: string]: any;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on?: (eventName: string, callback: (event: any) => void) => void;
    };
  }
}

export {};