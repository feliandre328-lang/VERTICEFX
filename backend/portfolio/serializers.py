from rest_framework import serializers
from .models import Investment


class InvestmentSerializer(serializers.ModelSerializer):
    # entrada: reais (ex: 500.00)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, write_only=True, required=True)

    # saída: reais calculado
    amount_brl = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Investment
        fields = [
            "id",
            "amount",         # write_only
            "amount_cents",   # read_only (útil debug)
            "amount_brl",     # read_only
            "status",
            "paid_at",
            "external_ref",
            "created_at",
        ]
        read_only_fields = ["id", "amount_cents", "amount_brl", "status", "created_at"]

    def get_amount_brl(self, obj: Investment):
        return f"{obj.amount_cents / 100:.2f}"

    def validate_amount(self, value):
        if value < 300:
            raise serializers.ValidationError("O valor mínimo do aporte é R$ 300,00.")
        return value

    def create(self, validated_data):
        # remove "amount" (reais) e grava em cents
        amount = validated_data.pop("amount")
        amount_cents = int(round(float(amount) * 100))
        return Investment.objects.create(amount_cents=amount_cents, **validated_data)


class PixChargeCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)

    def validate_amount(self, value):
        if value < 300:
            raise serializers.ValidationError("O valor mínimo do Pix é R$ 300,00.")
        return value


class PixChargeResponseSerializer(serializers.Serializer):
    pix_code = serializers.CharField()
    external_ref = serializers.CharField()