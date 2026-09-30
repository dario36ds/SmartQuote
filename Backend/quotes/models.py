import uuid

from django.db import models

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