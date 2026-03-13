from django.urls import path
from accounts.admin_views import (
    AdminClientsView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    SignupView,
)

urlpatterns = [
    path("auth/signup/", SignupView.as_view(), name="signup"),
    path("auth/password-reset/request/", PasswordResetRequestView.as_view(), name="password_reset_request"),
    path("auth/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
    path("admin/clients/", AdminClientsView.as_view(), name="admin_clients"),
]
