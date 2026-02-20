from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ReferralInvite
from .serializers import (
    AdminReferralActivateSerializer,
    ReferralInviteCreateSerializer,
    ReferralInviteSerializer,
    ReferralSummarySerializer,
)


class ReferralSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = ReferralSummarySerializer.build_for_user(request.user)
        out_ser = ReferralSummarySerializer(data=data)
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
