import re

from django.core.exceptions import ValidationError
from django.core.validators import validate_email


def validate_contact_email(value):
    if not value:
        return
    message = "Inserisci un indirizzo email valido, ad esempio nome@azienda.it."
    try:
        validate_email(value)
    except ValidationError as exc:
        raise ValidationError(message) from exc
    if "." not in value.rsplit("@", 1)[-1]:
        raise ValidationError(message)


def validate_phone(value):
    if not value:
        return
    message = "Inserisci un telefono con 7–15 cifre, usando solo numeri, spazi, trattini, punti e parentesi; il prefisso + o 00 è facoltativo."
    if not re.fullmatch(r"\+?[0-9 ().-]+", value):
        raise ValidationError(message)
    depth = 0
    for character in value:
        if character == "(":
            depth += 1
        elif character == ")":
            depth -= 1
        if depth < 0 or depth > 1:
            raise ValidationError(message)
    if depth:
        raise ValidationError(message)
    normalized = re.sub(r"[ ().-]", "", value)
    international = normalized.startswith(("+", "00"))
    digits = normalized[1:] if normalized.startswith("+") else normalized[2:] if international else normalized
    if not re.fullmatch(r"[0-9]{7,15}", digits) or (international and digits.startswith("0")):
        raise ValidationError(message)
