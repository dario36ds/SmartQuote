from decimal import Decimal

from rest_framework import serializers


class QuickQuoteInputSerializer(serializers.Serializer):
    text = serializers.CharField(
        min_length=10,
        max_length=5000,
    )


class QuickQuoteItemSerializer(serializers.Serializer):
    description = serializers.CharField()
    quantity = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )
    unit_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0"),
        allow_null=True,
    )


class QuickQuoteOutputSerializer(serializers.Serializer):
    customer_name = serializers.CharField(
        allow_null=True,
        allow_blank=True,
    )

    company_name = serializers.CharField(
        allow_null=True,
        allow_blank=True,
    )

    title = serializers.CharField(
        allow_null=True,
        allow_blank=True,
    )

    items = QuickQuoteItemSerializer(
        many=True,
    )

    delivery_time = serializers.CharField(
        allow_null=True,
        allow_blank=True,
    )

    missing_information = serializers.ListField(
        child=serializers.CharField(),
    )