package ui

import (
	"context"
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbles/textarea"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/tyler/claude-code-go/internal/agent"
)

type model struct {
	viewport    viewport.Model
	textarea    textarea.Model
	agent       *agent.Agent
	messages    []string
	err         error
	width       int
	height      int
}

func NewModel(a *agent.Agent) model {
	ta := textarea.New()
	ta.Placeholder = "Ask Claude..."
	ta.Focus()

	ta.Prompt = "┃ "
	ta.CharLimit = 280

	ta.SetWidth(30)
	ta.SetHeight(3)

	// Remove cursor line styling
	ta.FocusedStyle.CursorLine = lipgloss.NewStyle()

	ta.ShowLineNumbers = false

	vp := viewport.New(30, 5)
	vp.SetContent(`Welcome to Claude Code (Go port)`)

	ta.KeyMap.InsertNewline.SetEnabled(false)

	return model{
		textarea: ta,
		viewport: vp,
		agent:    a,
		messages: []string{},
	}
}

func (m model) Init() tea.Cmd {
	return textarea.Blink
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var (
		tiCmd tea.Cmd
		vpCmd tea.Cmd
	)

	m.textarea, tiCmd = m.textarea.Update(msg)
	m.viewport, vpCmd = m.viewport.Update(msg)

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.Type {
		case tea.KeyCtrlC, tea.KeyEsc:
			fmt.Println(m.textarea.Value())
			return m, tea.Quit
		case tea.KeyEnter:
			input := m.textarea.Value()
			if input == "" {
				return m, nil
			}

			m.messages = append(m.messages, lipgloss.NewStyle().Foreground(lipgloss.Color("5")).Render("You: ")+input)
			m.viewport.SetContent(strings.Join(m.messages, "\n"))
			m.textarea.Reset()
			m.viewport.GotoBottom()

			// Run agent in background or handle async
			// For simplicity in this TUI prototype, we'll just show the input for now
			// In a real app, we'd send a Cmd to run the agent and update with results
			return m, nil
		}

	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.viewport.Width = msg.Width
		m.viewport.Height = msg.Height - m.textarea.Height() - 2
		m.textarea.SetWidth(msg.Width)
	}

	return m, tea.Batch(tiCmd, vpCmd)
}

func (m model) View() string {
	return fmt.Sprintf(
		"%s\n\n%s",
		m.viewport.View(),
		m.textarea.View(),
	) + "\n\n"
}

func RunTUI(a *agent.Agent) error {
	p := tea.NewProgram(NewModel(a), tea.WithAltScreen())
	_, err := p.Run()
	return err
}
