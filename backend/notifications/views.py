from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user).order_by("-created_at")
        unread_only = self.request.query_params.get("unread_only")
        if unread_only in ("1", "true", "True"):
            qs = qs.filter(is_read=False)

        limit = self.request.query_params.get("limit")
        if limit:
            try:
                limit_num = int(limit)
                if limit_num > 0:
                    qs = qs[: min(limit_num, 100)]
            except ValueError:
                pass
        return qs

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated], url_path="unread-count")
    def unread_count(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"unread_count": count}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated], url_path="mark-all-read")
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"ok": True}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated], url_path="mark-read")
    def mark_read(self, request, pk=None):
        obj = self.get_object()
        if obj.user_id != request.user.id:
            return Response({"detail": "Nao autorizado."}, status=status.HTTP_403_FORBIDDEN)
        if not obj.is_read:
            obj.is_read = True
            obj.save(update_fields=["is_read"])
        return Response({"ok": True}, status=status.HTTP_200_OK)
