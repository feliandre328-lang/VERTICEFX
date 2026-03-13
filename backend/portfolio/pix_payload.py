# portfolio/pix_payload.py
import re


def _only_ascii_upper(s: str) -> str:
    s = (s or "").strip().upper()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[^A-Z0-9 ]", "", s)
    return s


def _tlv(tag: str, value: str) -> str:
    value = value or ""
    ln = len(value.encode("utf-8"))  # EMV: tamanho em BYTES
    return f"{tag}{ln:02d}{value}"


def _crc16_ccitt(payload: str) -> str:
    """
    CRC16/CCITT-FALSE (poly=0x1021, init=0xFFFF).
    Calculado sobre BYTES (UTF-8).
    """
    crc = 0xFFFF
    for b in payload.encode("utf-8"):
        crc ^= (b << 8) & 0xFFFF
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    return f"{crc:04X}"


def generate_pix_payload(
    pix_key: str,
    amount: float | None,
    merchant_name: str,
    merchant_city: str,
    txid: str,
    description: str = "",
) -> str:
    """
    Gera BR Code (PIX Copia e Cola) estático com valor opcional.
    - pix_key: CPF/CNPJ/email/telefone/chave aleatória
    - amount: valor (None ou 0 => sem valor fixo)
    - merchant_name: até 25
    - merchant_city: até 15
    - txid: até 25
    """
    merchant_name = _only_ascii_upper(merchant_name)[:25]
    merchant_city = _only_ascii_upper(merchant_city)[:15]

    pix_key = (pix_key or "").strip()
    txid = (txid or "").strip()[:25]
    description = (description or "").strip()

    # 00 - Payload Format Indicator
    pfi = _tlv("00", "01")

    # 01 - Point of Initiation Method
    # 11 = estático (mais compatível para chave PIX + valor)
    pim = _tlv("01", "11")

    # 26 - Merchant Account Information
    gui = _tlv("00", "br.gov.bcb.pix")
    key = _tlv("01", pix_key)
    desc = _tlv("02", description) if description else ""
    mai = _tlv("26", gui + key + desc)

    # 52 - Merchant Category Code
    mcc = _tlv("52", "0000")

    # 53 - Currency
    currency = _tlv("53", "986")

    # 54 - Amount (opcional)
    amt = ""
    if amount is not None and float(amount) > 0:
        amt_str = f"{float(amount):.2f}"
        amt = _tlv("54", amt_str)

    # 58 - Country
    country = _tlv("58", "BR")

    # 59 - Name
    mname = _tlv("59", merchant_name)

    # 60 - City
    mcity = _tlv("60", merchant_city)

    # 62 - Additional Data Field Template (TXID)
    add_txid = _tlv("05", txid)
    add = _tlv("62", add_txid)

    payload_no_crc = pfi + pim + mai + mcc + currency + amt + country + mname + mcity + add

    # 63 - CRC
    to_crc = payload_no_crc + "6304"
    crc = _crc16_ccitt(to_crc)

    return payload_no_crc + _tlv("63", crc)


def validate_crc(brcode: str) -> bool:
    """
    Valida CRC do BR Code (tag 63).
    """
    brcode = (brcode or "").strip()
    idx = brcode.rfind("6304")
    if idx == -1 or idx + 8 != len(brcode):
        return False
    given = brcode[-4:]
    calc = _crc16_ccitt(brcode[:-4])
    return given.upper() == calc.upper()
