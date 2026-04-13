#para levantar el servidor
up:
		docker compose up -d && docker compose logs -f
#para bajar el servidor
down:
		docker compose down --remove-orphans
#para reiniciar
restart:
		docker compose restart
#para levantar imagen
build:
		docker compose up -d --build 
