from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import AccountProfile

User = get_user_model()


class AccountProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountProfile
        fields = [
            "full_name",
            "cpf",
            "phone",
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
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True, min_length=6)

    full_name = serializers.CharField(max_length=150)
    cpf = serializers.CharField(max_length=11)
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
            raise serializers.ValidationError({"password2": "As senhas não conferem."})

        cpf = (attrs.get("cpf") or "").strip()
        if not cpf.isdigit() or len(cpf) != 11:
            raise serializers.ValidationError({"cpf": "CPF deve ter 11 dígitos (somente números)."})

        # valida CPF único
        if AccountProfile.objects.filter(cpf=cpf).exists():
            raise serializers.ValidationError({"cpf": "CPF já cadastrado."})

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        validated_data.pop("password2", None)

        username = validated_data.pop("username")
        email = validated_data.pop("email", "")

        user = User.objects.create_user(username=username, email=email, password=password)

        profile_fields = {
            "full_name": validated_data.get("full_name", ""),
            "cpf": validated_data.get("cpf", ""),
            "phone": validated_data.get("phone", ""),
            "dob": validated_data.get("dob", None),
            "zip_code": validated_data.get("zip_code", ""),
            "street": validated_data.get("street", ""),
            "number": validated_data.get("number", ""),
            "complement": validated_data.get("complement", ""),
            "neighborhood": validated_data.get("neighborhood", ""),
            "city": validated_data.get("city", ""),
            "state": validated_data.get("state", ""),
        }

        AccountProfile.objects.create(user=user, **profile_fields)
        return user


class AdminClientSerializer(serializers.ModelSerializer):
    profile = AccountProfileSerializer(source="account_profile", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "is_active", "date_joined", "profile"]