from abc import ABC, abstractmethod


class CategoryHandler(ABC):
    @abstractmethod
    def get_decomposer_prompt(self, total_duration_days: int = 14) -> str:
        """System prompt for requirement decomposition."""
        ...

    @abstractmethod
    def get_judge_prompt(self) -> str:
        """System prompt for AQA evaluation."""
        ...

    @abstractmethod
    def validate_deliverable(self, text: str) -> None:
        """Validate deliverable before AI. Raise ValueError with user-facing message if invalid."""
        ...
