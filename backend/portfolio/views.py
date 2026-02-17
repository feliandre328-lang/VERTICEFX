import uuid
from django.db.models import Sum
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Investment
from .serializers import (
    InvestmentSerializer,
    InvestmentCreateSerializer,
    DashboardSummarySerializer,
)


class InvestmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Investment.objects.filter(user=self.request.user).order_by("-created_at")

    def get_serializer_class(self):
        if self.action in ["create"]:
            return InvestmentCreateSerializer
        return InvestmentSerializer

    def create(self, request, *args, **kwargs):
        """
        POST /api/investments/
        Body:
        {
          "amount": 500.00,
          "paid_at": "2026-02-17T10:00:00Z" (opcional),
          "external_ref": "pix-abc-123" (opcional)
        }

        Cria como PENDING (confirmação manual do admin).
        """
        in_ser = InvestmentCreateSerializer(data=request.data)
        in_ser.is_valid(raise_exception=True)

        amount = in_ser.validated_data["amount"]
        paid_at = in_ser.validated_data.get("paid_at")
        external_ref = in_ser.validated_data.get("external_ref")

        amount_cents = int(round(float(amount) * 100))

        inv = Investment.objects.create(
            user=request.user,
            amount_cents=amount_cents,
            status=Investment.STATUS_PENDING,
            paid_at=paid_at,
            external_ref=external_ref,
        )

        out_ser = InvestmentSerializer(inv)
        return Response(out_ser.data, status=status.HTTP_201_CREATED)


class DashboardSummaryView(APIView):
    """
    GET /api/dashboard/summary/

    Retorna:
    {
      "balance_capital_cents": 123400,
      "pending_cents": 50000,
      "approved_count": 3,
      "pending_count": 1
    }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Investment.objects.filter(user=request.user)

        approved_sum = qs.filter(status=Investment.STATUS_APPROVED).aggregate(
            total=Sum("amount_cents")
        )["total"] or 0

        pending_sum = qs.filter(status=Investment.STATUS_PENDING).aggregate(
            total=Sum("amount_cents")
        )["total"] or 0

        approved_count = qs.filter(status=Investment.STATUS_APPROVED).count()
        pending_count = qs.filter(status=Investment.STATUS_PENDING).count()

        payload = {
            "balance_capital_cents": int(approved_sum),
            "pending_cents": int(pending_sum),
            "approved_count": approved_count,
            "pending_count": pending_count,
        }

        out = DashboardSummarySerializer(payload)
        return Response(out.data, status=status.HTTP_200_OK)


class PixChargeView(APIView):
    """
    POST /api/pix/charge/
    Body: { "amount": 500.00 }

    Retorna:
    { "pix_code": "....", "external_ref": "pix-..." }

    MOCK (você substitui depois por PSP real).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        amount = request.data.get("amount")
        if amount is None:
            return Response({"detail": "amount é obrigatório"}, status=400)

        external_ref = f"pix-{uuid.uuid4().hex[:12]}"
        pix_code = f"MOCK-PIX|AMOUNT={amount}|REF={external_ref}|USER={request.user.id}"

        return Response(
            {"pix_code": pix_code, "external_ref": external_ref},
            status=status.HTTP_200_OK
        )
