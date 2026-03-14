from ai.base_handler import CategoryHandler
from ai.handlers.writing import WritingHandler
from ai.handlers.translation import TranslationHandler
from ai.handlers.code import CodeHandler

CATEGORY_REGISTRY: dict[str, CategoryHandler] = {
    "WRITING": WritingHandler(),
    "TRANSLATION": TranslationHandler(),
    "CODE": CodeHandler(),
}

SUPPORTED_CATEGORIES = list(CATEGORY_REGISTRY.keys())


def get_handler(category: str) -> CategoryHandler:
    handler = CATEGORY_REGISTRY.get(category)
    if handler is None:
        raise ValueError(f"Unsupported category: '{category}'. Supported: {SUPPORTED_CATEGORIES}")
    return handler
