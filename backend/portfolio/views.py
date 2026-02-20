import uuid
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Sum, Count
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
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
    - tvl_approved_cents: soma de TODOS os aportes APROVADOS (todos os usuários)
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
        

        return Response(
            {
                "tvl_cents": tvl_approved,
                "pending_cents": pending_sum,
                "approved_count": approved_count,
                "pending_count": pending_count,
            },
            status=status.HTTP_200_OK,
        )
