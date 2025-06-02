#!/bin/bash

set -e

POW_HARDNESS=24
CHALLENGE=$(head -c 16 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 16)
ZEROES=$(printf '%0.s0' $(seq 1 "$POW_HARDNESS"))

echo "=== Proof Of Work ==="
echo "Please find a data X such that sha256(${CHALLENGE}.X) starts with $POW_HARDNESS zero bits"
echo -n "Your solution (hex encoded): "
read -r SOLUTION_HEX

# Basic sanity check
if ! [[ "$SOLUTION_HEX" =~ ^([0-9a-fA-F]{2})+$ ]]; then
    echo "❌ Could not hex decode"
    exit 1
fi

# Decode to binary safely
SOLUTION_BIN=$(mktemp)
echo "$SOLUTION_HEX" | xxd -r -p > "$SOLUTION_BIN"

# Prepare full input: challenge + binary suffix
INPUT_BIN=$(mktemp)
echo -n "$CHALLENGE" > "$INPUT_BIN"
cat "$SOLUTION_BIN" >> "$INPUT_BIN"

# Compute SHA256
HASH_HEX=$(sha256sum "$INPUT_BIN" | awk '{print $1}')

# Convert to binary (bitstring)
HASH_BIN=$(echo "$HASH_HEX" | xxd -r -p | xxd -b -c 32 | cut -d' ' -f2- | tr -d ' \n')

# Check prefix
if [[ "$HASH_BIN" == "$ZEROES"* ]]; then
    echo "✅ Correct proof-of-work!"
    exit 0
else
    echo "❌ Invalid proof-of-work."
    exit 1
fi