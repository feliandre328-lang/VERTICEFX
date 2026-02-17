from rest_framework import serializers
from .models import Investment


class InvestmentSerializer(serializers.ModelSerializer):
    # envia amount em reais (float) e também amount_cents
    amount = serializers.SerializerMethodField()

    class Meta:
        model = Investment
        fields = [
            "id",
            "amount_cents",
            "amount",
            "status",
            "paid_at",
            "external_ref",
            "created_at",
        ]
        read_only_fields = ["id", "status", "created_at"]

    def get_amount(self, obj: Investment):
        return obj.amount_cents / 100


class InvestmentCreateSerializer(serializers.Serializer):
    # recebe em reais (ex: 500.00) e converte pra cents
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    paid_at = serializers.DateTimeField(required=False, allow_null=True)
    external_ref = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_amount(self, value):
        if value < 300:
            raise serializers.ValidationError("Valor mínimo do aporte é R$ 300,00.")
        return value


class DashboardSummarySerializer(serializers.Serializer):
    # tudo em cents para evitar float
    balance_capital_cents = serializers.IntegerField()
    pending_cents = serializers.IntegerField()
    approved_count = serializers.IntegerField()
    pending_count = serializers.IntegerField()
