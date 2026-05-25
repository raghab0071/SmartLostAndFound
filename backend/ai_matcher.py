"""AI matcher using heuristic scoring (no LLM dependency)."""

import re
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)


def _normalize(text: str) -> str:
    """
    Normalize text for safe comparison.

    Examples:
    - "ID Card" -> "idcard"
    - "ID_CARD" -> "idcard"
    - "Smart Watch" -> "smartwatch"
    """

    text = str(text or "").strip().lower()

    # Remove spaces and special characters
    text = re.sub(r"[^a-z0-9]", "", text)

    return text


def _heuristic_score(lost: Dict, found: Dict) -> int:
    """
    Calculate similarity score between lost and found items (0-100).

    IMPORTANT LOGIC:
    - Category MUST match first.
    - If category does NOT match, return 0 immediately.
    """

    # =========================
    # NORMALIZED CATEGORIES
    # =========================
    lost_category = _normalize(lost.get("category"))
    found_category = _normalize(found.get("category"))

    logger.info(
        f"Comparing categories -> "
        f"Lost: '{lost_category}' | "
        f"Found: '{found_category}'"
    )

    # ==========================================
    # STRICT TITLE MATCH REQUIRED
    # ==========================================
    lost_title = _normalize(lost.get("title"))
    found_title = _normalize(found.get("title"))

    # ==========================================
    # STRICT CATEGORY MATCH REQUIRED
    # ==========================================
    if not lost_category or not found_category:
        logger.info("Missing category -> skipping")
        return 0

    if lost_category != found_category:
        logger.info(
            f"Category mismatch -> "
            f"'{lost_category}' != '{found_category}'"
        )
        return 0

    logger.info("Category matched")

    # ==========================================
    # CATEGORY MATCH BASE SCORE
    # ==========================================
    score = 40

    # ==========================================
    # COLOR MATCH - 20 POINTS
    # ==========================================
    lost_color = _normalize(lost.get("color"))
    found_color = _normalize(found.get("color"))

    if lost_color and found_color:

        if _normalize(lost_category)==_normalize(found_category) and lost_color == found_color:
            score += 20

            logger.info(
                f"Color exact match -> "
                f"'{lost_color}' == '{found_color}'"
            )

        elif (
            lost_color in found_color
            or found_color in lost_color
        ):
            score += 10

            logger.info(
                f"Color partial match -> "
                f"'{lost_color}' <-> '{found_color}'"
            )

    # ==========================================
    # BRAND MATCH - 20 POINTS
    # ==========================================
    lost_brand = _normalize(lost.get("brand"))
    found_brand = _normalize(found.get("brand"))

    if lost_brand and found_brand:

        if lost_brand == found_brand:
            score += 20

            logger.info(
                f"Brand exact match -> "
                f"'{lost_brand}' == '{found_brand}'"
            )

        elif (
            lost_brand in found_brand
            or found_brand in lost_brand
        ):
            score += 10

            logger.info(
                f"Brand partial match -> "
                f"'{lost_brand}' <-> '{found_brand}'"
            )

    # ==========================================
    # TEXT / KEYWORD MATCH - 20 POINTS
    # ==========================================
    lost_text = " ".join([
        str(lost.get("title", "") or "").lower(),
        str(lost.get("description", "") or "").lower(),
        str(lost.get("last_seen_location", "") or "").lower(),
        str(lost.get("building", "") or "").lower(),
    ])

    found_text = " ".join([
        str(found.get("title", "") or "").lower(),
        str(found.get("description", "") or "").lower(),
        str(found.get("location_found", "") or "").lower(),
        str(found.get("building", "") or "").lower(),
    ])

    # Extract keywords with 4+ letters
    keywords = set(re.findall(r"[a-z]{4,}", lost_text))

    if keywords:

        overlap = sum(
            1 for keyword in keywords
            if keyword in found_text
        )

        keyword_score = int(
            (overlap / max(1, len(keywords))) * 20
        )

        score += keyword_score

        logger.info(
            f"Keyword overlap -> "
            f"{overlap}/{len(keywords)} "
            f"(+{keyword_score} points)"
        )

    # ==========================================
    # FINAL SCORE
    # ==========================================
    final_score = min(100, score)

    logger.info(
        f"Final score -> "
        f"'{lost.get('title')}' vs "
        f"'{found.get('title')}' = "
        f"{final_score}%"
    )

    return final_score


def _heuristic_fallback(
    lost: Dict,
    candidates: List[Dict]
) -> List[Dict]:
    """
    Main heuristic matching algorithm.
    """

    results = []

    logger.info(
        f"Starting heuristic matching for "
        f"'{lost.get('title')}' "
        f"against {len(candidates)} candidates"
    )

    # ==========================================
    # NORMALIZED LOST CATEGORY
    # ==========================================
    lost_category = _normalize(lost.get("category"))

    for candidate in candidates:

        found_category = _normalize(
            candidate.get("category")
        )

        # ==========================================
        # STRICT CATEGORY FILTER
        # ==========================================
        if lost_category != found_category:

            logger.info(
                f"Skipping '{candidate.get('title')}' "
                f"because category mismatch -> "
                f"'{lost_category}' != '{found_category}'"
            )

            continue

        # ==========================================
        # CALCULATE SCORE
        # ==========================================
        score = _heuristic_score(
            lost,
            candidate
        )

        # Ignore weak matches
        if score < 40:

            logger.info(
                f"Skipping '{candidate.get('title')}' "
                f"because score too low ({score}%)"
            )

            continue

        # ==========================================
        # ADD MATCH RESULT
        # ==========================================
        result = {
            "found_item_id": candidate.get("item_id"),
            "title": candidate.get("title"),
            "similarity": score,
            "reasoning": (
                "Category matched. "
                "Similarity calculated using "
                "color, brand, and keywords."
            ),
            "image": (
                candidate.get("images") or [None]
            )[0],
            "category": candidate.get("category"),
            "location_found": candidate.get("location_found"),
            "date_found": candidate.get("date_found"),
        }

        results.append(result)

        logger.info(
            f"Added match -> "
            f"'{result['title']}' "
            f"({score}%)"
        )

    # ==========================================
    # SORT BY HIGHEST SIMILARITY
    # ==========================================
    results.sort(
        key=lambda x: x["similarity"],
        reverse=True
    )

    logger.info(
        f"Matching completed -> "
        f"{len(results)} matches found"
    )

    return results


async def ai_match_lost_to_found(
    lost: Dict,
    candidates: List[Dict]
) -> List[Dict]:
    """
    Match a lost item against found item candidates.

    RULE:
    - Category MUST match.
    - If category does NOT match,
      item is completely ignored.
    """

    logger.info(
        f"AI matching started for "
        f"'{lost.get('title')}' "
        f"with {len(candidates)} candidates"
    )

    if not candidates:

        logger.info("No candidates available")

        return []

    matches = _heuristic_fallback(
        lost,
        candidates
    )

    logger.info(
        f"AI matching completed -> "
        f"{len(matches)} matches returned"
    )

    return matches