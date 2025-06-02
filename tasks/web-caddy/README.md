## Title
Proxy

## Description
Nowadays, some kind of connection transitivity is often required. We're quite new to this market, would you mind to check our MVP?

## Solution
Using locally exposed unauthenticated Caddy Admin API:
1. Manipulate existing caddy config to get arbitrary read and write using `POST localhost:2019/load`
2. Write reverse-shell script to `/usr/local/sbin/caddy`
3. Restart the docker container via `POST localhost:2019/stop` so it would execute the reverse shell

[Detailed solution](./writeup/)

## Flag
SAS{c4ddy_1s_my_d4ddy_78743533}

**Solved by:** 15 teams