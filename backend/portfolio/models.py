from django.conf import settings
from django.db import models

class Asset(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assets")
    symbol = models.CharField(max_length=20)
    name = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "symbol")

class Transaction(models.Model):
    KIND = (("BUY", "Buy"), ("SELL", "Sell"))
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions")
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="transactions")
    kind = models.CharField(max_length=4, choices=KIND)
    quantity = models.DecimalField(max_digits=18, decimal_places=6)
    price = models.DecimalField(max_digits=18, decimal_places=6)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
