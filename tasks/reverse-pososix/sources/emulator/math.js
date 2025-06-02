export function rv_val_size_sign_bit( val_size ) {
    if ( val_size == 1 ) {
        return 0x80;
    }
    else if ( val_size == 2 ) {
        return 0x8000;
    }
    else {
        return 0x80000000;
    }
}

export function rv_val_size_mask( val_size ) {
    if ( val_size == 4 ) {
        return 0xffffffff;
    }
    else if ( val_size == 2 ) {
        return 0x0000ffff;
    }
    else {
        return 0x000000ff;
    }
}

export function rv_unsigned_lt( x, y ) {
    return ((x >>> 0) < (y >>> 0));
}

export function rv_unsigned_ge( x, y ) {
    return !rv_unsigned_lt( x, y );
}

export function rv_unsigned_add( x, y ) {
    return ((x >>> 0) + (y >>> 0)) >>> 0;
}

export function rv_unsigned_sub( x, y ) {
    return ((x >>> 0) - (y >>> 0)) >>> 0;
}

export function rv_unsigned_mul( x, y ) {
    return ((x >>> 0) * (y >>> 0)) >>> 0;
}

export function rv_signed_mulh( x, y ) {
    return Number((BigInt(x | 0) * BigInt(y | 0)) >> BigInt(32));
}

export function rv_unsigned_mulh( x, y ) {
    return Number((BigInt(x >>> 0) * BigInt(y >>> 0)) >> BigInt(32));
}

export function rv_unsigned_div( x, y ) {
    if ( x == y )
        return 1;

    let val = x / y;
    if ( ( !!( x & 0x80000000 ) ) != ( !!( y & 0x80000000 ) ) )
    {
        val = val ^ 0x80000000;
    }
    return val >>> 0;
}

export function rv_unsigned_mod( x, y ) {
    return ((x >>> 0) % (y >>> 0)) | 0;
}

export function rv_sign_extend( x, val_size )
{
    if ( x & rv_val_size_sign_bit( val_size ) )
    {
        x = x | ~( rv_val_size_mask( val_size ) );
    }

    return x;
}