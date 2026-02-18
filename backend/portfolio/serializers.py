from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Investment
from decimal import Decimal
User = get_user_model()


class InvestmentSerializer(serializers.ModelSerializer):
    # entrada em reais
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, write_only=True, required=True)

    class Meta:
        model = Investment
        fields = [
            "id",
            "amount",          # write-only
            "amount_cents",    # read
            "status",
            "paid_at",
            "external_ref",
            "created_at",
        ]
        read_only_fields = ["id", "amount_cents", "status", "created_at"]

    def validate_amount(self, value):
        # mínimo fintech (você pediu): R$ 300,00
        if value < 300:
            raise serializers.ValidationError("Valor mínimo do aporte é R$ 300,00.")
        return value

    def create(self, validated_data):
        amount = validated_data.pop("amount")
        # converte reais -> centavos
        amount_cents = int(round(float(amount) * 100))

        user = self.context["request"].user
        inv = Investment.objects.create(
            user=user,
            amount_cents=amount_cents,
            paid_at=validated_data.get("paid_at"),
            external_ref=validated_data.get("external_ref"),
        )
        return inv


class AdminInvestmentSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Investment
        fields = [
            "id",
            "user_id",
            "username",
            "email",
            "amount_cents",
            "status",
            "paid_at",
            "external_ref",
            "created_at",
        ]
        read_only_fields = fields


class PixChargeCreateSerializer(serializers.Serializer):
    amount = serializers.CharField()

    def validate_amount(self, value):
        v = value.strip().replace("R$", "").replace(".", "").replace(",", ".")
        try:
            return Decimal(v)
        except:
            raise serializers.ValidationError("A valid number is required.")

class PixChargeResponseSerializer(serializers.Serializer):
    pix_code = serializers.CharField()
    external_ref = serializers.CharField()
