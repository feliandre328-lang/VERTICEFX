from django.urls import path
from accounts.admin_views import SignupView, AdminClientsView

urlpatterns = [
    path("auth/signup/", SignupView.as_view(), name="signup"),
    path("admin/clients/", AdminClientsView.as_view(), name="admin_clients"),
]