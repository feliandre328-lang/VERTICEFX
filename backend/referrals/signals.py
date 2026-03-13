from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .services import ensure_referral_profile


User = get_user_model()


@receiver(post_save, sender=User)
def ensure_referral_profile_on_save(sender, instance, created, **kwargs):
    ensure_referral_profile(instance)
