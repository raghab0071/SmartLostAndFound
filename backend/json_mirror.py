"""Auto-mirror MongoDB collections to JSON files for college-project visibility.

Every important write (insert/update/delete) triggers a dump of the collection
to /app/data/<collection>.json. Files are pretty-printed and ObjectId/datetime
serialized so they can be diffed in git or inspected manually.
"""
import os
import json
import logging
from datetime import datetime, date
from pathlib import Path
from typing import Iterable

logger = logging.getLogger(__name__)

MIRROR_DIR = Path(os.environ.get("JSON_MIRROR_DIR", "./data"))
MIRROR_DIR.mkdir(parents=True, exist_ok=True)

# Collections to mirror. Exclude session tokens & matches for noise/privacy.
MIRRORED = ["users", "found_items", "lost_items", "claims", "centres", "notifications"]


def _default(o):
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    try:
        return str(o)
    except Exception:
        return None


def _sanitize(doc: dict) -> dict:
    if doc is None:
        return None
    out = {}
    for k, v in doc.items():
        if k == "_id":
            continue
        if k == "password_hash":
            out[k] = "***"  # redact
            continue
        out[k] = v
    return out


async def dump_collection(db, name: str):
    if name not in MIRRORED:
        return
    try:
        collection = getattr(db, name, None)
        if collection is None:
            raise AttributeError(f"Database collection not found: {name}")
        cursor = collection.find({}, {"_id": 0}).sort("created_at", -1)
        docs = await cursor.to_list(length=10_000)
        docs = [_sanitize(d) for d in docs]
        path = MIRROR_DIR / f"{name}.json"
        tmp = path.with_suffix(".json.tmp")
        with open(tmp, "w") as f:
            json.dump(docs, f, indent=2, default=_default)
        tmp.replace(path)
    except Exception as e:
        logger.warning(f"JSON mirror failed for {name}: {e}")


async def dump_many(db, names: Iterable[str]):
    for n in names:
        await dump_collection(db, n)


async def dump_all(db):
    await dump_many(db, MIRRORED)
