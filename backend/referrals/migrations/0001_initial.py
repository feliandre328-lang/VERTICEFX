from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ReferralProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("referral_code", models.CharField(db_index=True, max_length=24, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="referral_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="ReferralInvite",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("referred_name", models.CharField(blank=True, max_length=120)),
                ("referred_email", models.EmailField(blank=True, max_length=254)),
                ("status", models.CharField(choices=[("PENDING", "Pendente"), ("ACTIVE", "Ativo")], default="PENDING", max_length=12)),
                ("credits_cents", models.PositiveIntegerField(default=0)),
                ("joined_date", models.DateTimeField(auto_now_add=True)),
                ("activated_at", models.DateTimeField(blank=True, null=True)),
                (
                    "referred_user",
                    models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="referral_invite_received",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "referrer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="referral_invites_sent",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-joined_date"],
            },
        ),
        migrations.AddIndex(
            model_name="referralinvite",
            index=models.Index(fields=["referrer", "status"], name="referrals_r_referr_f17f46_idx"),
        ),
        migrations.AddIndex(
            model_name="referralinvite",
            index=models.Index(fields=["status"], name="referrals_r_status_21db53_idx"),
        ),
        migrations.AddConstraint(
            model_name="referralinvite",
            constraint=models.CheckConstraint(
                condition=~models.Q(referrer=models.F("referred_user")),
                name="referral_referrer_diff_referred",
            ),
        ),
    ]
