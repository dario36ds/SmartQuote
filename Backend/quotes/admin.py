from django.contrib import admin

# Register your models here.
from django.contrib import admin

from .models import Quote, QuoteItem


class QuoteItemInline(admin.TabularInline):
    model = QuoteItem
    extra = 1


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "customer",
        "status",
        "created_at",
    )

    list_filter = ("status",)

    search_fields = (
        "title",
        "customer__name",
        "customer__company",
    )

    inlines = [QuoteItemInline]


@admin.register(QuoteItem)
class QuoteItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "description",
        "quote",
        "quantity",
        "unit_price",
    )