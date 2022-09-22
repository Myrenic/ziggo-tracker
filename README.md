# ziggo-tracker

Basic device tracker used for presence detection in Home Assistant.

All the other ziggo device trackers didn't work for me, so i created my own.


***docker compose example:***

    ziggotracker:
    image: ghcr.io/myrenic/ziggo-tracker:docker-EnvironmentVariables
    volumes:
      - ziggotracker:/usr/src/app/config:rw
    environment:
      - router_url=http://192.168.178.1
      - router_password=
      - mqtt_host=
      - mqtt_user=
      - mqtt_password=
      - mqtt_port=
