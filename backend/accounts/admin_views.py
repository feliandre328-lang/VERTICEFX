from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db.models import Sum
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import AccountProfile
from accounts.serializers import (
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    SignupSerializer,
)

from portfolio.models import Investment
from withdrawals.models import DailyPerformanceDistribution, WithdrawalRequest

User = get_user_model()


def _resolve_frontend_base_url(request) -> str:
    configured = (getattr(settings, "FRONTEND_BASE_URL", "") or "").strip()
    if configured:
        return configured.rstrip("/")

    origin = (request.headers.get("Origin", "") or "").strip()
    if origin.startswith("http://") or origin.startswith("https://"):
        return origin.rstrip("/")

    return "http://localhost:3000"


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        ser = PasswordResetRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        identifier = ser.validated_data["identifier"].strip()
        safe_msg = "Se a conta existir, as instruções de redefinição foram geradas."

        user = User.objects.filter(username__iexact=identifier).first()
        if user is None:
            user = User.objects.filter(email__iexact=identifier).first()

        if not user or not user.is_active:
            return Response({"detail": safe_msg}, status=status.HTTP_200_OK)

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_base = _resolve_frontend_base_url(request)
        reset_url = f"{frontend_base}/reset-password?uid={uid}&token={token}"

        email_sent = False
        if user.email and getattr(settings, "PASSWORD_RESET_SEND_EMAIL", False):
            subject = "Redefinição de senha - Vértice FX"
            message = (
                "Recebemos uma solicitação para redefinir sua senha.\n\n"
                f"Acesse o link para continuar:\n{reset_url}\n\n"
                "Se você não solicitou esta alteração, ignore este e-mail."
            )
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                email_sent = True
            except Exception:
                email_sent = False

        response_data = {"detail": safe_msg, "delivery": "email" if email_sent else "manual"}
        if not email_sent:
            response_data["reset_url"] = reset_url

        return Response(response_data, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        ser = PasswordResetConfirmSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        uid = ser.validated_data["uid"]
        token = ser.validated_data["token"]
        new_password = ser.validated_data["new_password"]

        invalid_msg = "Link de redefinição inválido ou expirado."

        try:
            user_pk = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_pk)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"detail": invalid_msg}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({"detail": invalid_msg}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response({"detail": "Senha redefinida com sucesso."}, status=status.HTTP_200_OK)


class AdminClientsView(APIView):
    """
    Admin: Lista clientes para área de Clientes/KYC.
    Retorna user + profile.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = (
            User.objects
            .all()
            .order_by("-date_joined")
            .values("id", "username", "email", "is_active", "date_joined")
        )

        profiles = {
            p.user_id: p
            for p in AccountProfile.objects.select_related("user").all()
        }

        out = []
        for u in users:
            p = profiles.get(u["id"])
            out.append({
                "id": u["id"],
                "username": u["username"],
                "email": u["email"],
                "is_active": u["is_active"],
                "date_joined": u["date_joined"],
                "profile": {
                    "full_name": getattr(p, "full_name", ""),
                    "cpf": getattr(p, "cpf", ""),
                    "phone": getattr(p, "phone", ""),
                    "dob": getattr(p, "dob", None),
                    "zip_code": getattr(p, "zip_code", ""),
                    "street": getattr(p, "street", ""),
                    "number": getattr(p, "number", ""),
                    "complement": getattr(p, "complement", ""),
                    "neighborhood": getattr(p, "neighborhood", ""),
                    "city": getattr(p, "city", ""),
                    "state": getattr(p, "state", ""),
                },
            })

        return Response(out)


from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser

# ... seus imports: User, Investment, WithdrawalRequest, etc.

class AdminClientStatementView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, user_id: int):
        try:
            # ✅ puxa o OneToOne junto
            u = User.objects.select_related("account_profile").get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "Cliente não encontrado."}, status=404)

        # ✅ profile (pode não existir em usuários antigos)
        profile = getattr(u, "account_profile", None)

        inv_qs = Investment.objects.filter(user=u).order_by("-created_at")
        wd_qs = WithdrawalRequest.objects.filter(user=u).order_by("-requested_at")

        invested_cents = (
            inv_qs.filter(status="APPROVED").aggregate(s=Sum("amount_cents"))["s"] or 0
        )
        withdrawn_cents = (
            wd_qs.filter(status__in=["APPROVED", "PAID"]).aggregate(s=Sum("amount_cents"))["s"] or 0
        )
        balance_cents = invested_cents - withdrawn_cents
        total_gained_cents = (
            DailyPerformanceDistribution.objects.filter(user=u).aggregate(s=Sum("result_cents"))["s"] or 0
        )

        investments = list(
            inv_qs.values("id", "amount_cents", "status", "created_at", "external_ref", "paid_at")
        )

        withdrawals = list(
            wd_qs.values(
                "id",
                "amount_cents",
                "status",
                "external_ref",
                "withdrawal_type",
                "pix_key",
                "scheduled_for",
                "requested_at",
                "approved_at",
                "paid_at",
            )
        )

        # padroniza pra frontend (created_at)
        for w in withdrawals:
            w["created_at"] = w.get("requested_at")

        return Response(
            {
                "user": {
                    "id": u.id,
                    "username": getattr(u, "username", ""),
                    "email": getattr(u, "email", ""),
                    "is_active": getattr(u, "is_active", True),
                    "date_joined": getattr(u, "date_joined", None),
                },
                # ✅ AGORA O FRONTEND VAI RECEBER O PROFILE
                "profile": {
                    "full_name": getattr(profile, "full_name", None),
                    "cpf": getattr(profile, "cpf", None),
                    "phone": getattr(profile, "phone", None),
                    "dob": getattr(profile, "dob", None),
                    "zip_code": getattr(profile, "zip_code", None),
                    "street": getattr(profile, "street", None),
                    "number": getattr(profile, "number", None),
                    "complement": getattr(profile, "complement", None),
                    "neighborhood": getattr(profile, "neighborhood", None),
                    "city": getattr(profile, "city", None),
                    "state": getattr(profile, "state", None),
                } if profile else None,
                "totals": {
                    "invested_cents": invested_cents,
                    "withdrawn_cents": withdrawn_cents,
                    "balance_cents": balance_cents,
                    "total_gained_cents": total_gained_cents,
                },
                "investments": investments,
                "withdrawals": withdrawals,
            }
        )


class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = SignupSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()

        refresh = RefreshToken.for_user(user)

        # se você garante que sempre existe:
        profile = getattr(user, "account_profile", None)

        return Response(
            {
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                },
                "profile": {
                    "full_name": getattr(profile, "full_name", ""),
                    "cpf": getattr(profile, "cpf", ""),
                    "phone": getattr(profile, "phone", ""),
                },
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )
