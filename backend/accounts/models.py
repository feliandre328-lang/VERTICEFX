from __future__ import annotations

import re
from django.conf import settings
from django.db import models
from django.core.exceptions import ValidationError


def clean_cpf(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def is_valid_cpf(value: str) -> bool:
    cpf = clean_cpf(value)

    if len(cpf) != 11:
        return False
    if cpf == cpf[0] * 11:
        return False

    def calc_digit(digs: str) -> int:
        s = sum(int(d) * w for d, w in zip(digs, range(len(digs) + 1, 1, -1)))
        r = (s * 10) % 11
        return 0 if r == 10 else r

    d1 = calc_digit(cpf[:9])
    d2 = calc_digit(cpf[:10])
    return cpf[-2:] == f"{d1}{d2}"


def validate_cpf(value: str):
    cpf = clean_cpf(value)
    if not is_valid_cpf(cpf):
        raise ValidationError("CPF inválido.")


class AccountProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="account_profile",
        db_index=True,
    )

    full_name = models.CharField(max_length=150)

    # CPF obrigatório: somente números, único
    cpf = models.CharField(
        max_length=11,
        unique=True,
        db_index=True,
        validators=[validate_cpf],
        help_text="Somente números (11 dígitos).",
    )

    phone = models.CharField(max_length=20, blank=True, default="")
    dob = models.DateField(null=True, blank=True)

    zip_code = models.CharField(max_length=20, blank=True, default="")
    street = models.CharField(max_length=200, blank=True, default="")
    number = models.CharField(max_length=20, blank=True, default="")
    complement = models.CharField(max_length=120, blank=True, default="")
    neighborhood = models.CharField(max_length=120, blank=True, default="")
    city = models.CharField(max_length=120, blank=True, default="")
    state = models.CharField(max_length=80, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["cpf"]),
            models.Index(fields=["created_at"]),
        ]

    def save(self, *args, **kwargs):
        if self.cpf:
            self.cpf = clean_cpf(self.cpf)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.full_name} ({self.cpf})"