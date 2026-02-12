from rest_framework import serializers
from .models import Asset, Transaction

class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = ["id", "symbol", "name", "created_at"]
        read_only_fields = ["id", "created_at"]

class TransactionSerializer(serializers.ModelSerializer):
    asset_symbol = serializers.CharField(source="asset.symbol", read_only=True)

    class Meta:
        model = Transaction
        fields = ["id", "asset", "asset_symbol", "kind", "quantity", "price", "date", "created_at"]
        read_only_fields = ["id", "created_at", "asset_symbol"]
