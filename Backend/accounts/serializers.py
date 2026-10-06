from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from rest_framework import serializers

from config.validators import validate_contact_email
from .models import CompanyProfile
from .logo import MAX_LOGO_LENGTH, normalize_logo


class CompanyProfileSerializer(serializers.ModelSerializer):
    logo = serializers.CharField(max_length=MAX_LOGO_LENGTH, required=False, allow_blank=True)
    website = serializers.URLField(
        max_length=200, required=False, allow_blank=True,
        validators=[URLValidator(schemes=["http", "https"])],
        error_messages={"invalid": "Inserisci un sito valido che inizi con https:// o http://."},
    )

    class Meta:
        model = CompanyProfile
        fields = ("name", "address", "vat_number", "phone", "website", "logo")

    def validate_logo(self, value):
        return normalize_logo(value)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "password",
        )
        extra_kwargs = {
            "email": {
                "validators": [validate_contact_email],
                "error_messages": {"invalid": "Inserisci un indirizzo email valido, ad esempio nome@azienda.it."},
            },
        }

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
        )


class ConfirmPasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_current_password(self, value):
        if not self.context["user"].check_password(value):
            raise serializers.ValidationError("La password attuale non è corretta.")
        return value


class ChangeEmailSerializer(ConfirmPasswordSerializer):
    email = serializers.EmailField(
        max_length=254, validators=[validate_contact_email],
        error_messages={"invalid": "Inserisci un indirizzo email valido, ad esempio nome@azienda.it."},
    )


class ChangePasswordSerializer(ConfirmPasswordSerializer):
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)
    confirm_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "Le password non coincidono.",
            })
        if attrs["new_password"] == attrs["current_password"]:
            raise serializers.ValidationError({
                "new_password": "La nuova password deve essere diversa da quella attuale.",
            })
        try:
            validate_password(attrs["new_password"], user=self.context["user"])
        except ValidationError as exc:
            raise serializers.ValidationError({"new_password": exc.messages}) from exc
        return attrs
