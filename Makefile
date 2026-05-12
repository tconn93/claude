.PHONY: build run-cli run-server run-frontend

build:
	cd claude-code-go && go build -o ../bin/claude-code ./cmd/claude-code

run-cli:
	cd claude-code-go && go run ./cmd/claude-code

run-server:
	cd claude-code-go && go run ./cmd/claude-code --serve

run-frontend:
	cd claude-code-go/frontend && npm run dev

run:
	@echo "Starting backend and frontend..."
	@$(MAKE) -j2 run-server run-frontend
