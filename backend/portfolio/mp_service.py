import os
import mercadopago

def mp_create_pix_payment(*, amount: float, external_ref: str, description: str, payer_email: str | None = None) -> dict:
    """
    Cria um pagamento PIX no Mercado Pago e retorna o JSON bruto.
    Requer MP_ACCESS_TOKEN no ambiente.
    """
    access_token = os.getenv("MP_ACCESS_TOKEN", "").strip()
    if not access_token:
        raise RuntimeError("MP_ACCESS_TOKEN não configurado no backend.")

    sdk = mercadopago.SDK(access_token)

    data = {
        "transaction_amount": float(amount),
        "description": description,
        "payment_method_id": "pix",
        "external_reference": external_ref,
    }

    # payer é opcional; ajuda o MP a aceitar melhor
    if payer_email:
        data["payer"] = {"email": payer_email}

    result = sdk.payment().create(data)
    # result geralmente tem: {"status": 201, "response": {...}}
    return result.get("response") or result
