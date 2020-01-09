.PHONY: deploy
deploy:
	poetry export -f requirements.txt > requirements.txt
	gcloud app deploy --project life-after-mudd
