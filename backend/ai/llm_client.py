import json
import httpx
from config import settings


class LLMError(Exception):
    pass


class LLMParseError(Exception):
    pass


async def chat_completion(system_prompt: str, user_message: str) -> str:
    """Calls OpenRouter. Returns raw assistant message content."""
    async with httpx.AsyncClient(timeout=90) as client:
        try:
            response = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://trustlayer.demo",
                    "X-Title": "TrustLayer",
                },
                json={
                    "model": settings.OPENROUTER_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user",   "content": user_message},
                    ],
                    "temperature": 0.2,
                },
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            raise LLMError(f"OpenRouter HTTP {e.response.status_code}: {e.response.text}")
        except Exception as e:
            raise LLMError(f"LLM call failed: {str(e)}")


async def chat_completion_json(system_prompt: str, user_message: str) -> dict:
    """Calls LLM and parses JSON response."""
    raw = await chat_completion(system_prompt, user_message)

    # Strip markdown fences if present
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        print(f"[LLM RAW RESPONSE - PARSE FAILED]:\n{raw}")
        raise LLMParseError(f"AI returned non-JSON response: {raw[:200]}")
