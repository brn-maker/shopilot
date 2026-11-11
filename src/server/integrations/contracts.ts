export type ShoppingQuery = {
  query: string;
};

export type ProductCandidate = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  merchant: string;
  productUrl: string;
  imageUrl?: string;
};

export type ProductSearchProvider = {
  search(input: ShoppingQuery): Promise<ProductCandidate[]>;
};

export type ProductRecommendation = {
  productId: string;
  reason: string;
};

export type RecommendationProvider = {
  recommend(input: {
    query: string;
    candidates: ProductCandidate[];
  }): Promise<ProductRecommendation[]>;
};

export type CheckoutItem = {
  productId: string;
  quantity: number;
};

export type CheckoutProvider = {
  createCheckout(input: {
    items: CheckoutItem[];
  }): Promise<{ redirectUrl: string }>;
};
