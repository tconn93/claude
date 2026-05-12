package server

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/tyler/claude-code-go/internal/agent"
	"github.com/tyler/claude-code-go/internal/llm"
)

type Server struct {
	Agent *agent.Agent
}

func NewServer(a *agent.Agent) *Server {
	return &Server{Agent: a}
}

func (s *Server) Start(addr string) error {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/chat", s.handleChat)

	handler := s.corsMiddleware(mux)

	fmt.Printf("Web backend starting on %s\n", addr)
	return http.ListenAndServe(addr, handler)
}

func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) handleChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Messages []llm.Message `json:"messages"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// This is a simplified version. For Vercel AI SDK, we should use SSE for streaming.
	// For now, I'll implement a non-streaming response.
	
	ctx := r.Context()
	
	// We should ideally use the existing history in req.Messages or start a new run
	// For simplicity, we'll just take the last message as user input
	if len(req.Messages) == 0 {
		http.Error(w, "No messages", http.StatusBadRequest)
		return
	}
	
	lastMsg := req.Messages[len(req.Messages)-1]
	var userInput string
	for _, b := range lastMsg.Content {
		if b.Type == "text" {
			userInput = b.Text
			break
		}
	}

	err := s.Agent.Run(ctx, userInput)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Return the updated history or just the assistant's last message
	json.NewEncoder(w).Encode(s.Agent.History)
}
