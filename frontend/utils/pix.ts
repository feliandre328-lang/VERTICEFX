/**
 * Atualiza o valor dentro do BR Code PIX
 * Campo EMV: 54 (amount)
 */

export function buildPixWithAmount(basePix: string, amount: number): string {
  if (!basePix) return "";

  const formatted = amount.toFixed(2);

  // campo 54 (valor)
  const amountField =
    "54" +
    formatted.length.toString().padStart(2, "0") +
    formatted;

  // remove valor existente
  const withoutAmount = basePix.replace(/54\d{2}\d+\.\d{2}/, "");

  // insere antes do país
  return withoutAmount.replace("5802BR", amountField + "5802BR");
}
