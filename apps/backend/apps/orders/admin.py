"""Orders app admin configuration."""

from django.contrib import admin

from apps.orders.models import Order, OrderItem


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        "order_number",
        "user",
        "status",
        "payment_status",
        "total",
        "currency",
        "created_at",
    ]
    list_filter = ["status", "payment_status", "currency"]
    search_fields = ["order_number", "user__email"]
    readonly_fields = ["order_number", "created_at", "updated_at"]
    ordering = ["-created_at"]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = [
        "order_number",
        "product_name",
        "variant_name",
        "sku",
        "quantity",
        "line_total",
    ]
    list_filter = ["order__status", "order__payment_status"]
    search_fields = ["order__order_number", "product_name", "sku"]
    readonly_fields = ["order", "product_name", "variant_name", "sku", "unit_price"]
    ordering = ["-order__created_at"]

    @admin.display(description="Order")
    def order_number(self, obj: OrderItem) -> str:
        return obj.order.order_number
