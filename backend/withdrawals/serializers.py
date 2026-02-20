from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import serializers

from portfolio.models import Investment
from .models import DailyPerformanceDistribution, ResultLedgerEntry, WithdrawalRequest
from .services import get_user_withdrawal_balances


User = get_user_model()


class WithdrawalRequestSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, write_only=True)
    available_capital_cents = serializers.SerializerMethodField(read_only=True)
    available_result_cents = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = WithdrawalRequest
        fields = [
            "id",
            "withdrawal_type",
            "amount",
            "amount_cents",
            "pix_key",
            "scheduled_for",
            "status",
            "rejection_reason",
            "admin_note",
            "external_ref",
            "requested_at",
            "approved_at",
            "paid_at",
            "available_capital_cents",
            "available_result_cents",
        ]
        read_only_fields = [
            "id",
            "amount_cents",
            "status",
            "rejection_reason",
            "admin_note",
            "external_ref",
            "requested_at",
            "approved_at",
            "paid_at",
            "available_capital_cents",
            "available_result_cents",
        ]

    def get_available_capital_cents(self, obj):
        ref = obj.scheduled_for or timezone.localdate()
        return get_user_withdrawal_balances(obj.user, reference_date=ref)["available_capital_cents"]

    def get_available_result_cents(self, obj):
        ref = obj.scheduled_for or timezone.localdate()
        return get_user_withdrawal_balances(obj.user, reference_date=ref)["available_result_cents"]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("amount deve ser maior que zero.")
        return value

    def validate(self, attrs):
        request = self.context["request"]
        amount: Decimal = attrs["amount"]
        cents = int((amount * 100).quantize(Decimal("1")))
        today = timezone.localdate()

        if attrs["withdrawal_type"] == WithdrawalRequest.TYPE_CAPITAL_REDEMPTION:
            scheduled_for = attrs.get("scheduled_for")
            if not scheduled_for:
                raise serializers.ValidationError(
                    {"scheduled_for": "scheduled_for é obrigatório para resgate de capital."}
                )
            if scheduled_for > today:
                raise serializers.ValidationError(
                    {"scheduled_for": f"Resgate de capital permitido somente até hoje ({today.isoformat()})."}
                )
            balances = get_user_withdrawal_balances(request.user, reference_date=scheduled_for)
            if cents > balances["available_capital_cents"]:
                raise serializers.ValidationError(
                    {
                        "amount": (
                            f"Saldo de capital insuficiente. Disponivel: "
                            f"{balances['available_capital_cents']} cents."
                        )
                    }
                )

        if attrs["withdrawal_type"] == WithdrawalRequest.TYPE_RESULT_SETTLEMENT:
            balances = get_user_withdrawal_balances(request.user, reference_date=today)
            if cents > balances["available_result_cents"]:
                raise serializers.ValidationError(
                    {
                        "amount": (
                            f"Saldo de resultado insuficiente. Disponivel: "
                            f"{balances['available_result_cents']} cents."
                        )
                    }
                )

        attrs["amount_cents"] = cents
        return attrs

    def create(self, validated_data):
        validated_data.pop("amount", None)
        request = self.context["request"]
        return WithdrawalRequest.objects.create(user=request.user, **validated_data)


class AdminWithdrawalRequestSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = WithdrawalRequest
        fields = [
            "id",
            "user",
            "username",
            "email",
            "withdrawal_type",
            "amount_cents",
            "pix_key",
            "scheduled_for",
            "status",
            "rejection_reason",
            "admin_note",
            "external_ref",
            "requested_at",
            "approved_at",
            "paid_at",
        ]


class AdminRejectWithdrawalSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(max_length=255)
    admin_note = serializers.CharField(required=False, allow_blank=True)


class AdminPayWithdrawalSerializer(serializers.Serializer):
    external_ref = serializers.CharField(max_length=80, required=False, allow_blank=True)
    admin_note = serializers.CharField(required=False, allow_blank=True)


class ResultLedgerEntrySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = ResultLedgerEntry
        fields = [
            "id",
            "user",
            "username",
            "amount_cents",
            "description",
            "external_ref",
            "created_at",
            "created_by",
            "created_by_username",
        ]
        read_only_fields = ["id", "created_at", "created_by", "created_by_username"]


class ResultLedgerEntryCreateSerializer(serializers.Serializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    entry_type = serializers.ChoiceField(choices=["CREDIT", "DEBIT"])
    description = serializers.CharField(required=False, allow_blank=True, max_length=255)
    external_ref = serializers.CharField(required=False, allow_blank=True, max_length=80)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("amount deve ser maior que zero.")
        return value

    def create(self, validated_data):
        amount = validated_data["amount"]
        cents = int((amount * 100).quantize(Decimal("1")))
        if validated_data["entry_type"] == "DEBIT":
            cents *= -1

        request = self.context["request"]
        return ResultLedgerEntry.objects.create(
            user=validated_data["user"],
            amount_cents=cents,
            description=validated_data.get("description", ""),
            external_ref=validated_data.get("external_ref", ""),
            created_by=request.user,
        )


class DailyPerformanceDistributionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = DailyPerformanceDistribution
        fields = [
            "id",
            "user",
            "username",
            "reference_date",
            "performance_percent",
            "base_capital_cents",
            "result_cents",
            "note",
            "created_at",
            "created_by",
            "created_by_username",
        ]
        read_only_fields = ["id", "base_capital_cents", "result_cents", "created_at", "created_by"]


class DailyPerformanceDistributionCreateSerializer(serializers.Serializer):
    reference_date = serializers.DateField(required=False)
    performance_percent = serializers.DecimalField(max_digits=7, decimal_places=4)
    user_id = serializers.IntegerField(required=False)
    note = serializers.CharField(required=False, allow_blank=True, max_length=255)

    def validate_reference_date(self, value: date):
        if value > timezone.localdate():
            raise serializers.ValidationError("reference_date não pode ser futura.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        ref_date = validated_data.get("reference_date") or timezone.localdate()
        perf = validated_data["performance_percent"]
        note = validated_data.get("note", "")
        user_id = validated_data.get("user_id")
        request = self.context["request"]

        user_filter = Q()
        if user_id:
            user_filter = Q(user_id=user_id)

        rows = (
            Investment.objects.filter(status=Investment.STATUS_APPROVED)
            .filter(user_filter)
            .filter(Q(paid_at__date__lte=ref_date) | Q(paid_at__isnull=True, created_at__date__lte=ref_date))
            .values("user")
            .annotate(base_capital_cents=Sum("amount_cents"))
        )

        created = []
        percent_factor = Decimal(perf) / Decimal("100")

        for row in rows:
            base_cents = int(row["base_capital_cents"] or 0)
            if base_cents <= 0:
                continue

            result_cents = int((Decimal(base_cents) * percent_factor).quantize(Decimal("1")))
            if result_cents == 0:
                continue

            dist, _ = DailyPerformanceDistribution.objects.update_or_create(
                user_id=row["user"],
                reference_date=ref_date,
                defaults={
                    "performance_percent": perf,
                    "base_capital_cents": base_cents,
                    "result_cents": result_cents,
                    "note": note,
                    "created_by": request.user,
                },
            )

            ResultLedgerEntry.objects.update_or_create(
                user_id=row["user"],
                external_ref=f"perf-{ref_date.isoformat()}",
                defaults={
                    "amount_cents": result_cents,
                    "description": f"Distribuicao diaria de performance {ref_date.isoformat()}",
                    "created_by": request.user,
                },
            )
            created.append(dist)

        return created
