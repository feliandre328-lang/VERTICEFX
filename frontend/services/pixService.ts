// --- PIX QR Code Generation Service ---

/**
 * Formats a string value for the BR Code standard.
 * @param id The field ID (e.g., '00', '53').
 * @param value The field value.
 * @returns A formatted string like "IDLLVV", where LL is the length of VV.
 */
const formatValue = (id: string, value: string): string => {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
};

/**
 * Calculates the CRC16/CCITT-FALSE checksum for the PIX code.
 * @param data The payload string.
 * @returns The 4-character hexadecimal checksum.
 */
const crc16 = (data: string): string => {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return ('0000' + (crc & 0xFFFF).toString(16).toUpperCase()).slice(-4);
};

/**
 * Generates a complete PIX BR Code string for a given amount.
 * @param amount The transaction amount.
 * @param txid The unique transaction ID.
 * @returns A string representing the "PIX Copia e Cola" code.
 */
export const generatePIXCode = (amount: number, txid: string): string => {
  // --- Static data for the demo ---
  const pixKey = '11478738448';
  const merchantName = 'FELIPE RODRIGO SILVA';
  const merchantCity = 'CAMARAGIBE';

  // ---

  const payload = [
    formatValue('00', '01'), // Payload Format Indicator
    formatValue('26', // Merchant Account Information
      formatValue('00', 'br.gov.bcb.pix') +
      formatValue('01', pixKey)
    ),
    formatValue('52', '0000'), // Merchant Category Code
    formatValue('53', '986'), // Transaction Currency (BRL)
    formatValue('54', amount.toFixed(2)),
    formatValue('58', 'BR'), // Country Code
    formatValue('59', merchantName),
    formatValue('60', merchantCity),
    formatValue('62', // Additional Data Field
      formatValue('05', txid)
    )
  ].join('');

  const payloadWithCRC = `${payload}6304`;
  const checksum = crc16(payloadWithCRC);

  return `${payloadWithCRC}${checksum}`;
};
