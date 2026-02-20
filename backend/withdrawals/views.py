from datetime import date

from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DailyPerformanceDistribution, ResultLedgerEntry, WithdrawalRequest
from .serializers import (
    AdminPayWithdrawalSerializer,
    AdminRejectWithdrawalSerializer,
    AdminWithdrawalRequestSerializer,
    DailyPerformanceDistributionCreateSerializer,
    DailyPerformanceDistributionSerializer,
    ResultLedgerEntryCreateSerializer,
    ResultLedgerEntrySerializer,
    WithdrawalRequestSerializer,
)
from .services import get_user_withdrawal_balances


class WithdrawalSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        scheduled_for = request.query_params.get("scheduled_for")
        ref_date = None
        if scheduled_for:
            try:
                ref_date = date.fromisoformat(scheduled_for)
            except ValueError:
                return Response({"detail": "scheduled_for inválido. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(get_user_withdrawal_balances(request.user, reference_date=ref_date), status=status.HTTP_200_OK)


class ClientWithdrawalViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = WithdrawalRequestSerializer

    def get_queryset(self):
        return WithdrawalRequest.objects.filter(user=self.request.user).order_by("-requested_at")


class AdminWithdrawalViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = AdminWithdrawalRequestSerializer

    def get_queryset(self):
        qs = WithdrawalRequest.objects.select_related("user", "processed_by").order_by("-requested_at")
        status_param = self.request.query_params.get("status")
        kind_param = self.request.query_params.get("withdrawal_type")
        user_id = self.request.query_params.get("user_id")

        if status_param:
            qs = qs.filter(status=status_param)
        if kind_param:
            qs = qs.filter(withdrawal_type=kind_param)
        if user_id:
            qs = qs.filter(user_id=user_id)

        return qs

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        obj = self.get_object()
        if obj.status != WithdrawalRequest.STATUS_PENDING:
            return Response(
                {"detail": "Somente pedidos pendentes podem ser aprovados."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        obj.status = WithdrawalRequest.STATUS_APPROVED
        obj.approved_at = timezone.now()
        obj.processed_by = request.user
        obj.rejection_reason = ""
        obj.save(update_fields=["status", "approved_at", "processed_by", "rejection_reason"])
        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUser])
    def reject(self, request, pk=None):
        obj = self.get_object()
        if obj.status == WithdrawalRequest.STATUS_PAID:
            return Response(
                {"detail": "Pedido pago nao pode ser rejeitado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        in_ser = AdminRejectWithdrawalSerializer(data=request.data)
        in_ser.is_valid(raise_exception=True)

        obj.status = WithdrawalRequest.STATUS_REJECTED
        obj.processed_by = request.user
        obj.rejection_reason = in_ser.validated_data["rejection_reason"]
        obj.admin_note = in_ser.validated_data.get("admin_note", obj.admin_note)
        obj.save(update_fields=["status", "processed_by", "rejection_reason", "admin_note"])
        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUser])
    def pay(self, request, pk=None):
        obj = self.get_object()
        if obj.status != WithdrawalRequest.STATUS_APPROVED:
            return Response(
                {"detail": "Somente pedidos aprovados podem ser pagos."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        in_ser = AdminPayWithdrawalSerializer(data=request.data)
        in_ser.is_valid(raise_exception=True)

        obj.status = WithdrawalRequest.STATUS_PAID
        obj.paid_at = timezone.now()
        obj.processed_by = request.user
        if "external_ref" in in_ser.validated_data:
            obj.external_ref = in_ser.validated_data["external_ref"] or obj.external_ref
        if "admin_note" in in_ser.validated_data:
            obj.admin_note = in_ser.validated_data["admin_note"] or obj.admin_note
        obj.save(update_fields=["status", "paid_at", "processed_by", "external_ref", "admin_note"])
        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)


class ResultLedgerAdminViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = ResultLedgerEntry.objects.select_related("user", "created_by").order_by("-created_at")
        user_id = self.request.query_params.get("user_id")
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return ResultLedgerEntryCreateSerializer
        return ResultLedgerEntrySerializer

    def create(self, request, *args, **kwargs):
        in_ser = self.get_serializer(data=request.data)
        in_ser.is_valid(raise_exception=True)
        entry = in_ser.save()
        out_ser = ResultLedgerEntrySerializer(entry)
        return Response(out_ser.data, status=status.HTTP_201_CREATED)


class DailyPerformanceDistributionAdminViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = DailyPerformanceDistribution.objects.select_related("user", "created_by").order_by("-reference_date", "-created_at")
        user_id = self.request.query_params.get("user_id")
        reference_date = self.request.query_params.get("reference_date")
        if user_id:
            qs = qs.filter(user_id=user_id)
        if reference_date:
            qs = qs.filter(reference_date=reference_date)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return DailyPerformanceDistributionCreateSerializer
        return DailyPerformanceDistributionSerializer

    def create(self, request, *args, **kwargs):
        in_ser = self.get_serializer(data=request.data)
        in_ser.is_valid(raise_exception=True)
        created = in_ser.save()
        out_ser = DailyPerformanceDistributionSerializer(created, many=True)
        return Response(out_ser.data, status=status.HTTP_201_CREATED)
