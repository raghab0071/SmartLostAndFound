"""AI matcher using heuristic scoring (no LLM dependency)."""
import os
import json
import re
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)


def _heuristic_score(lost: Dict, found: Dict) -> int:
    """Calculate similarity score between lost and found items (0-100)."""
    score = 0
    
    # Category match (most important) - 40 points
    if lost.get("category", "").lower() == found.get("category", "").lower():
        score += 40
        logger.debug(f"Category match: {lost.get('category')} == {found.get('category')}")
    
    # Color match - 20 points
    if lost.get("color") and found.get("color"):
        if lost["color"].lower() == found["color"].lower():
            score += 20
            logger.debug(f"Color exact match: {lost.get('color')} == {found.get('color')}")
        elif lost["color"].lower() in found["color"].lower() or found["color"].lower() in lost["color"].lower():
            score += 10
            logger.debug(f"Color partial match: {lost.get('color')} in {found.get('color')}")
    
    # Brand match - 20 points
    if lost.get("brand") and found.get("brand"):
        if lost["brand"].lower() == found["brand"].lower():
            score += 20
            logger.debug(f"Brand exact match: {lost.get('brand')} == {found.get('brand')}")
        elif lost["brand"].lower() in found["brand"].lower() or found["brand"].lower() in lost["brand"].lower():
            score += 10
            logger.debug(f"Brand partial match: {lost.get('brand')} in {found.get('brand')}")
    
    # Text similarity (title + description + location) - 20 points
    lost_text = " ".join([str(lost.get(k, "") or "") for k in ["title", "description", "last_seen_location", "building"]]).lower()
    found_text = " ".join([str(found.get(k, "") or "") for k in ["title", "description", "location_found", "building"]]).lower()
    
    # Extract keywords (4+ chars)
    keywords = set(re.findall(r"[a-z]{4,}", lost_text))
    if keywords:
        overlap = sum(1 for k in keywords if k in found_text)
        keyword_score = int((overlap / max(1, len(keywords))) * 20)
        score += keyword_score
        logger.debug(f"Keywords: {keywords}, overlap: {overlap}, score: {keyword_score}")
    
    final_score = min(100, score)
    logger.debug(f"Final score for '{lost.get('title')}' vs '{found.get('title')}': {final_score}")
    return final_score


def _heuristic_fallback(lost: Dict, candidates: List[Dict]) -> List[Dict]:
    """Heuristic matching - main matching algorithm."""
    results = []
    logger.info(f"Starting heuristic matching for lost item '{lost.get('title')}' against {len(candidates)} found items")
    
    for c in candidates:
        score = _heuristic_score(lost, c)
        # Show all matches with score >= 20 (lowered threshold)
        if score < 20:
            continue
        
        result = {
            "found_item_id": c.get("item_id"),
            "title": c.get("title"),
            "similarity": score,
            "reasoning": f"Match based on category, color, brand, and keywords",
            "image": (c.get("images") or [None])[0],
            "category": c.get("category"),
            "location_found": c.get("location_found"),
            "date_found": c.get("date_found"),
        }
        results.append(result)
        logger.debug(f"Added match: {result['title']} with {score}% similarity")
    
    results.sort(key=lambda x: x["similarity"], reverse=True)
    logger.info(f"Heuristic matching found {len(results)} matches for lost item '{lost.get('title')}'")
    return results


async def ai_match_lost_to_found(lost: Dict, candidates: List[Dict]) -> List[Dict]:
    """Match a lost item against found item candidates using heuristic scoring.
    Returns list of matches sorted by similarity (0-100).
    
    This function uses pure heuristic matching - no LLM API calls.
    """
    logger.info(f"AI matching started for lost item '{lost.get('title')}' with {len(candidates)} candidates")
    
    if not candidates:
        logger.info("No candidates to match against")
        return []
    
    # Use heuristic matching directly (no LLM)
    matches = _heuristic_fallback(lost, candidates)
    logger.info(f"AI matching completed: found {len(matches)} matches")
    return matches


