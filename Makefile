UID := $(shell id -u)
export UID

.PHONY: help
help: ## Show this message
	@echo "usage:" >&2
	@grep -h "[#]# " $(MAKEFILE_LIST)	| \
		sed 's/^/  make /'		| \
		sed 's/:[^#]*[#]# /|/'		| \
		column -t -s'|' >&2

.PHONY: docker
docker: ## Run shell with source code and deps inside Docker
	scripts/docker-compose.bash build web-dev
	scripts/docker-compose.bash run --service-ports web-dev || true
	scripts/docker-compose.bash down

.PHONY: down
down: ## Download responses from Google Sheets to local JSON
	./sheets.py download

.PHONY: up
up: ## Upload responses from local JSON back to Google Sheets
	./sheets.py upload

.PHONY: build-prod
build-prod: ## Build static files for production
	yarn parcel build --no-cache static/*.html

.PHONY: build-dev
build-dev: ## Build static files for development, and watch for changes
	yarn parcel watch --hmr-port $${HMR_PORT:-8081} static/*.html

.PHONY: app-prod
app-prod: ## Start webserver for production
	LAM_AUTOFETCH_ENABLED=1						\
		gunicorn --workers 1 --threads 1			\
		--bind $${HOST:-127.0.0.1}:$${PORT:-8080} app:app

.PHONY: app-dev
app-dev: ## Start webserver in admin mode, with live-reload
	LAM_ADMIN_ENABLED=1 watchexec -r -e py					\
		"flask run --host $${HOST:-127.0.0.1} --port $${PORT:-8080}"

.PHONY: image
image: ## Build Docker image for deployment
	scripts/docker-compose.bash build web-prod

.PHONY: image-run
image-run: image ## Build and run Docker image for deployment
	scripts/docker-compose.bash down
	LAM_OAUTH_PRIVATE_KEY="$$(< .oauth-private-key.json)"	\
		scripts/docker-compose.bash run --service-ports	\
		-e LAM_OAUTH_PRIVATE_KEY web-prod		\
		poetry run make app-prod || true
	scripts/docker-compose.bash down

.PHONY: deploy
deploy: image ## Deploy webapp to Heroku
	scripts/docker.bash tag life-after-mudd		\
		registry.heroku.com/life-after-mudd/web
	heroku auth:token | scripts/docker.bash login			\
		--username=_ --password-stdin registry.heroku.com
	scripts/docker.bash push registry.heroku.com/life-after-mudd/web
	heroku container:release web -a life-after-mudd

.PHONY: sandwich
sandwich: ## https://xkcd.com/149/
	@if bash -c '[ "$${EUID}" != 0 ]'; then		\
		echo "What? Make it yourself." >&2;	\
		exit 1;					\
	else						\
		echo "Okay." >&2;			\
	fi
