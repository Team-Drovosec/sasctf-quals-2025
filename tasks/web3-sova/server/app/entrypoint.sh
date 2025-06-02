#!/bin/bash
set -e

echo "Waiting for Anvil..."
until curl -s http://anvil:8545 > /dev/null; do
  sleep 1
done

echo "Deploying contract..."
node deploy.js

#--DEBUG--
# riscv64-unknown-elf-objdump -d -j .text hash_riscv64 > /mnt/artifacts/dissasm.txt
# cp contract-address.txt contract.sol reg_info.txt dissasm_gen.txt /mnt/artifacts/
# node call-validate.js

# ADDR=$(cat contract-address.txt)
# curl -X POST http://anvil:8545 \
#   -H "Content-Type: application/json" \
#   --data '{
#     "jsonrpc":"2.0",
#     "method":"eth_getCode",
#     "params": ["'"$ADDR"'", "latest"],
#     "id":1
# }'

# curl -X POST http://anvil:8545 \
#   -H "Content-Type: application/json" \
#   --data '{
#     "jsonrpc":"2.0",
#     "method":"eth_getStorageAt",
#     "params": ["'"$ADDR"'", "0x1", "latest" ],
#     "id":1
# }'

echo "Starting app..."
gunicorn --workers 4 --bind 0.0.0.0:5000 app:app
