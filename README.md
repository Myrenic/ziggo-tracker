# ziggo-tracker

Basic device tracker used for presence detection in Home Assistant.

All the other ziggo device trackers didn't work for me, so i created my own.


***docker compose example:***

    ziggotracker:
    image: ghcr.io/myrenic/ziggo-tracker:docker-EnvironmentVariables
    environment:
      - router_url=http://192.168.178.1
      - router_password=
      - mqtt_host=
      - mqtt_user=
      - mqtt_password=
      - mqtt_port=


![image](https://user-images.githubusercontent.com/38107502/191713087-d1d7637b-3fe4-4b7b-9f27-02b7cfa06cb2.png)
