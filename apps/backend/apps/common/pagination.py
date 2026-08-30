"""
Closet by Chilli — Standard API Pagination.

Defines project-wide pagination defaults compliant with
04-backend-architecture.md and 35-api-error-response-standards.md.
"""

from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """
    Default pagination class for list endpoints across all domains.

    - page_size: 20 (default records per page)
    - page_size_query_param: 'page_size' (allows client customization)
    - max_page_size: 100 (prevents unbounded memory usage)
    - page_query_param: 'page' (1-indexed page parameter)
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
    page_query_param = "page"
