from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction, IntegrityError
from rest_framework import serializers

from .models import AccountProfile, clean_cpf, is_valid_cpf

User = get_user_model()


class SignupSerializer(serializers.Serializer):
    # auth
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True, min_length=6)

    # profile (obrigatórios no seu caso)
    full_name = serializers.CharField(max_length=150)
    cpf = serializers.CharField(max_length=14)  # aceita com máscara também

    # opcionais
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    dob = serializers.DateField(required=False, allow_null=True)
    zip_code = serializers.CharField(max_length=20, required=False, allow_blank=True)
    street = serializers.CharField(max_length=200, required=False, allow_blank=True)
    number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    complement = serializers.CharField(max_length=120, required=False, allow_blank=True)
    neighborhood = serializers.CharField(max_length=120, required=False, allow_blank=True)
    city = serializers.CharField(max_length=120, required=False, allow_blank=True)
    state = serializers.CharField(max_length=80, required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "As senhas não conferem."})

        # normaliza cpf
        cpf = clean_cpf(attrs.get("cpf", ""))
        if not is_valid_cpf(cpf):
            raise serializers.ValidationError({"cpf": "CPF inválido."})
        attrs["cpf"] = cpf

        # (opcional) email único
        email = (attrs.get("email") or "").strip().lower()
        if email:
            if User.objects.filter(email__iexact=email).exists():
                raise serializers.ValidationError({"email": "Este e-mail já está em uso."})
            attrs["email"] = email

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        validated_data.pop("password2")

        # dados do profile
        profile_fields = {
            "full_name": validated_data.pop("full_name"),
            "cpf": validated_data.pop("cpf"),
            "phone": validated_data.pop("phone", ""),
            "dob": validated_data.pop("dob", None),
            "zip_code": validated_data.pop("zip_code", ""),
            "street": validated_data.pop("street", ""),
            "number": validated_data.pop("number", ""),
            "complement": validated_data.pop("complement", ""),
            "neighborhood": validated_data.pop("neighborhood", ""),
            "city": validated_data.pop("city", ""),
            "state": validated_data.pop("state", ""),
        }

        try:
            with transaction.atomic():
                user = User(
                    username=validated_data["username"],
                    email=validated_data.get("email", ""),
                )
                user.set_password(password)
                user.save()

                AccountProfile.objects.create(user=user, **profile_fields)

                return user

        except IntegrityError:
            # pega duplicidade de cpf (unique) ou username/email (se tiver unique)
            # responde de forma amigável:
            if AccountProfile.objects.filter(cpf=profile_fields["cpf"]).exists():
                raise serializers.ValidationError({"cpf": "CPF já cadastrado."})
            raise serializers.ValidationError({"detail": "Não foi possível criar o usuário. Verifique os dados."})