from rest_framework import viewsets
from .models import Asset, Transaction
from .serializers import AssetSerializer, TransactionSerializer

class AssetViewSet(viewsets.ModelViewSet):
    serializer_class = AssetSerializer
    def get_queryset(self):
        return Asset.objects.filter(user=self.request.user).order_by("symbol")
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).select_related("asset").order_by("-date", "-id")
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
