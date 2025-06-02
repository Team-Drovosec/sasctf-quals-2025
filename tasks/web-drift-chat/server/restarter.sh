#!/bin/bash


for i in $(seq 10000); 
do
    # sleep 3600;
    sleep 10;
    docker compose down -v;
    docker compose up -d;
done;

echo ended;


