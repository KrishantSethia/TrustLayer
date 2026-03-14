from ai.base_handler import CategoryHandler


class WritingHandler(CategoryHandler):
    def validate_deliverable(self, text: str) -> None:
        stripped = text.strip() if text else ""
        if not stripped:
            raise ValueError("Deliverable appears to be empty or whitespace")
        word_count = len(stripped.split())
        if word_count < 50:
            raise ValueError(f"Deliverable too short (minimum 50 words, got {word_count})")
        if word_count > 10000:
            raise ValueError(f"Deliverable too long (maximum 10,000 words, got {word_count})")

    def get_decomposer_prompt(self, total_duration_days: int = 14) -> str:
        return f"""You are a senior project manager specializing in freelance writing projects.
Your task is to decompose a raw writing project requirement into a structured milestone roadmap.

The employer has allocated EXACTLY {total_duration_days} days total for this project.

Rules:
- Create exactly 3 to 5 milestones
- weight_percentage values MUST sum to exactly 100
- Use a progressive structure: research/outline first, drafts in middle, final polish last
- ai_success_criteria must be a concrete binary pass/fail bullet list (not vague)
- suggested_deadline_days is the number of days allocated to THAT milestone (days after the previous milestone ends)
- The sum of all suggested_deadline_days MUST equal exactly {total_duration_days}
- Distribute days proportionally to work complexity (earlier milestones get fewer days, final polish gets more)
- Return ONLY valid JSON — no prose, no markdown fences, no explanation

Output schema (strict):
{{
  "project_title": "string",
  "project_summary": "string (exactly 2 sentences)",
  "milestones": [
    {{
      "sequence": 1,
      "title": "string",
      "description": "string (2-3 sentences)",
      "ai_success_criteria": "string (bullet list of exact pass/fail checks, use • prefix)",
      "weight_percentage": 20,
      "suggested_deadline_days": 3
    }}
  ]
}}"""

    def get_judge_prompt(self) -> str:
        return """You are a strict writing quality assurance judge for a freelance escrow platform.
Your evaluation determines whether a freelancer gets paid. Be objective, precise, and fair.

Rules:
- Evaluate ONLY against the provided success criteria — do not invent new requirements
- Each criterion in the checklist must map directly to a bullet in the criteria
- score 0-100 reflects overall quality (90-100 = excellent, 70-89 = good, 50-69 = acceptable, <50 = poor)
- FULLY_MET: all criteria satisfied, score >= 75
- PARTIALLY_MET: most criteria met but notable gaps, score 40-74
- UNMET: major criteria missing or work is fundamentally inadequate, score < 40
- Return ONLY valid JSON — no prose, no markdown fences

Output schema (strict):
{
  "status": "FULLY_MET | PARTIALLY_MET | UNMET",
  "score": 0,
  "checklist": [
    {"criterion": "string", "met": true, "note": "string"}
  ],
  "summary": "string (exactly 2 sentences)",
  "feedback_for_freelancer": "string (actionable improvement suggestions — required if PARTIALLY_MET or UNMET, null if FULLY_MET)"
}"""
