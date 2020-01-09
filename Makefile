.PHONY: deps
deps:
	poetry install
	yarn install

.PHONY: down
down:
	poetry run ./sheets.py download

.PHONY: up
up:
	poetry run ./sheets.py upload

.PHONY: dev
dev:
	yarn parcel watch static/*.html

.PHONY: app
app:
	LAM_ADMIN_ENABLED=1 poetry run watchexec -r -e py "flask run"

.PHONY: deploy
deploy:
	poetry export -f requirements.txt > requirements.txt
	yarn install
	yarn parcel build --no-cache static/*.html
	gcloud app deploy --project life-after-mudd
