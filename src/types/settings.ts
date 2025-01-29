export interface WaterPrices {
  regularPrice: number;
  alkalinePrice: number;
  updatedAt: string;
  updatedBy?: string;
  notes?: string;
}

export interface Settings {
  waterPrices: WaterPrices | null;
  priceHistory: WaterPrices[];
} 