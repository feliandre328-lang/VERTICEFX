import uuid
from datetime import datetime, timezone as dt_timezone
from decimal import Decimal, ROUND_HALF_UP
from xml.etree import ElementTree

import requests
from django.core.cache import cache
from django.db.models import Sum, Count
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Investment
from .serializers import (
    InvestmentSerializer,
    AdminInvestmentSerializer,
    PixChargeCreateSerializer,
    PixChargeResponseSerializer,
)

from .mp_service import mp_create_pix_payment
from notifications.models import Notification
from notifications.services import create_notification, notify_admins
from withdrawals.models import DailyPerformanceDistribution, ResultLedgerEntry, WithdrawalRequest


class InvestmentViewSet(viewsets.ModelViewSet):
    """
    CLIENTE:
    /api/investments/
    """
    serializer_class = InvestmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Investment.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        inv = serializer.save()
        amount = Decimal(inv.amount_cents) / Decimal("100")
        notify_admins(
            category=Notification.CATEGORY_INVESTMENT,
            title="Novo aporte solicitado",
            message=f"{inv.user.username} solicitou aporte de R$ {amount:.2f}.",
            payload={"investment_id": inv.id, "user_id": inv.user_id, "status": inv.status},
            exclude_user_id=inv.user_id if inv.user.is_staff else None,
        )


class AdminInvestmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ADMIN:
    /api/admin/investments/
    """
    serializer_class = AdminInvestmentSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = Investment.objects.select_related("user").order_by("-created_at")
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        inv = self.get_object()
        inv.status = Investment.STATUS_APPROVED
        inv.save(update_fields=["status"])
        amount = Decimal(inv.amount_cents) / Decimal("100")
        create_notification(
            user=inv.user,
            category=Notification.CATEGORY_INVESTMENT,
            title="Aporte aprovado",
            message=f"Seu aporte de R$ {amount:.2f} foi aprovado.",
            payload={"investment_id": inv.id, "status": inv.status},
        )
        return Response({"ok": True, "id": inv.id, "status": inv.status}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUser])
    def reject(self, request, pk=None):
        inv = self.get_object()
        inv.status = Investment.STATUS_REJECTED
        inv.save(update_fields=["status"])
        amount = Decimal(inv.amount_cents) / Decimal("100")
        create_notification(
            user=inv.user,
            category=Notification.CATEGORY_INVESTMENT,
            title="Aporte rejeitado",
            message=f"Seu aporte de R$ {amount:.2f} foi rejeitado.",
            payload={"investment_id": inv.id, "status": inv.status},
        )
        return Response({"ok": True, "id": inv.id, "status": inv.status}, status=status.HTTP_200_OK)


class DashboardSummaryView(APIView):
    """
    GET /api/dashboard/summary/
    Retorna soma de capital (APROVADO) etc. pro usuário logado.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        approved_sum = Investment.objects.filter(user=user, status=Investment.STATUS_APPROVED).aggregate(
            s=Sum("amount_cents")
        )["s"] or 0

        total_sum = Investment.objects.filter(user=user).aggregate(
            s=Sum("amount_cents")
        )["s"] or 0

        pending_sum = Investment.objects.filter(user=user, status=Investment.STATUS_PENDING).aggregate(
            s=Sum("amount_cents")
        )["s"] or 0

        approved_count = Investment.objects.filter(user=user, status=Investment.STATUS_APPROVED).aggregate(
            c=Count("id")
        )["c"] or 0

        pending_count = Investment.objects.filter(user=user, status=Investment.STATUS_PENDING).aggregate(
            c=Count("id")
        )["c"] or 0

        return Response(
            {
                "balance_capital_cents": approved_sum,
                "total_contributed_cents": total_sum,
                "pending_cents": pending_sum,
                "approved_count": approved_count,
                "pending_count": pending_count,
            },
            status=status.HTTP_200_OK,
        )


def _to_amount_2dp(amount) -> Decimal:
    if isinstance(amount, Decimal):
        dec = amount
    else:
        dec = Decimal(str(amount))
    return dec.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class PixChargeView(APIView):
    """
    POST /api/pix/charge/
    Body: { "amount": 300.00 }

    Retorna (padrão pro frontend):
    {
      "pix_code": "...copia e cola...",
      "external_ref": "pix-....",
      "qr_code_base64": "...."   (PNG base64)
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        in_ser = PixChargeCreateSerializer(data=request.data)
        in_ser.is_valid(raise_exception=True)

        amount = _to_amount_2dp(in_ser.validated_data["amount"])
        external_ref = f"pix-{uuid.uuid4().hex[:12]}"

        # ✅ REQUIRED: description
        description = f"Aporte Vértice FX - usuário {request.user.get_username()} - ref {external_ref}"

        mp = mp_create_pix_payment(
            amount=float(amount),
            external_ref=external_ref,
            description=description,
            payer_email=(request.user.email or None),
        )

        tx = (mp.get("point_of_interaction") or {}).get("transaction_data") or {}

        # Mercado Pago geralmente retorna:
        # tx["qr_code"] (copia e cola) e tx["qr_code_base64"] (imagem)
        pix_code = tx.get("qr_code")  # copia e cola
        qr_base64 = tx.get("qr_code_base64")  # PNG base64

        if not pix_code:
            return Response(
                {"detail": "Mercado Pago não retornou qr_code (copia e cola).", "raw": mp},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        out = {
            "pix_code": pix_code,
            "external_ref": external_ref,
            "qr_code_base64": qr_base64 or "",
        }

        out_ser = PixChargeResponseSerializer(data=out)
        out_ser.is_valid(raise_exception=True)
        return Response(out_ser.data, status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        return Response({
            "id": u.id,
            "username": u.get_username(),
            "email": u.email or "",
            "is_staff": bool(u.is_staff),
            "is_superuser": bool(u.is_superuser),
        })

class AdminSummaryView(APIView):
    """
    GET /api/admin/summary/

    Retorna:
    - tvl_cents: aportes APROVADOS menos retiradas (resgates/saques não rejeitados)
    - pending_cents: soma de TODOS os aportes PENDENTES
    - approved_count / pending_count
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        tvl_approved = (
            Investment.objects.filter(status=Investment.STATUS_APPROVED)
            .aggregate(s=Sum("amount_cents"))["s"]
            or 0
        )

        pending_sum = (
            Investment.objects.filter(status=Investment.STATUS_PENDING)
            .aggregate(s=Sum("amount_cents"))["s"]
            or 0
        )

        approved_count = (
            Investment.objects.filter(status=Investment.STATUS_APPROVED)
            .aggregate(c=Count("id"))["c"]
            or 0
        )

        pending_count = (
            Investment.objects.filter(status=Investment.STATUS_PENDING)
            .aggregate(c=Count("id"))["c"]
            or 0
        )

        withdrawals_sum = (
            WithdrawalRequest.objects.exclude(status=WithdrawalRequest.STATUS_REJECTED)
            .aggregate(s=Sum("amount_cents"))["s"]
            or 0
        )
        tvl_net = max(tvl_approved - withdrawals_sum, 0)

        # Distribuicoes de performance (fonte de resultado dos clientes).
        daily_distribution_total_cents = (
            DailyPerformanceDistribution.objects.aggregate(s=Sum("result_cents"))["s"]
            or 0
        )

        # Ledger consolidado (inclui distribuicoes + ajustes manuais).
        result_ledger_total_cents = (
            ResultLedgerEntry.objects.aggregate(s=Sum("amount_cents"))["s"]
            or 0
        )

        # Parcela do ledger gerada automaticamente pelas distribuicoes diarias.
        result_ledger_from_distribution_cents = (
            ResultLedgerEntry.objects.filter(external_ref__startswith="perf-")
            .aggregate(s=Sum("amount_cents"))["s"]
            or 0
        )

        # Ledger manual (nao originado por distribuicao diaria).
        result_ledger_manual_total_cents = (
            ResultLedgerEntry.objects.exclude(external_ref__startswith="perf-")
            .aggregate(s=Sum("amount_cents"))["s"]
            or 0
        )

        # Saques de resultado ja solicitados/aprovados/pagos (nao rejeitados).
        result_settlement_withdrawals_cents = (
            WithdrawalRequest.objects.filter(
                withdrawal_type=WithdrawalRequest.TYPE_RESULT_SETTLEMENT
            )
            .exclude(status=WithdrawalRequest.STATUS_REJECTED)
            .aggregate(s=Sum("amount_cents"))["s"]
            or 0
        )
        # Saldo de clientes sem duplicar fonte:
        # daily nao paga + ledger manual nao pago - saques de resultado nao rejeitados.
        clients_result_balance_cents = max(
            (daily_distribution_total_cents + result_ledger_manual_total_cents)
            - result_settlement_withdrawals_cents,
            0,
        )

        return Response(
            {
                "tvl_cents": tvl_net,
                "withdrawals_cents": withdrawals_sum,
                "pending_cents": pending_sum,
                "approved_count": approved_count,
                "pending_count": pending_count,
                "daily_distribution_total_cents": daily_distribution_total_cents,
                "result_ledger_total_cents": result_ledger_total_cents,
                "result_ledger_from_distribution_cents": result_ledger_from_distribution_cents,
                "result_ledger_manual_total_cents": result_ledger_manual_total_cents,
                "result_settlement_withdrawals_cents": result_settlement_withdrawals_cents,
                "clients_result_balance_cents": clients_result_balance_cents,
            },
            status=status.HTTP_200_OK,
        )


MARKET_TICKER_CACHE_KEY = "vfx:market_ticker:v1"
MARKET_TICKER_TTL_SECONDS = 60
MARKET_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
STOCK_SYMBOLS = [
    ("PETR4.SA", "PETR4"),
    ("VALE3.SA", "VALE3"),
    ("ITUB4.SA", "ITUB4"),
    ("BBAS3.SA", "BBAS3"),
    ("BOVA11.SA", "BOVA11"),
]
USD_BRL_SYMBOL = ("BRL=X", "USD/BRL")
PTBR_NEWS_FEEDS = [
    ("https://www.infomoney.com.br/mercados/feed/", "InfoMoney"),
    ("https://www.moneytimes.com.br/feed/", "Money Times"),
    ("https://br.investing.com/rss/news.rss", "Investing BR"),
]


def _to_float(raw: str | None):
    if raw is None:
        return None
    value = (raw or "").strip()
    if not value or value.upper() in ("N/D", "N/A", "-"):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _fetch_yahoo_chart_quote(symbol: str, label: str, market: str):
    try:
        res = requests.get(
            f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}",
            params={"interval": "1d", "range": "5d"},
            timeout=6,
            headers={"User-Agent": MARKET_USER_AGENT},
        )
        res.raise_for_status()
        payload = res.json()
        result = ((payload.get("chart") or {}).get("result") or [None])[0]
        if not result:
            return None
        meta = result.get("meta") or {}
        price = _to_float(str(meta.get("regularMarketPrice")))
        prev = _to_float(str(meta.get("chartPreviousClose") or meta.get("previousClose")))

        if price is None:
            closes = (((result.get("indicators") or {}).get("quote") or [{}])[0]).get("close") or []
            for value in reversed(closes):
                parsed = _to_float(str(value))
                if parsed is not None:
                    price = parsed
                    break

        if price is None:
            return None

        change_pct = None
        if prev and prev != 0:
            change_pct = round(((price - prev) / prev) * 100, 2)

        return {
            "type": "quote",
            "market": market,
            "symbol": label,
            "price": price,
            "change_pct": change_pct,
            "currency": (meta.get("currency") or "BRL"),
        }
    except Exception:
        return None


def _fetch_rss_feed_items(feed_url: str, source: str, limit: int = 4):
    try:
        res = requests.get(
            feed_url,
            timeout=8,
            headers={"User-Agent": MARKET_USER_AGENT},
        )
        res.raise_for_status()
        root = ElementTree.fromstring(res.text)

        items = []
        for item in root.findall("./channel/item"):
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            if not title or not link:
                continue
            items.append(
                {
                    "type": "news",
                    "title": title,
                    "url": link,
                    "source": source,
                }
            )
            if len(items) >= limit:
                break
        return items
    except Exception:
        return []


def _fetch_ptbr_news(limit: int = 6):
    items = []
    seen_urls = set()

    per_feed_limit = 3 if limit > 3 else 2
    for feed_url, source in PTBR_NEWS_FEEDS:
        feed_items = _fetch_rss_feed_items(feed_url=feed_url, source=source, limit=per_feed_limit)
        for item in feed_items:
            url = item.get("url") or ""
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            items.append(item)
            if len(items) >= limit:
                return items

    return items


class MarketTickerView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        cached = cache.get(MARKET_TICKER_CACHE_KEY)
        if cached:
            return Response(cached, status=status.HTTP_200_OK)

        quotes = []
        for symbol, label in STOCK_SYMBOLS:
            row = _fetch_yahoo_chart_quote(symbol=symbol, label=label, market="equity")
            if row:
                quotes.append(row)

        usd_brl = _fetch_yahoo_chart_quote(symbol=USD_BRL_SYMBOL[0], label=USD_BRL_SYMBOL[1], market="fx")
        if usd_brl:
            quotes.append(usd_brl)

        news = _fetch_ptbr_news(limit=6)

        payload = {
            "updated_at": datetime.now(dt_timezone.utc).isoformat(),
            "quotes": quotes,
            "news": news,
        }

        cache.set(MARKET_TICKER_CACHE_KEY, payload, MARKET_TICKER_TTL_SECONDS)
        return Response(payload, status=status.HTTP_200_OK)
