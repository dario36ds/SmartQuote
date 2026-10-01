from django.contrib import admin

from .models import Quote, QuoteItem


class QuoteItemInline(admin.TabularInline):
    model = QuoteItem
    extra = 1
    fields = (
        "description",
        "quantity",
        "unit_price",
        "item_total",
    )
    readonly_fields = ("item_total",)

    @admin.display(description="Totale")
    def item_total(self, obj):
        if not obj.pk:
            return "-"
        return f"€ {obj.total:.2f}"


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "customer",
        "status",
        "quote_total",
        "delivery_time",
        "created_at",
    )

    list_filter = (
        "status",
        "created_at",
    )

    search_fields = (
        "title",
        "customer__name",
        "customer__company",
        "customer__email",
    )

    readonly_fields = (
        "public_token",
        "quote_total",
        "created_at",
        "updated_at",
        "sent_at",
        "viewed_at",
        "accepted_at",
        "rejected_at",
    )

    inlines = [
        QuoteItemInline,
    ]

    fieldsets = (
        (
            "Preventivo",
            {
                "fields": (
                    "customer",
                    "title",
                    "description",
                    "delivery_time",
                    "status",
                )
            },
        ),
        (
            "Informazioni pubbliche",
            {
                "fields": (
                    "public_token",
                    "quote_total",
                )
            },
        ),
        (
            "Date",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                    "sent_at",
                    "viewed_at",
                    "accepted_at",
                    "rejected_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    @admin.display(description="Totale")
    def quote_total(self, obj):
        if not obj.pk:
            return "-"
        return f"€ {obj.total:.2f}"


@admin.register(QuoteItem)
class QuoteItemAdmin(admin.ModelAdmin):
    list_display = (
        "description",
        "quote",
        "quantity",
        "unit_price",
        "item_total",
    )

    search_fields = (
        "description",
        "quote__title",
    )

    @admin.display(description="Totale")
    def item_total(self, obj):
        return f"€ {obj.total:.2f}"