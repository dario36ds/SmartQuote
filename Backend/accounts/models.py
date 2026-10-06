from django.db import models
from django.conf import settings
from django.core.validators import URLValidator

from config.validators import validate_phone


class CompanyProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="company_profile",
    )
    name = models.CharField(max_length=150, blank=True)
    logo = models.TextField(blank=True)
    address = models.CharField(max_length=500, blank=True)
    vat_number = models.CharField(max_length=32, blank=True)
    phone = models.CharField(max_length=30, blank=True, validators=[validate_phone])
    website = models.URLField(
        max_length=200, blank=True, validators=[URLValidator(schemes=["http", "https"])],
    )

    def __str__(self):
        return self.name or f"Profilo aziendale di {self.user}"
