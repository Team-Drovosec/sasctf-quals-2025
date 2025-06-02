from tonsdk.utils import Address


def to_human_readable_address(address: str) -> str:
    try:
        return Address(address).to_string(is_user_friendly=True)
    except Exception as e:
        return address
