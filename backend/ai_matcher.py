"""AI matcher using Emergent LLM key (OpenAI GPT-4o-mini)."""
import os
import json
import re
import logging
from typing import List, Dict
# from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)


def _strip_json(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*", "", text).strip()
        if text.endswith("```"):
            text = text[:-3].strip()
    return text


def _heuristic_score(lost: Dict, found: Dict) -> int:
    score = 0
    if lost.get("category", "").lower() == found.get("category", "").lower():
        score += 30
    if lost.get("color") and found.get("color") and lost["color"].lower() == found["color"].lower():
        score += 15
    if lost.get("brand") and found.get("brand") and lost["brand"].lower() == found["brand"].lower():
        score += 15
    lost_text = " ".join([str(lost.get(k, "") or "") for k in ["title", "description", "last_seen_location", "building"]]).lower()
    found_text = " ".join([str(found.get(k, "") or "") for k in ["title", "description", "location_found", "building"]]).lower()
    keywords = set(re.findall(r"[a-z]{4,}", lost_text))
    if keywords:
        overlap = sum(1 for k in keywords if k in found_text)
        score += min(40, int((overlap / max(1, len(keywords))) * 40))
    return min(100, score)


async def ai_match_lost_to_found(*args, **kwargs):
    return []

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        logger.warning("EMERGENT_LLM_KEY not set; using heuristic only")
        return _heuristic_fallback(lost, candidates)

    # Build the prompt
    lost_brief = {
        "title": lost.get("title"),
        "description": lost.get("description"),
        "category": lost.get("category"),
        "color": lost.get("color"),
        "brand": lost.get("brand"),
        "location": lost.get("last_seen_location"),
        "building": lost.get("building"),
        "date_lost": lost.get("date_lost"),
    }
    cand_brief = [
        {
            "item_id": c.get("item_id"),
            "title": c.get("title"),
            "description": c.get("description"),
            "category": c.get("category"),
            "color": c.get("color"),
            "brand": c.get("brand"),
            "location": c.get("location_found"),
            "building": c.get("building"),
            "date_found": c.get("date_found"),
        }
        for c in candidates[:30]
    ]

    system_msg = (
        "You are an expert assistant that matches lost items with found items on a campus.\n"
        "Given a single LOST item report and a list of FOUND items, rank the candidates by how likely\n"
        "each one is to be the same physical object. Consider: category, color, brand, descriptive\n"
        "keywords, location/building proximity, and date proximity.\n\n"
        "Return ONLY valid JSON of the form:\n"
        '{"matches": [{"item_id": "...", "similarity": 0-100, "reasoning": "short text"}]}\n'
        "Include only candidates with similarity >= 30. Sort by similarity desc. Be concise (<=160 chars per reasoning)."
    )
    user_text = (
        "LOST_ITEM:\n" + json.dumps(lost_brief, ensure_ascii=False) +
        "\n\nFOUND_CANDIDATES:\n" + json.dumps(cand_brief, ensure_ascii=False)
    )

    try:
        session_id = f"match-{lost.get('item_id', 'session')}"
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_msg,
        ).with_model("openai", "gpt-4o-mini")
        response = await chat.send_message(UserMessage(text=user_text))
        cleaned = _strip_json(str(response))
        data = json.loads(cleaned)
        matches = data.get("matches", [])
        # Build full match entries
        cmap = {c["item_id"]: c for c in candidates}
        results = []
        for m in matches:
            iid = m.get("item_id")
            if iid not in cmap:
                continue
            c = cmap[iid]
            results.append({
                "found_item_id": iid,
                "title": c.get("title"),
                "similarity": int(m.get("similarity", 0)),
                "reasoning": str(m.get("reasoning", ""))[:240],
                "image": (c.get("images") or [None])[0],
                "category": c.get("category"),
                "location_found": c.get("location_found"),
                "date_found": c.get("date_found"),
            })
        # Sort and filter
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results
    except Exception as e:
        logger.exception("AI matcher failed, using heuristic fallback: %s", e)
        return _heuristic_fallback(lost, candidates)


def _heuristic_fallback(lost: Dict, candidates: List[Dict]) -> List[Dict]:
    results = []
    for c in candidates:
        score = _heuristic_score(lost, c)
        if score < 25:
            continue
        results.append({
            "found_item_id": c.get("item_id"),
            "title": c.get("title"),
            "similarity": score,
            "reasoning": "Heuristic match based on category, color, brand, and keyword overlap.",
            "image": (c.get("images") or [None])[0],
            "category": c.get("category"),
            "location_found": c.get("location_found"),
            "date_found": c.get("date_found"),
        })
    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results
