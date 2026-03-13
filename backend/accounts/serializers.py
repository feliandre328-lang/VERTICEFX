from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from referrals.services import attach_referral_on_signup, resolve_referrer_by_code

from .models import AccountProfile

User = get_user_model()


class AccountProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountProfile
        fields = [
            "full_name",
            "cpf",
            "phone",
            "pix_key_type",
            "pix_key",
            "dob",
            "zip_code",
            "street",
            "number",
            "complement",
            "neighborhood",
            "city",
            "state",
        ]


class SignupSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=True)

    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True, min_length=6)

    full_name = serializers.CharField(max_length=150)

    cpf = serializers.CharField(max_length=14)

    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    pix_key_type = serializers.ChoiceField(
        choices=AccountProfile.PIX_KEY_TYPES,
        required=False,
        allow_blank=True
    )

    pix_key = serializers.CharField(max_length=140, required=False, allow_blank=True)

    dob = serializers.DateField(required=False, allow_null=True)

    zip_code = serializers.CharField(max_length=20, required=False, allow_blank=True)
    street = serializers.CharField(max_length=200, required=False, allow_blank=True)
    number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    complement = serializers.CharField(max_length=120, required=False, allow_blank=True)
    neighborhood = serializers.CharField(max_length=120, required=False, allow_blank=True)
    city = serializers.CharField(max_length=120, required=False, allow_blank=True)
    state = serializers.CharField(max_length=80, required=False, allow_blank=True)

    referral_code = serializers.CharField(max_length=24, required=False, allow_blank=True)

    def validate(self, attrs):

        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password2": "As senhas nao conferem."})

        username = (attrs.get("username") or "").strip()

        if not username:
            raise serializers.ValidationError({"username": "Username obrigatorio."})

        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError({"username": "Username ja cadastrado."})

        attrs["username"] = username

        cpf = (attrs.get("cpf") or "").strip()

        if not cpf.isdigit() or len(cpf) != 11:
            raise serializers.ValidationError(
                {"cpf": "CPF deve ter 11 digitos (somente numeros)."}
            )

        if AccountProfile.objects.filter(cpf=cpf).exists():
            raise serializers.ValidationError({"cpf": "CPF ja cadastrado."})

        attrs["cpf"] = cpf

        attrs["pix_key"] = (attrs.get("pix_key") or "").strip()

        referral_code = (attrs.get("referral_code") or "").strip()

        if referral_code and not resolve_referrer_by_code(referral_code):
            raise serializers.ValidationError({"referral_code": "Codigo de convite invalido."})

        attrs["referral_code"] = referral_code

        return attrs

    def create(self, validated_data):

        password = validated_data.pop("password")
        validated_data.pop("password2", None)

        referral_code = validated_data.pop("referral_code", "")

        username = validated_data.pop("username")
        email = validated_data.pop("email", "")

        with transaction.atomic():

            user = User.objects.create_user(
                username=username,
                email=email,
                password=password
            )

            profile_fields = {
                "full_name": validated_data.get("full_name", ""),
                "cpf": validated_data.get("cpf", ""),
                "phone": validated_data.get("phone", ""),
                "pix_key_type": validated_data.get("pix_key_type", ""),
                "pix_key": validated_data.get("pix_key", ""),
                "dob": validated_data.get("dob", None),
                "zip_code": validated_data.get("zip_code", ""),
                "street": validated_data.get("street", ""),
                "number": validated_data.get("number", ""),
                "complement": validated_data.get("complement", ""),
                "neighborhood": validated_data.get("neighborhood", ""),
                "city": validated_data.get("city", ""),
                "state": validated_data.get("state", ""),
            }

            AccountProfile.objects.create(
                user=user,
                **profile_fields
            )

            if referral_code:
                try:
                    attach_referral_on_signup(
                        user=user,
                        referral_code=referral_code
                    )
                except ValueError as exc:
                    raise serializers.ValidationError(
                        {"referral_code": str(exc)}
                    ) from exc

        return user


class AdminClientSerializer(serializers.ModelSerializer):

    profile = AccountProfileSerializer(
        source="account_profile",
        read_only=True
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "is_active",
            "date_joined",
            "profile",
        ]


class PasswordResetRequestSerializer(serializers.Serializer):

    identifier = serializers.CharField(max_length=254)


class PasswordResetConfirmSerializer(serializers.Serializer):

    uid = serializers.CharField()
    token = serializers.CharField()

    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        trim_whitespace=False
    )

    new_password2 = serializers.CharField(
        write_only=True,
        min_length=8,
        trim_whitespace=False
    )

    def validate(self, attrs):

        if attrs["new_password"] != attrs["new_password2"]:
            raise serializers.ValidationError(
                {"new_password2": "As senhas nao conferem."}
            )

        validate_password(attrs["new_password"])

        return attrs
