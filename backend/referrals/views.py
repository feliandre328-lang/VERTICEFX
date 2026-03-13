from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ReferralInvite
from .serializers import (
    AdminReferralActivateSerializer,
    ReferralCodeResolveSerializer,
    ReferralInviteCreateSerializer,
    ReferralInviteSerializer,
    ReferralSummarySerializer,
)
from .services import (
    MAX_COMMISSION_INVITES,
    MULTILEVEL_COMMISSION_RATES_BP,
    get_referral_slots_used,
    resolve_referrer_by_code,
)


class ReferralSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = ReferralSummarySerializer.build_for_user(request.user)
        out_ser = ReferralSummarySerializer(data=data)
        out_ser.is_valid(raise_exception=True)
        return Response(out_ser.data, status=status.HTTP_200_OK)


class ReferralCodeResolveView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, code: str):
        referrer = resolve_referrer_by_code(code)
        if not referrer:
            return Response({"detail": "Codigo de convite invalido."}, status=status.HTTP_404_NOT_FOUND)

        profile = getattr(referrer, "account_profile", None)
        slots_used = get_referral_slots_used(referrer)
        slots_remaining = max(MAX_COMMISSION_INVITES - slots_used, 0)

        payload = {
            "code": str(code or "").strip().upper(),
            "referrer": {
                "id": referrer.id,
                "username": referrer.username,
                "full_name": getattr(profile, "full_name", "") if profile else "",
            },
            "commission_invites_limit": MAX_COMMISSION_INVITES,
            "commission_invites_used": slots_used,
            "commission_invites_remaining": slots_remaining,
            "commission_rates": {
                "level_1_percent": MULTILEVEL_COMMISSION_RATES_BP[1] / 100,
                "level_2_percent": MULTILEVEL_COMMISSION_RATES_BP[2] / 100,
                "level_3_percent": MULTILEVEL_COMMISSION_RATES_BP[3] / 100,
            },
        }
        out_ser = ReferralCodeResolveSerializer(data=payload)
        out_ser.is_valid(raise_exception=True)
        return Response(out_ser.data, status=status.HTTP_200_OK)


class ClientReferralInviteViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ReferralInvite.objects.filter(referrer=self.request.user).select_related("referred_user").order_by("-joined_date")

    def get_serializer_class(self):
        if self.action == "create":
            return ReferralInviteCreateSerializer
        return ReferralInviteSerializer

    def create(self, request, *args, **kwargs):
        in_ser = self.get_serializer(data=request.data)
        in_ser.is_valid(raise_exception=True)
        invite = in_ser.save()
        out_ser = ReferralInviteSerializer(invite)
        return Response(out_ser.data, status=status.HTTP_201_CREATED)


class AdminReferralInviteViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = ReferralInviteSerializer

    def get_queryset(self):
        qs = ReferralInvite.objects.select_related("referrer", "referred_user").order_by("-joined_date")
        status_param = self.request.query_params.get("status")
        referrer_id = self.request.query_params.get("referrer_id")
        if status_param:
            qs = qs.filter(status=status_param)
        if referrer_id:
            qs = qs.filter(referrer_id=referrer_id)
        return qs

    @action(detail=False, methods=["post"], permission_classes=[IsAdminUser], url_path="activate")
    def activate(self, request):
        in_ser = AdminReferralActivateSerializer(data=request.data)
        in_ser.is_valid(raise_exception=True)
        invite = in_ser.save()
        out_ser = ReferralInviteSerializer(invite)
        return Response(out_ser.data, status=status.HTTP_200_OK)
