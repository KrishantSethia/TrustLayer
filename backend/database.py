"""
PostgreSQL compatibility layer — replaces Supabase Python client.

All existing service code uses:
    db.table("name").select("cols").eq("col", val).execute().data
    db.table("name").insert({...}).execute().data
    db.table("name").update({...}).eq(...).execute()
    db.table("name").delete().eq(...).execute()
    db.table("name").select("*").not_.in_("status", [...]).execute()
    db.rpc("fn_name", {"p_key": value}).execute().data

This module makes all of that work against a local psycopg2 connection.
"""

import re
import psycopg2
import psycopg2.extras
from typing import Any
from config import settings

# ─────────────────────────────────────────────────────────────────────────────
# Connection pool (simple global)
# ─────────────────────────────────────────────────────────────────────────────

_conn: psycopg2.extensions.connection | None = None


def _get_conn() -> psycopg2.extensions.connection:
    global _conn
    if _conn is None or _conn.closed:
        _conn = psycopg2.connect(settings.DATABASE_URL)
        _conn.autocommit = True
    return _conn


def _cursor():
    return _get_conn().cursor(cursor_factory=psycopg2.extras.RealDictCursor)


# ─────────────────────────────────────────────────────────────────────────────
# Result wrapper (mirrors Supabase APIResponse)
# ─────────────────────────────────────────────────────────────────────────────

class Result:
    def __init__(self, data=None, count: int | None = None):
        self.data = data
        self.count = count


# ─────────────────────────────────────────────────────────────────────────────
# FK join parser
# Parses "*, users!projects_employer_id_fkey(name, email)"
# into a list of join specs: {"ref": "users!...", "table": "users", "fk_col": "employer_id", "cols": ["name","email"]}
# ─────────────────────────────────────────────────────────────────────────────

_JOIN_PATTERN = re.compile(
    r'(\w+(?:!\w+)?)\(([^)]+)\)'  # table_or_ref(cols)
)

_FK_HINT_PATTERN = re.compile(
    r'(\w+)!(\w+)'  # table!fk_hint
)


def _parse_joins(select_str: str) -> tuple[list[str], list[dict]]:
    """
    Returns (base_cols, joins) where each join is:
        {"ref": original_ref_string, "table": table_name, "fk_col": fk_column_on_base_table, "cols": [col, ...]}
    """
    joins = []
    # Remove nested join specs and track them
    base = select_str

    for match in _JOIN_PATTERN.finditer(select_str):
        ref = match.group(1)          # e.g. "users!projects_employer_id_fkey" or "projects"
        cols_str = match.group(2)     # e.g. "name, email"
        cols = [c.strip() for c in cols_str.split(",")]

        fk_hint_match = _FK_HINT_PATTERN.match(ref)
        if fk_hint_match:
            table = fk_hint_match.group(1)
            hint = fk_hint_match.group(2)  # e.g. "projects_employer_id_fkey"
            # Extract FK column from hint: "projects_employer_id_fkey" → "employer_id"
            fk_col = _extract_fk_col_from_hint(hint)
        else:
            table = ref
            fk_col = None  # will infer as "{table}_id" or "user_id"

        joins.append({
            "ref": ref,
            "ref_full": match.group(0),  # entire "table!hint(cols)"
            "table": table,
            "fk_col": fk_col,
            "cols": cols,
        })
        base = base.replace(match.group(0), "").strip().strip(",").strip()

    base_cols = [c.strip() for c in base.split(",") if c.strip() and c.strip() != "*"]
    if not base_cols or "*" in select_str.split(",")[0]:
        base_cols = ["*"]

    return base_cols, joins


def _extract_fk_col_from_hint(hint: str) -> str | None:
    """
    "projects_employer_id_fkey" → "employer_id"
    "projects_freelancer_id_fkey" → "freelancer_id"
    Strips table-name prefix and "_fkey" suffix.
    """
    # Remove _fkey suffix
    if hint.endswith("_fkey"):
        hint = hint[:-5]

    # Try to find "_id" pattern — take everything from first occurrence of "_id" (exclusive of table prefix)
    # e.g. "projects_employer_id" — strip "projects_" prefix
    parts = hint.split("_")
    # Find the part containing "id" at end
    for i in range(len(parts)):
        if parts[i] == "id":
            # e.g. ["projects", "employer", "id"] → "employer_id"
            return "_".join(parts[i-1:i+1]) if i > 0 else "id"
    return None


# ─────────────────────────────────────────────────────────────────────────────
# NotFilter — handles .not_.in_(col, values)
# ─────────────────────────────────────────────────────────────────────────────

class NotFilter:
    def __init__(self, builder: "QueryBuilder"):
        self._builder = builder

    def in_(self, column: str, values: list) -> "QueryBuilder":
        if values:
            placeholders = ",".join(["%s"] * len(values))
            self._builder._where.append(
                (f'"{column}" NOT IN ({placeholders})', values)
            )
        return self._builder


# ─────────────────────────────────────────────────────────────────────────────
# QueryBuilder — the main Supabase-compatible query builder
# ─────────────────────────────────────────────────────────────────────────────

class QueryBuilder:
    def __init__(self, table: str):
        self._table = table
        self._select_cols: list[str] = ["*"]
        self._joins: list[dict] = []
        self._where: list[tuple[str, Any]] = []    # (sql_fragment, [params])
        self._order_col: str | None = None
        self._order_desc: bool = False
        self._limit_val: int | None = None
        self._range_offset: int = 0
        self._single: bool = False
        self._operation: str = "SELECT"   # SELECT | INSERT | UPDATE | DELETE
        self._insert_data: dict | None = None
        self._update_data: dict | None = None
        self._count_mode: bool = False
        self.not_ = NotFilter(self)

    # ── SELECT ────────────────────────────────────────────────────────────────

    def select(self, *cols, count: str | None = None) -> "QueryBuilder":
        col_str = ", ".join(cols) if cols else "*"
        self._select_cols, self._joins = _parse_joins(col_str)
        if count == "exact":
            self._count_mode = True
        return self

    # ── FILTERS ───────────────────────────────────────────────────────────────

    def eq(self, column: str, value: Any) -> "QueryBuilder":
        if value is None:
            self._where.append((f'"{column}" IS NULL', []))
        else:
            self._where.append((f'"{column}" = %s', [value]))
        return self

    def neq(self, column: str, value: Any) -> "QueryBuilder":
        if value is None:
            self._where.append((f'"{column}" IS NOT NULL', []))
        else:
            self._where.append((f'"{column}" != %s', [value]))
        return self

    def in_(self, column: str, values: list) -> "QueryBuilder":
        if values:
            placeholders = ",".join(["%s"] * len(values))
            self._where.append((f'"{column}" IN ({placeholders})', values))
        else:
            # IN () is invalid SQL — force no results
            self._where.append(("1=0", []))
        return self

    def gt(self, column: str, value: Any) -> "QueryBuilder":
        self._where.append((f'"{column}" > %s', [value]))
        return self

    def lt(self, column: str, value: Any) -> "QueryBuilder":
        self._where.append((f'"{column}" < %s', [value]))
        return self

    def gte(self, column: str, value: Any) -> "QueryBuilder":
        self._where.append((f'"{column}" >= %s', [value]))
        return self

    def lte(self, column: str, value: Any) -> "QueryBuilder":
        self._where.append((f'"{column}" <= %s', [value]))
        return self

    def is_(self, column: str, value: Any) -> "QueryBuilder":
        if value is None:
            self._where.append((f'"{column}" IS NULL', []))
        else:
            self._where.append((f'"{column}" IS NOT DISTINCT FROM %s', [value]))
        return self

    # ── ORDERING / PAGINATION ─────────────────────────────────────────────────

    def order(self, column: str, desc: bool = False) -> "QueryBuilder":
        self._order_col = column
        self._order_desc = desc
        return self

    def limit(self, n: int) -> "QueryBuilder":
        self._limit_val = n
        return self

    def range(self, start: int, end: int) -> "QueryBuilder":
        """Supabase range(from, to) is inclusive on both ends — maps to LIMIT/OFFSET."""
        self._limit_val = end - start + 1
        self._range_offset = start
        return self

    def single(self) -> "QueryBuilder":
        self._single = True
        return self

    # ── MUTATIONS ─────────────────────────────────────────────────────────────

    def insert(self, data: dict) -> "QueryBuilder":
        self._operation = "INSERT"
        self._insert_data = data
        return self

    def update(self, data: dict) -> "QueryBuilder":
        self._operation = "UPDATE"
        self._update_data = data
        return self

    def delete(self) -> "QueryBuilder":
        self._operation = "DELETE"
        return self

    def upsert(self, data: dict, on_conflict: str = "") -> "QueryBuilder":
        self._operation = "UPSERT"
        self._insert_data = data
        self._upsert_conflict = on_conflict
        return self

    # ── EXECUTE ───────────────────────────────────────────────────────────────

    def execute(self) -> Result:
        if self._operation == "SELECT":
            return self._exec_select()
        elif self._operation == "INSERT":
            return self._exec_insert()
        elif self._operation == "UPDATE":
            return self._exec_update()
        elif self._operation == "DELETE":
            return self._exec_delete()
        elif self._operation == "UPSERT":
            return self._exec_upsert()
        raise ValueError(f"Unknown operation: {self._operation}")

    def _build_where(self) -> tuple[str, list]:
        if not self._where:
            return "", []
        clauses = []
        params = []
        for fragment, frag_params in self._where:
            clauses.append(fragment)
            params.extend(frag_params)
        return "WHERE " + " AND ".join(clauses), params

    def _exec_select(self) -> Result:
        cur = _cursor()

        if self._count_mode:
            where_sql, params = self._build_where()
            sql = f'SELECT COUNT(*) as cnt FROM "{self._table}" {where_sql}'
            cur.execute(sql, params)
            row = cur.fetchone()
            return Result(data=[], count=row["cnt"] if row else 0)

        cols_sql = ", ".join(
            f'"{c}"' if c != "*" else "*" for c in self._select_cols
        )
        where_sql, params = self._build_where()
        order_sql = ""
        if self._order_col:
            direction = "DESC" if self._order_desc else "ASC"
            order_sql = f'ORDER BY "{self._order_col}" {direction}'
        limit_sql = f"LIMIT {self._limit_val}" if self._limit_val else ""
        offset_sql = f"OFFSET {self._range_offset}" if self._range_offset else ""

        sql = f'SELECT {cols_sql} FROM "{self._table}" {where_sql} {order_sql} {limit_sql} {offset_sql}'.strip()
        cur.execute(sql, params)
        rows = [dict(r) for r in cur.fetchall()]

        # Resolve FK joins
        for join_spec in self._joins:
            rows = self._resolve_join(rows, join_spec)

        if self._single:
            return Result(data=rows[0] if rows else None)
        return Result(data=rows)

    def _resolve_join(self, rows: list[dict], join_spec: dict) -> list[dict]:
        """
        For each row, fetch related row(s) from joined table and nest under ref key.
        """
        if not rows:
            return rows

        join_table = join_spec["table"]
        ref_key = join_spec["ref"]  # key in result dict (e.g. "users!projects_employer_id_fkey")
        fk_col = join_spec["fk_col"]  # column in base table that references join_table.id
        cols = join_spec["cols"]

        if fk_col is None:
            # Infer FK column: try common patterns in order
            # e.g. join_table="projects" → try "project_id" (singularized), then "projects_id", then "user_id"
            singular = join_table.rstrip("s")  # "projects" → "project", "users" → "user"
            candidates = [
                f"{singular}_id",       # project_id, user_id
                f"{join_table}_id",     # projects_id (rare)
                "user_id",
            ]
            fk_col = next((c for c in candidates if c in rows[0]), candidates[0])

        # Collect unique FK values
        fk_values = list({r[fk_col] for r in rows if r.get(fk_col) is not None})
        if not fk_values:
            for row in rows:
                row[ref_key] = None
            return rows

        # Fetch joined rows
        cols_sql = ", ".join(f'"{c}"' for c in cols) if "*" not in cols else "*"
        placeholders = ",".join(["%s"] * len(fk_values))
        sql = f'SELECT {cols_sql}, "id" FROM "{join_table}" WHERE "id" IN ({placeholders})'
        cur = _cursor()
        cur.execute(sql, fk_values)
        joined = {str(r["id"]): dict(r) for r in cur.fetchall()}

        for row in rows:
            fk_val = row.get(fk_col)
            row[ref_key] = joined.get(str(fk_val)) if fk_val else None

        return rows

    def _exec_insert(self) -> Result:
        data = self._insert_data or {}
        if not data:
            return Result(data=[])

        cols = list(data.keys())
        placeholders = ["%s"] * len(cols)
        col_sql = ", ".join(f'"{c}"' for c in cols)
        ph_sql = ", ".join(placeholders)
        values = [psycopg2.extras.Json(v) if isinstance(v, (dict, list)) else v for v in data.values()]

        sql = f'INSERT INTO "{self._table}" ({col_sql}) VALUES ({ph_sql}) RETURNING *'
        cur = _cursor()
        cur.execute(sql, values)
        row = cur.fetchone()
        return Result(data=[dict(row)] if row else [])

    def _exec_update(self) -> Result:
        data = self._update_data or {}
        if not data:
            return Result(data=[])

        sets = ", ".join(f'"{k}" = %s' for k in data.keys())
        values = [psycopg2.extras.Json(v) if isinstance(v, (dict, list)) else v for v in data.values()]
        where_sql, where_params = self._build_where()

        sql = f'UPDATE "{self._table}" SET {sets} {where_sql} RETURNING *'
        cur = _cursor()
        cur.execute(sql, values + where_params)
        rows = [dict(r) for r in cur.fetchall()]
        return Result(data=rows)

    def _exec_delete(self) -> Result:
        where_sql, params = self._build_where()
        sql = f'DELETE FROM "{self._table}" {where_sql} RETURNING *'
        cur = _cursor()
        cur.execute(sql, params)
        rows = [dict(r) for r in cur.fetchall()]
        return Result(data=rows)

    def _exec_upsert(self) -> Result:
        data = self._insert_data or {}
        if not data:
            return Result(data=[])
        cols = list(data.keys())
        col_sql = ", ".join(f'"{c}"' for c in cols)
        ph_sql = ", ".join(["%s"] * len(cols))
        values = list(data.values())

        conflict_target = getattr(self, "_upsert_conflict", "")
        if conflict_target:
            sets = ", ".join(f'"{k}" = EXCLUDED."{k}"' for k in cols)
            sql = (
                f'INSERT INTO "{self._table}" ({col_sql}) VALUES ({ph_sql}) '
                f'ON CONFLICT ({conflict_target}) DO UPDATE SET {sets} RETURNING *'
            )
        else:
            sql = f'INSERT INTO "{self._table}" ({col_sql}) VALUES ({ph_sql}) ON CONFLICT DO NOTHING RETURNING *'

        cur = _cursor()
        cur.execute(sql, values)
        row = cur.fetchone()
        return Result(data=[dict(row)] if row else [])


# ─────────────────────────────────────────────────────────────────────────────
# RPCBuilder — dispatches to Python banking functions
# ─────────────────────────────────────────────────────────────────────────────

class RPCBuilder:
    def __init__(self, fn_name: str, params: dict):
        self._fn = fn_name
        self._params = params

    def execute(self) -> Result:
        from payments import _rpc_dispatch
        result = _rpc_dispatch(self._fn, self._params)
        return Result(data=result)


# ─────────────────────────────────────────────────────────────────────────────
# PGClient — the top-level db object
# ─────────────────────────────────────────────────────────────────────────────

class PGClient:
    def table(self, name: str) -> QueryBuilder:
        return QueryBuilder(name)

    def rpc(self, fn_name: str, params: dict | None = None) -> RPCBuilder:
        return RPCBuilder(fn_name, params or {})


_client: PGClient | None = None


def get_db() -> PGClient:
    global _client
    if _client is None:
        _client = PGClient()
    return _client
