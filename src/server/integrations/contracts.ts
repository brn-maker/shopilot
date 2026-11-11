export type ShoppingQuery = {
  query: string;
};

export type ProductOffer = {
  merchant: string;
  merchantDomain: string;
  price: {
    amount: number;
    currency: string;
    display: string;
  };
  availability: "InStock" | "OutOfStock";
  productUrl: string;
  affiliateUrl: string;
  maxCommissionRate: number;
};

export type ProductCandidate = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  offer: ProductOffer;
};

export type ProductSearchProvider = {
  search(input: ShoppingQuery): Promise<ProductCandidate[]>;
};

export type ProductRecommendation = {
  productId: string;
  reason: string;
};

export type RecommendationSource = "deepseek" | "fallback";

export type RecommendationResult = {
  recommendations: ProductRecommendation[];
  source: RecommendationSource;
};

export type RecommendationProvider = {
  recommend(input: {
    query: string;
    candidates: ProductCandidate[];
  }): Promise<RecommendationResult>;
};

export type DemoCartItem = {
  productId: string;
  quantity: number;
};

export type PayPalOrderCreated = {
  orderId: string;
  status: "CREATED";
};

export type PayPalOrderCaptured = {
  orderId: string;
  status: "COMPLETED";
  amount: {
    value: string;
    currency: "USD";
  };
};

export type PayPalCheckoutProvider = {
  createOrder(input: {
    items: DemoCartItem[];
    requestId: string;
  }): Promise<PayPalOrderCreated>;
  captureOrder(input: { orderId: string }): Promise<PayPalOrderCaptured>;
};
