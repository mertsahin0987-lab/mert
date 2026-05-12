/**
 * UK VAT helpers.
 *
 * All prices stored in the database are INC-VAT (the price a consumer
 * actually pays). UK professional barbers are VAT-registered and care
 * about the ex-VAT price too — they can reclaim the VAT element. So
 * everywhere we display a price, we show inc-VAT prominently and ex-VAT
 * underneath.
 */

const VAT_RATE = 0.20;

export function exVat(incVatPrice: number): number {
  return Math.round((incVatPrice / (1 + VAT_RATE)) * 100) / 100;
}

export function formatPrice(price: number): string {
  return `£${price.toFixed(2)}`;
}
