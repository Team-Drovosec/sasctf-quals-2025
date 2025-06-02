#!/bin/bash

echo "Registering admin user..."
RESPONSE=$(curl -s -X POST "http://localhost:8000/auth" -H "accept: application/json" -H "Content-Type: multipart/form-data" -F "file=@admin/admin.jpg")
TOKEN=$(echo $RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
USER_ID=$(echo $RESPONSE | grep -o '"user_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "Failed to get authentication token"
    exit 1
fi

echo "Successfully registered admin user"

echo "Creating public notes..."
RESPONSE=$(curl -s -X POST \
  "http://localhost:8000/notes" \
  -H "accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"You've been voided.\", \"is_private\":false}")

RESPONSE=$(curl -s -X POST \
  "http://localhost:8000/notes" \
  -H "accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"I have seen the future; you're not in it.\", \"is_private\":false}")

RESPONSE=$(curl -s -X POST \
  "http://localhost:8000/notes" \
  -H "accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"My pendulum swings back to life.\", \"is_private\":false}")

RESPONSE=$(curl -s -X POST \
  "http://localhost:8000/api/notes" \
  -H "accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"I may be faceless, but I'm not maceless.\", \"is_private\":false}")


echo "Creating private note..."
RESPONSE=$(curl -s -X POST \
  "http://localhost:8000/notes" \
  -H "accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"From a place beyond time, and time beyond counting. Here is your flag: SAS{br0_y0u_just_st0l3_my_f4c3_but_n0t_my_s0ul}\", \"is_private\":true}")

echo "All notes created successfully!" 