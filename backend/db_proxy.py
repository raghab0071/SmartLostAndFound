import os
import logging
import asyncio
from datetime import datetime, date
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import httpx
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "lost_found_db")

_supabase_client: Optional[httpx.AsyncClient] = None
if SUPABASE_URL and SUPABASE_KEY:
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

_mongo_client = AsyncIOMotorClient(MONGO_URL) if MONGO_URL else None
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


class CollectionProxy:
    def __init__(self, name: str):
        self.name = name

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
                return data[0]
        except Exception:
            pass
        collection = await self._mongo_collection()
        result = await collection.find_one(query, projection or {})
        if result and "_id" in result:
            result.pop("_id", None)
        return result

    def find(self, query: Dict[str, Any], projection: Optional[Dict[str, int]] = None):
        return QueryProxy(self, query, projection)

    async def insert_one(self, document: Dict[str, Any]):
        try:
            result = await self._supabase_insert(document)
            asyncio.create_task(self._mirror_to_mongo(document))
            return result
        except Exception:
            collection = await self._mongo_collection()
            await collection.insert_one(_json_compatible(document))
            return document

    async def insert_many(self, documents: List[Dict[str, Any]]):
        try:
            result = await self._supabase_insert(documents)
            asyncio.create_task(self._mirror_many_to_mongo(documents))
            return result
        except Exception:
            collection = await self._mongo_collection()
            await collection.insert_many([_json_compatible(doc) for doc in documents])
            return documents

    async def update_one(self, query: Dict[str, Any], update_doc: Dict[str, Any]):
        try:
            return await self._supabase_update(query, update_doc, many=False)
        except Exception:
            collection = await self._mongo_collection()
            return await collection.update_one(query, {"$set": update_doc})

    async def update_many(self, query: Dict[str, Any], update_doc: Dict[str, Any]):
        try:
            return await self._supabase_update(query, update_doc, many=True)
        except Exception:
            collection = await self._mongo_collection()
            return await collection.update_many(query, {"$set": update_doc})

    async def delete_one(self, query: Dict[str, Any]):
        try:
            return await self._supabase_delete(query)
        except Exception:
            collection = await self._mongo_collection()
            return await collection.delete_one(query)

    async def delete_many(self, query: Dict[str, Any]):
        try:
            return await self._supabase_delete(query)
        except Exception:
            collection = await self._mongo_collection()
            return await collection.delete_many(query)

    async def count_documents(self, query: Dict[str, Any]) -> int:
        try:
            return await self._supabase_count(query)
        except Exception:
            collection = await self._mongo_collection()
            return await collection.count_documents(query)

    async def aggregate(self, pipeline: List[Dict[str, Any]]):
        return AggregateProxy(self, pipeline)

    async def command(self, command: str, *args, **kwargs):
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

    async def close(self):
        if _supabase_client:
            await _supabase_client.aclose()
        if _mongo_client:
            _mongo_client.close()


db = DualDatabase()
