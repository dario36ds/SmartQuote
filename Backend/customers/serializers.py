from rest_framework import serializers

from config.validators import validate_contact_email, validate_phone
from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=False, allow_blank=True, max_length=254,
        validators=[validate_contact_email],
        error_messages={"invalid": "Inserisci un indirizzo email valido, ad esempio nome@azienda.it."},
    )
    phone = serializers.CharField(
        required=False, allow_blank=True, max_length=50, validators=[validate_phone],
    )

    class Meta:
        model = Customer
        fields = (
            "id",
            "name",
            "company",
            "email",
            "phone",
            "address",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
        )

        extra_kwargs = {
            "name": {"error_messages": {"blank": "Inserisci il nome del cliente.", "required": "Inserisci il nome del cliente."}},
        }
