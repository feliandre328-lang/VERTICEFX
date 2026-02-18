from decimal import Decimal
from rest_framework import serializers
from .models import Investment

class InvestmentSerializer(serializers.ModelSerializer):
    # frontend manda "amount" em reais; salvamos em cents
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, write_only=True)

    class Meta:
        model = Investment
        fields = [
            "id",
            "amount",
            "amount_cents",
            "status",
            "paid_at",
            "external_ref",
            "created_at",
        ]
        read_only_fields = ["id", "amount_cents", "status", "created_at"]

    def create(self, validated_data):
        amount: Decimal = validated_data.pop("amount")
        cents = int((amount * 100).quantize(Decimal("1")))
        user = self.context["request"].user

        inv = Investment.objects.create(
            user=user,
            amount_cents=cents,
            status=Investment.STATUS_PENDING,
            **validated_data,
        )
        return inv


class AdminInvestmentSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = Investment
        fields = [
            "id",
            "user_username",
            "user_email",
            "amount_cents",
            "status",
            "paid_at",
            "external_ref",
            "created_at",
        ]


class PixChargeCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)


class PixChargeResponseSerializer(serializers.Serializer):
    pix_code = serializers.CharField()
    external_ref = serializers.CharField()
    qr_code_base64 = serializers.CharField(allow_blank=True, required=False)
