from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        profile = getattr(u, "account_profile", None)
        return Response({
            "id": u.id,
            "username": u.get_username(),
            "email": getattr(u, "email", ""),
            "is_staff": bool(u.is_staff),
            "is_superuser": bool(u.is_superuser),
            "is_active": bool(u.is_active),
            "date_joined": getattr(u, "date_joined", None),
            "profile": {
                "full_name": getattr(profile, "full_name", ""),
                "cpf": getattr(profile, "cpf", ""),
                "phone": getattr(profile, "phone", ""),
                "dob": getattr(profile, "dob", None),
                "zip_code": getattr(profile, "zip_code", ""),
                "street": getattr(profile, "street", ""),
                "number": getattr(profile, "number", ""),
                "complement": getattr(profile, "complement", ""),
                "neighborhood": getattr(profile, "neighborhood", ""),
                "city": getattr(profile, "city", ""),
                "state": getattr(profile, "state", ""),
            } if profile else None,
        })
