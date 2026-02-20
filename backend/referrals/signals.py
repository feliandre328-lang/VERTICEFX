from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import ReferralProfile


User = get_user_model()


def _generate_unique_code(max_attempts: int = 10) -> str:
    for _ in range(max_attempts):
        code = ReferralProfile.generate_code()
        if not ReferralProfile.objects.filter(referral_code=code).exists():
            return code
    raise RuntimeError("Nao foi possivel gerar referral_code unico.")


@receiver(post_save, sender=User)
def ensure_referral_profile(sender, instance, created, **kwargs):
    if not created:
        return

    try:
        ReferralProfile.objects.create(user=instance, referral_code=_generate_unique_code())
    except IntegrityError:
        if not ReferralProfile.objects.filter(user=instance).exists():
            ReferralProfile.objects.create(user=instance, referral_code=_generate_unique_code())
