"""
Payment RPC dispatcher — maps rpc("fn_name", params) to Python banking functions.
"""


def _rpc_dispatch(fn_name: str, params: dict):
    """Called by database.py RPCBuilder.execute()"""
    from payments import banking_rpc
    fn = getattr(banking_rpc, f"_rpc_{fn_name}", None)
    if fn is None:
        raise ValueError(f"Unknown RPC function: {fn_name}")
    return fn(**params)
