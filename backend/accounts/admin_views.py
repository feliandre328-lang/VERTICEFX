from django.contrib.auth import get_user_model
from django.db.models import Sum
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import AccountProfile
from accounts.serializers import SignupSerializer

from portfolio.models import Investment
from withdrawals.models import WithdrawalRequest

User = get_user_model()


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