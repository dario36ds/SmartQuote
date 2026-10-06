import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from customers.models import Customer


class Quote(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Bozza"
        SENT = "SENT", "Inviato"
        VIEWED = "VIEWED", "Visualizzato"
        ACCEPTED = "ACCEPTED", "Accettato"
        REJECTED = "REJECTED", "Rifiutato"

    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="quotes",
    )

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    public_token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
    )

    delivery_time = models.CharField(
        max_length=150,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    sent_at = models.DateTimeField(null=True, blank=True)
    viewed_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.title

    @property
    def total(self):
        return sum(item.total for item in self.items.all())


class QuoteItem(models.Model):
    quote = models.ForeignKey(
        Quote,
        on_delete=models.CASCADE,
        related_name="items",
    )

    description = models.CharField(max_length=255)

    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=1,
    )

    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    def __str__(self):
        return self.description

    @property
    def total(self):
        return self.quantity * self.unit_price


class QuoteReminderSettings(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="quote_reminder_settings",
    )
    enabled = models.BooleanField(default=True)
    after_days = models.PositiveSmallIntegerField(
        default=7, validators=[MinValueValidator(1), MaxValueValidator(365)],
    )

    class Meta:
        constraints = [models.CheckConstraint(
            condition=models.Q(after_days__gte=1, after_days__lte=365),
            name="quote_reminder_days_range",
        )]


class QuoteNotification(models.Model):
    REMINDER = "REMINDER"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="quote_notifications",
    )
    quote = models.ForeignKey(
        Quote,
        on_delete=models.SET_NULL,
        null=True,
        related_name="notifications",
    )
    status = models.CharField(
        max_length=20,
        choices=[
            (Quote.Status.ACCEPTED, "Accettato"),
            (Quote.Status.REJECTED, "Rifiutato"),
            (REMINDER, "Da sollecitare"),
        ],
    )
    quote_title = models.CharField(max_length=200)
    customer_name = models.CharField(max_length=150)
    created_at = models.DateTimeField(default=timezone.now)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["user", "read_at", "-created_at"])]
        constraints = [
            models.UniqueConstraint(
                fields=["quote"], condition=models.Q(status="REMINDER"),
                name="unique_quote_reminder",
            ),
            models.UniqueConstraint(
                fields=["quote"], condition=models.Q(status__in=["ACCEPTED", "REJECTED"]),
                name="unique_quote_response",
            ),
        ]
