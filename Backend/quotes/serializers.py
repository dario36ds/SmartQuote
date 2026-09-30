from django.db import transaction
from rest_framework import serializers

from .models import Quote, QuoteItem


class QuoteItemSerializer(serializers.ModelSerializer):
    total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = QuoteItem
        fields = (
            "id",
            "description",
            "quantity",
            "unit_price",
            "total",
        )

        read_only_fields = (
            "id",
            "total",
        )

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "La quantità deve essere maggiore di zero."
            )

        return value

    def validate_unit_price(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Il prezzo non può essere negativo."
            )

        return value


class QuoteSerializer(serializers.ModelSerializer):
    items = QuoteItemSerializer(many=True)

    total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = Quote

        fields = (
            "id",
            "customer",
            "title",
            "description",
            "delivery_time",
            "status",
            "public_token",
            "items",
            "total",
            "created_at",
            "updated_at",
            "sent_at",
            "viewed_at",
            "accepted_at",
            "rejected_at",
        )

        read_only_fields = (
            "id",
            "status",
            "public_token",
            "total",
            "created_at",
            "updated_at",
            "sent_at",
            "viewed_at",
            "accepted_at",
            "rejected_at",
        )

    def validate_customer(self, customer):
        request = self.context.get("request")

        if request and customer.user != request.user:
            raise serializers.ValidationError(
                "Il cliente selezionato non appartiene all'utente autenticato."
            )

        return customer
    
    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError(
                "Il preventivo deve contenere almeno una voce."
            )

        return items

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items")

        quote = Quote.objects.create(**validated_data)

        for item_data in items_data:
            QuoteItem.objects.create(
                quote=quote,
                **item_data,
            )

        return quote

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)

        for attribute, value in validated_data.items():
            setattr(instance, attribute, value)

        instance.save()

        if items_data is not None:
            instance.items.all().delete()

            for item_data in items_data:
                QuoteItem.objects.create(
                    quote=instance,
                    **item_data,
                )

        return instance

class PublicQuoteSerializer(serializers.ModelSerializer):
    items = QuoteItemSerializer(many=True, read_only=True)

    total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    customer_name = serializers.CharField(
        source="customer.name",
        read_only=True,
    )

    company_name = serializers.CharField(
        source="customer.company",
        read_only=True,
    )

    class Meta:
        model = Quote
        fields = (
            "title",
            "description",
            "delivery_time",
            "status",
            "customer_name",
            "company_name",
            "items",
            "total",
            "sent_at",
            "viewed_at",
            "accepted_at",
            "rejected_at",
        )