import os
import logging
import asyncio
import re
import json
from datetime import datetime, date
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import httpx
from dotenv import load_dotenv
try:
    from motor.motor_asyncio import AsyncIOMotorClient
except ImportError:
    AsyncIOMotorClient = None

load_dotenv(Path(__file__).parent / ".env")

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "lost_found_db")
JSON_DB_DIR = Path(os.getenv("JSON_DB_DIR", os.getenv("JSON_MIRROR_DIR", Path(__file__).parent / "data")))
JSON_DB_DIR.mkdir(parents=True, exist_ok=True)
JSON_PRIMARY = not MONGO_URL

_supabase_client: Optional[httpx.AsyncClient] = None
if SUPABASE_URL and SUPABASE_KEY and not JSON_PRIMARY:
    _supabase_client = httpx.AsyncClient(
        base_url=SUPABASE_URL.rstrip("/") + "/rest/v1",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        timeout=15.0,
    )

_mongo_client = AsyncIOMotorClient(MONGO_URL) if MONGO_URL and AsyncIOMotorClient else None
_mongo_db = _mongo_client[DB_NAME] if _mongo_client is not None else None


def _serialize_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _serialize_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_serialize_value(v) for v in value]
    return value


def _to_supabase_value(value: Any) -> str:
    if value is None:
        return "is.null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    return str(value)


def _build_filter_params(query: Dict[str, Any]) -> List[Tuple[str, str]]:
    params: List[Tuple[str, str]] = []
    if not query:
        return params

    if "$and" in query:
        raise ValueError("$and is not supported in simple proxy, fall back to Mongo")
    if "$or" in query:
        raise ValueError("$or is not supported reliably in proxy, fall back to Mongo")

    or_filters: List[str] = []
    for key, value in query.items():
        if key == "$or" and isinstance(value, list):
            for cond in value:
                if isinstance(cond, dict) and len(cond) == 1:
                    field, expr = next(iter(cond.items()))
                    if isinstance(expr, dict) and "$regex" in expr:
                        pattern = expr["$regex"]
                        options = expr.get("$options", "")
                        exact = pattern.strip("^").strip("$")
                        if pattern.startswith("^") and pattern.endswith("$"):
                            op = "ilike" if "i" in options else "eq"
                            or_filters.append(f"{field}.{op}.{exact}")
                        else:
                            op = "ilike" if "i" in options else "like"
                            term = exact.strip(".*")
                            or_filters.append(f"{field}.{op}.*{term}*")
                    elif isinstance(expr, dict):
                        raise ValueError("Complex nested expression in $or not supported, fallback to Mongo")
                    elif isinstance(expr, str):
                        or_filters.append(f"{field}.eq.{_to_supabase_value(expr)}")
            continue

        if isinstance(value, dict):
            if "$in" in value and isinstance(value["$in"], list):
                members = ",".join([_to_supabase_value(v) for v in value["$in"]])
                params.append((key, f"in.({members})"))
            elif "$gte" in value and "$lte" in value:
                params.append((key, f"gte.{_to_supabase_value(value['$gte'])}"))
                params.append((key, f"lte.{_to_supabase_value(value['$lte'])}"))
            elif "$gte" in value:
                params.append((key, f"gte.{_to_supabase_value(value['$gte'])}"))
            elif "$lte" in value:
                params.append((key, f"lte.{_to_supabase_value(value['$lte'])}"))
            elif "$regex" in value:
                pattern = value["$regex"]
                options = value.get("$options", "")
                exact = pattern.strip("^").strip("$")
                if pattern.startswith("^") and pattern.endswith("$"):
                    op = "ilike" if "i" in options else "eq"
                    params.append((key, f"{op}.{_to_supabase_value(exact)}"))
                else:
                    op = "ilike" if "i" in options else "like"
                    term = exact.strip(".*")
                    params.append((key, f"{op}.*{_to_supabase_value(term)}*"))
            else:
                raise ValueError("Unsupported supabase query expression")
        else:
            params.append((key, f"eq.{_to_supabase_value(value)}"))

    if or_filters:
        params.append(("or", "(" + ",".join(or_filters) + ")"))
    return params


def _build_sort_param(sort: Sequence[tuple]) -> Optional[str]:
    if not sort:
        return None
    parts = []
    for key, direction in sort:
        direction_str = "asc" if direction >= 0 else "desc"
        parts.append(f"{key}.{direction_str}")
    return ",".join(parts)


def _json_compatible(document: Any) -> Any:
    if isinstance(document, dict):
        return {k: _json_compatible(v) for k, v in document.items() if k != "_id"}
    if isinstance(document, list):
        return [_json_compatible(v) for v in document]
    return _serialize_value(document)


def _without_id(document: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if document is None:
        return None
    return {k: v for k, v in document.items() if k != "_id"}


def _prepare_update_docs(update_doc: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Dict[str, Any]]:
    """Return (supabase_patch, mongo_update) for Mongo-style or plain updates."""
    if any(key.startswith("$") for key in update_doc):
        mongo_update = update_doc
        unsupported_ops = [key for key in update_doc if key != "$set"]
        if unsupported_ops:
            return None, mongo_update
        set_doc = update_doc.get("$set")
        if not isinstance(set_doc, dict):
            raise ValueError("$set update must be a document")
        return set_doc, mongo_update
    return update_doc, {"$set": update_doc}


def _project_document(document: Dict[str, Any], projection: Optional[Dict[str, int]]) -> Dict[str, Any]:
    doc = _without_id(document) or {}
    if not projection:
        return doc
    excluded = {key for key, value in projection.items() if value == 0}
    included = {key for key, value in projection.items() if value == 1}
    if included:
        return {key: value for key, value in doc.items() if key in included}
    return {key: value for key, value in doc.items() if key not in excluded}


def _coerce_compare(value: Any) -> Any:
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return value
    return value


def _matches_expression(value: Any, expression: Dict[str, Any]) -> bool:
    for op, expected in expression.items():
        if op == "$regex":
            flags = re.IGNORECASE if "i" in expression.get("$options", "") else 0
            if re.search(str(expected), str(value or ""), flags) is None:
                return False
        elif op == "$options":
            continue
        elif op == "$in":
            if value not in expected:
                return False
        elif op == "$gt":
            if not (_coerce_compare(value) > _coerce_compare(expected)):
                return False
        elif op == "$gte":
            if not (_coerce_compare(value) >= _coerce_compare(expected)):
                return False
        elif op == "$lt":
            if not (_coerce_compare(value) < _coerce_compare(expected)):
                return False
        elif op == "$lte":
            if not (_coerce_compare(value) <= _coerce_compare(expected)):
                return False
        else:
            return False
    return True


def _matches_query(document: Dict[str, Any], query: Dict[str, Any]) -> bool:
    for key, expected in (query or {}).items():
        if key == "$or":
            if not any(_matches_query(document, condition) for condition in expected):
                return False
            continue
        if key == "$and":
            if not all(_matches_query(document, condition) for condition in expected):
                return False
            continue
        value = document.get(key)
        if isinstance(expected, dict):
            if not _matches_expression(value, expected):
                return False
        elif value != expected:
            return False
    return True


def _apply_mongo_update(document: Dict[str, Any], update_doc: Dict[str, Any]) -> Dict[str, Any]:
    updated = dict(document)
    for key, value in update_doc.get("$set", {}).items():
        updated[key] = _json_compatible(value)
    for key, value in update_doc.get("$inc", {}).items():
        updated[key] = updated.get(key, 0) + value
    for key, value in update_doc.get("$addToSet", {}).items():
        current = updated.get(key)
        if not isinstance(current, list):
            current = []
        if value not in current:
            current.append(value)
        updated[key] = current
    return updated


class JsonWriteResult:
    def __init__(self, modified_count: int = 0, deleted_count: int = 0):
        self.modified_count = modified_count
        self.deleted_count = deleted_count


class CollectionProxy:
    def __init__(self, name: str):
        self.name = name

    def _json_path(self) -> Path:
        return JSON_DB_DIR / f"{self.name}.json"

    def _json_read_all(self) -> List[Dict[str, Any]]:
        path = self._json_path()
        if not path.exists():
            return []
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data if isinstance(data, list) else []
        except Exception as exc:
            logger.warning("Failed to read JSON collection %s: %s", self.name, exc)
            return []

    def _json_write_all(self, documents: List[Dict[str, Any]]):
        path = self._json_path()
        tmp = path.with_suffix(".json.tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump([_json_compatible(_without_id(doc)) for doc in documents], f, indent=2)
        tmp.replace(path)

    async def _supabase_request(self, method: str, params: Optional[Sequence[Tuple[str, str]]] = None, json: Any = None, headers: Optional[Dict[str, str]] = None):
        if not _supabase_client:
            raise RuntimeError("Supabase client is not configured")
        try:
            request_params = httpx.QueryParams(params or [])
            response = await _supabase_client.request(method, f"/{self.name}", params=request_params, json=json, headers=headers)
            response.raise_for_status()
            if response.headers.get("Content-Type", "").startswith("application/json"):
                return response.json(), response.headers
            return None, response.headers
        except Exception as exc:
            logger.warning("Supabase request failed for %s %s: %s", method, self.name, exc)
            raise

    async def _supabase_select(self, query: Dict[str, Any], sort: Sequence[tuple] = (), limit: Optional[int] = None):
        params: List[Tuple[str, str]] = [("select", "*")]
        params.extend(_build_filter_params(query))
        order = _build_sort_param(sort)
        if order:
            params.append(("order", order))
        if limit is not None:
            params.append(("limit", str(limit)))
        data, _ = await self._supabase_request("GET", params=params)
        return data or []

    async def _supabase_insert(self, document: Dict[str, Any]):
        doc = _json_compatible(document)
        if isinstance(doc, dict):
            doc = [doc]
        data, _ = await self._supabase_request("POST", json=doc)
        return data[0] if isinstance(data, list) and data else data

    async def _supabase_update(self, query: Dict[str, Any], update_doc: Dict[str, Any], many: bool = False):
        params = _build_filter_params(query)
        data, _ = await self._supabase_request("PATCH", params=params, json=_json_compatible(update_doc))
        return data

    async def _supabase_delete(self, query: Dict[str, Any]):
        params = _build_filter_params(query)
        await self._supabase_request("DELETE", params=params)

    async def _supabase_count(self, query: Dict[str, Any]):
        params: List[Tuple[str, str]] = [("select", "*")]
        params.extend(_build_filter_params(query))
        headers = {"Prefer": "count=exact"}
        _, response_headers = await self._supabase_request("GET", params=params, headers=headers)
        count_header = response_headers.get("content-range") or response_headers.get("Content-Range")
        if count_header and "/" in count_header:
            return int(count_header.split("/")[-1])
        return 0

    async def _mongo_collection(self):
        if _mongo_db is None:
            raise RuntimeError("MongoDB is not configured")
        return _mongo_db[self.name]

    async def _json_select(self, query: Dict[str, Any], projection: Optional[Dict[str, int]] = None, sort: Sequence[tuple] = (), limit: Optional[int] = None):
        docs = [_project_document(doc, projection) for doc in self._json_read_all() if _matches_query(doc, query)]
        for key, direction in reversed(sort or []):
            docs.sort(key=lambda doc: _coerce_compare(doc.get(key)) if doc.get(key) is not None else "", reverse=direction < 0)
        if limit is not None:
            docs = docs[:limit]
        return docs

    async def _mirror_to_mongo(self, document: Dict[str, Any]):
        try:
            collection = await self._mongo_collection()
            await collection.insert_one(_json_compatible(document))
        except Exception as exc:
            logger.warning("Failed to mirror to mongo: %s", exc)

    async def _mirror_many_to_mongo(self, documents: List[Dict[str, Any]]):
        try:
            collection = await self._mongo_collection()
            await collection.insert_many([_json_compatible(doc) for doc in documents])
        except Exception as exc:
            logger.warning("Failed to mirror many to mongo: %s", exc)

    async def find_one(self, query: Dict[str, Any], projection: Optional[Dict[str, int]] = None):
        try:
            data = await self._supabase_select(query, sort=(), limit=1)
            if data:
                return _project_document(data[0], projection)
        except Exception:
            pass
        if _mongo_db is not None:
            collection = await self._mongo_collection()
            result = await collection.find_one(query, projection or {})
            return _without_id(result)
        data = await self._json_select(query, projection=projection, limit=1)
        return data[0] if data else None

    def find(self, query: Dict[str, Any], projection: Optional[Dict[str, int]] = None):
        return QueryProxy(self, query, projection)

    async def insert_one(self, document: Dict[str, Any]):
        try:
            result = await self._supabase_insert(document)
            asyncio.create_task(self._mirror_to_mongo(document))
            return result
        except Exception:
            if _mongo_db is None:
                docs = self._json_read_all()
                docs.append(_json_compatible(_without_id(document)))
                self._json_write_all(docs)
                return document
            collection = await self._mongo_collection()
            await collection.insert_one(_json_compatible(document))
            return document

    async def insert_many(self, documents: List[Dict[str, Any]]):
        try:
            result = await self._supabase_insert(documents)
            asyncio.create_task(self._mirror_many_to_mongo(documents))
            return result
        except Exception:
            if _mongo_db is None:
                docs = self._json_read_all()
                docs.extend([_json_compatible(_without_id(doc)) for doc in documents])
                self._json_write_all(docs)
                return documents
            collection = await self._mongo_collection()
            await collection.insert_many([_json_compatible(doc) for doc in documents])
            return documents

    async def update_one(self, query: Dict[str, Any], update_doc: Dict[str, Any]):
        supabase_patch, mongo_update = _prepare_update_docs(update_doc)
        try:
            if supabase_patch is None:
                raise ValueError("Update operator requires Mongo fallback")
            return await self._supabase_update(query, supabase_patch, many=False)
        except Exception:
            if _mongo_db is None:
                docs = self._json_read_all()
                modified = 0
                for index, doc in enumerate(docs):
                    if _matches_query(doc, query):
                        docs[index] = _apply_mongo_update(doc, mongo_update)
                        modified = 1
                        break
                if modified:
                    self._json_write_all(docs)
                return JsonWriteResult(modified_count=modified)
            collection = await self._mongo_collection()
            return await collection.update_one(query, mongo_update)

    async def update_many(self, query: Dict[str, Any], update_doc: Dict[str, Any]):
        supabase_patch, mongo_update = _prepare_update_docs(update_doc)
        try:
            if supabase_patch is None:
                raise ValueError("Update operator requires Mongo fallback")
            return await self._supabase_update(query, supabase_patch, many=True)
        except Exception:
            if _mongo_db is None:
                docs = self._json_read_all()
                modified = 0
                for index, doc in enumerate(docs):
                    if _matches_query(doc, query):
                        docs[index] = _apply_mongo_update(doc, mongo_update)
                        modified += 1
                if modified:
                    self._json_write_all(docs)
                return JsonWriteResult(modified_count=modified)
            collection = await self._mongo_collection()
            return await collection.update_many(query, mongo_update)

    async def delete_one(self, query: Dict[str, Any]):
        try:
            return await self._supabase_delete(query)
        except Exception:
            if _mongo_db is None:
                docs = self._json_read_all()
                kept = []
                deleted = 0
                for doc in docs:
                    if deleted == 0 and _matches_query(doc, query):
                        deleted = 1
                        continue
                    kept.append(doc)
                if deleted:
                    self._json_write_all(kept)
                return JsonWriteResult(deleted_count=deleted)
            collection = await self._mongo_collection()
            return await collection.delete_one(query)

    async def delete_many(self, query: Dict[str, Any]):
        try:
            return await self._supabase_delete(query)
        except Exception:
            if _mongo_db is None:
                docs = self._json_read_all()
                kept = [doc for doc in docs if not _matches_query(doc, query)]
                deleted = len(docs) - len(kept)
                if deleted:
                    self._json_write_all(kept)
                return JsonWriteResult(deleted_count=deleted)
            collection = await self._mongo_collection()
            return await collection.delete_many(query)

    async def count_documents(self, query: Dict[str, Any]) -> int:
        try:
            return await self._supabase_count(query)
        except Exception:
            if _mongo_db is None:
                return len([doc for doc in self._json_read_all() if _matches_query(doc, query)])
            collection = await self._mongo_collection()
            return await collection.count_documents(query)

    async def aggregate(self, pipeline: List[Dict[str, Any]]):
        return AggregateProxy(self, pipeline)

    async def command(self, command: str, *args, **kwargs):
        if _mongo_db is None:
            if command == "ping":
                return {"ok": 1}
            raise RuntimeError("MongoDB is not configured")
        collection = await self._mongo_collection()
        return await collection.database.command(command, *args, **kwargs)


class AggregateProxy:
    def __init__(self, collection: CollectionProxy, pipeline: List[Dict[str, Any]]):
        self.collection = collection
        self.pipeline = pipeline

    async def to_list(self, length: int = 1000):
        collection = await self.collection._mongo_collection()
        return await collection.aggregate(self.pipeline).to_list(length=length)


class QueryProxy:
    def __init__(self, collection: CollectionProxy, query: Dict[str, Any], projection: Optional[Dict[str, int]]):
        self.collection = collection
        self.query = query or {}
        self.projection = projection or {}
        self._sort: List[tuple] = []
        self._limit: Optional[int] = None

    def sort(self, key: str, direction: int):
        self._sort.append((key, direction))
        return self

    def limit(self, value: int):
        self._limit = value
        return self

    async def to_list(self, length: int = 100):
        if _supabase_client:
            try:
                return await self.collection._supabase_select(self.query, sort=self._sort, limit=self._limit or length)
            except Exception:
                pass
        if _mongo_db is None:
            return await self.collection._json_select(self.query, projection=self.projection, sort=self._sort, limit=self._limit or length)
        collection = await self.collection._mongo_collection()
        cursor = collection.find(self.query, self.projection)
        if self._sort:
            cursor = cursor.sort(self._sort)
        if self._limit is not None:
            cursor = cursor.limit(self._limit)
        return await cursor.to_list(length=self._limit or length)


class DualDatabase:
    def __getattr__(self, attr: str) -> CollectionProxy:
        return CollectionProxy(attr)

    async def command(self, command: str, *args, **kwargs):
        if _mongo_db is None:
            if command == "ping":
                return {"ok": 1}
            raise RuntimeError("MongoDB is not configured")
        return await _mongo_db.command(command, *args, **kwargs)

    async def close(self):
        if _supabase_client:
            await _supabase_client.aclose()
        if _mongo_client:
            _mongo_client.close()


db = DualDatabase()
