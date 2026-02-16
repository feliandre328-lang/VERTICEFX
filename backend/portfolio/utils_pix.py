def _tlv_read(payload: str):
    """
    Lê EMV TLV: TAG(2) + LEN(2) + VALUE(LEN)
    Retorna lista de (tag, value).
    """
    i = 0
    out = []
    while i + 4 <= len(payload):
        tag = payload[i : i + 2]
        ln = int(payload[i + 2 : i + 4])
        val = payload[i + 4 : i + 4 + ln]
        out.append((tag, val))
        i = i + 4 + ln
        if i > len(payload):
            break
    return out


def _tlv_build(items):
    s = ""
    for tag, val in items:
        val = str(val)
        s += f"{tag}{len(val):02d}{val}"
    return s


def crc16_ccitt_false(data: str) -> str:
    """
    CRC16-CCITT-FALSE (polynomial 0x1021, init 0xFFFF)
    Retorna 4 hex uppercase.
    """
    crc = 0xFFFF
    for ch in data.encode("utf-8"):
        crc ^= (ch << 8) & 0xFFFF
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    return f"{crc:04X}"


def make_pix_dynamic(base_br_code: str, amount: float) -> str:
    """
    Recebe um BR Code base (com ou sem valor fixo) e devolve BR Code válido com:
    - Tag 54 (amount) ajustada
    - Tag 63 (CRC) recalculada

    Regra:
    - Remove TAG 54 se existir
    - Remove TAG 63 (CRC) se existir
    - Insere TAG 54 com valor formatado (2 casas, ponto)
    - Recria TAG 63 = CRC16 sobre payload + '6304'
    """
    base = (base_br_code or "").strip()
    if not base:
        raise ValueError("PIX_BR_CODE vazio")

    items = _tlv_read(base)

    # remove 54 e 63 se existirem
    items = [(t, v) for (t, v) in items if t not in ("54", "63")]

    # formata amount
    amt_str = f"{float(amount):.2f}"

    # insere 54 (amount) antes do 58 (country) se existir, senão no fim
    inserted = False
    new_items = []
    for t, v in items:
        if (not inserted) and t == "58":
            new_items.append(("54", amt_str))
            inserted = True
        new_items.append((t, v))
    if not inserted:
        new_items.append(("54", amt_str))

    payload_wo_crc = _tlv_build(new_items)

    # CRC calculado sobre payload + '6304'
    to_crc = payload_wo_crc + "6304"
    crc = crc16_ccitt_false(to_crc)

    return to_crc + crc
