import base64
import binascii
import warnings
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework import serializers

MAX_LOGO_BYTES = 512 * 1024
MAX_LOGO_LENGTH = 4 * ((MAX_LOGO_BYTES + 2) // 3) + 32
LOGO_FORMATS = {"image/png": "PNG", "image/jpeg": "JPEG", "image/webp": "WEBP"}


def normalize_logo(value):
    """Store a small raster logo in the database, together with profile backups."""
    if not value:
        return ""
    header, separator, encoded = value.partition(",")
    mime = header.removeprefix("data:").removesuffix(";base64")
    if not separator or mime not in LOGO_FORMATS or header != f"data:{mime};base64":
        raise serializers.ValidationError("Carica un logo PNG, JPG o WebP.")
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise serializers.ValidationError("Il file del logo non è valido.") from exc
    if len(raw) > MAX_LOGO_BYTES:
        raise serializers.ValidationError("Il logo non può superare 512 KB.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(raw)) as source:
                if source.format != LOGO_FORMATS[mime]:
                    raise serializers.ValidationError("Il contenuto del logo non corrisponde al formato dichiarato.")
                if source.width * source.height > 4_000_000:
                    raise serializers.ValidationError("Il logo non può superare 4 milioni di pixel.")
                source.load()
                image = ImageOps.exif_transpose(source).convert("RGBA")
                image.thumbnail((256, 256), Image.Resampling.LANCZOS)
                image.info.clear()
                output = BytesIO()
                image.save(output, format="PNG")
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise serializers.ValidationError("Il file del logo non è un’immagine valida.") from exc
    return "data:image/png;base64," + base64.b64encode(output.getvalue()).decode("ascii")
