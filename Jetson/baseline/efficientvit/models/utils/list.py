from typing import Any, Optional,List,Tuple,Union

__all__ = [
    "list_sum",
    "list_mean",
    "weighted_list_sum",
    "list_join",
    "val2list",
    "val2tuple"
]


def list_sum(x: List) -> Any:
    return x[0] if len(x) == 1 else x[0] + list_sum(x[1:])


def list_mean(x: List) -> Any:
    return list_sum(x) / len(x)


def weighted_list_sum(x: List, weights: List) -> Any:
    assert len(x) == len(weights)
    return x[0] * weights[0] if len(x) == 1 else x[0] * weights[0] + weighted_list_sum(x[1:], weights[1:])


def list_join(x: List, sep="\t", format_str="%s") -> str:
    return sep.join([format_str % val for val in x])


def val2list(x: Union[List, Tuple, Any], repeat_time=1) -> List:
    if isinstance(x, (List, Tuple)):
        return list(x)
    return [x for _ in range(repeat_time)]


def val2tuple(x: Union[List, Tuple, Any], min_len: int = 1, idx_repeat: int = -1) -> tuple:
    x = val2list(x)

    # repeat elements if necessary
    if len(x) > 0:
        x[idx_repeat:idx_repeat] = [x[idx_repeat] for _ in range(min_len - len(x))]

    return tuple(x)


# def squeeze_list(x: Optional[list]) -> list | Any:
#     if x is not None and len(x) == 1:
#         return x[0]
#     else:
#         return x
