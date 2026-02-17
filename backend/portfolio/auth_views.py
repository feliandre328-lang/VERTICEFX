from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        return Response({
            "id": u.id,
            "username": u.get_username(),
            "email": getattr(u, "email", ""),
            "is_staff": bool(u.is_staff),
            "is_superuser": bool(u.is_superuser),
        })
