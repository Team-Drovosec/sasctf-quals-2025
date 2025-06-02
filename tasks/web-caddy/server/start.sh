sudo docker run \
    -p 8080:80 \
    --cap-drop CAP_DAC_OVERRIDE \
    --name wb \
    -t web-caddy

