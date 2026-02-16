import uuid
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Investment
from .serializers import InvestmentSerializer
from .serializers import PixChargeCreateSerializer, PixChargeResponseSerializer


class InvestmentViewSet(viewsets.ModelViewSet):
    serializer_class = InvestmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Investment.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        # 🔥 ISSO resolve o 500 mais comum (user obrigatório)
        serializer.save(user=self.request.user)


class PixChargeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        in_ser = PixChargeCreateSerializer(data=request.data)
        in_ser.is_valid(raise_exception=True)

        amount = in_ser.validated_data["amount"]

        external_ref = f"pix-{uuid.uuid4().hex[:12]}"

        # MOCK / BASE (você pode trocar depois por provider real)
        pix_code = f"MOCK-PIX|AMOUNT={amount}|REF={external_ref}|USER={request.user.id}"

        out_ser = PixChargeResponseSerializer(data={"pix_code": pix_code, "external_ref": external_ref})
        out_ser.is_valid(raise_exception=True)
        return Response(out_ser.data, status=status.HTTP_200_OK)
