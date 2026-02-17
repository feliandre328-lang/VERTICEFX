import os
import uuid
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


class InvestmentViewSet(viewsets.ModelViewSet):
    """
    CLIENTE:
    /api/investments/
    """
    serializer_class = InvestmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Investment.objects.filter(user=self.request.user).order_by("-created_at")


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
        return Response({"ok": True, "id": inv.id, "status": inv.status}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUser])
    def reject(self, request, pk=None):
        inv = self.get_object()
        inv.status = Investment.STATUS_REJECTED
        inv.save(update_fields=["status"])
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


class PixChargeView(APIView):
    """
    POST /api/pix/charge/
    Body: { "amount": 500.00 }

    Retorna:
    { "pix_code": "...", "external_ref": "pix-..." }

    Mock dinâmico (padrão fintech)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        in_ser = PixChargeCreateSerializer(data=request.data)
        in_ser.is_valid(raise_exception=True)
        amount = in_ser.validated_data["amount"]

        external_ref = f"pix-{uuid.uuid4().hex[:12]}"

        # ✅ BR Code "base" configurado via ENV (sem valor).
        # Ex: PIX_BR_CODE="00020126....6304ABCD"
        base = os.getenv("PIX_BR_CODE", "").strip()
        if not base:
            return Response({"detail": "PIX_BR_CODE não configurado no backend."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 🚨 Importante: BR Code com valor dinâmico REAL exige gerar payload corretamente.
        # Aqui é "padrão fintech" para UI/teste, mas o pagamento real depende de payload válido do PSP.
        # Ainda assim, você pediu "QR real + pagamento manual + confirmação manual":
        # -> O que é "real" aqui é usar SEU BR CODE válido já emitido por você/PSP.
        # Se seu BR CODE já contém valor fixo, ele sempre vai cobrar aquele valor.
        pix_code = base

        out_ser = PixChargeResponseSerializer(data={"pix_code": pix_code, "external_ref": external_ref})
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
