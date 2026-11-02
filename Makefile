.PHONY: dev test lint build setup seed

dev:
	npm run dev

test:
	npm test

lint:
	npm run lint

build:
	npm run build

setup:
	npm run db:setup

seed:
	npm run db:seed
