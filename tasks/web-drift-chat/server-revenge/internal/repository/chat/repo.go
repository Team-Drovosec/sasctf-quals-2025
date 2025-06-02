package chat

import (
	"context"
	"editor/internal/database"
	"fmt"
)

type Chat struct {
	Name         string   // chat name
	AllowedUsers []string // usernames
}

type Message struct {
	Author  string `json:"author"`
	Content string `json:"content"`
}

type Repository interface {
	Create(ctx context.Context, chat Chat) error
	GetMessages(ctx context.Context, chatName string) ([]Message, error)
	SendMessage(ctx context.Context, chatName string, msg Message) error

	GetChat(ctx context.Context, chatName string) (Chat, error)
	ListChats(ctx context.Context) ([]Chat, error)
}

type chatRepository struct {
	qe database.QueryExecutor
}

// New ...
func New(qe database.QueryExecutor) Repository {
	return &chatRepository{qe: qe}
}

// Create ...
func (r *chatRepository) Create(ctx context.Context, chat Chat) error {
	_, err := r.qe.Exec(ctx, "INSERT INTO chats (name, allowed_users) VALUES ($1, $2)", chat.Name, chat.AllowedUsers)
	if err != nil {
		return fmt.Errorf("create chat: %w", err)
	}

	return nil
}

// GetMessages ...
func (r *chatRepository) GetMessages(ctx context.Context, chatName string) ([]Message, error) {
	rows, err := r.qe.Query(ctx, "SELECT author, content FROM messages WHERE chat_name = $1 order by id ASC limit 100", chatName)
	if err != nil {
		return nil, fmt.Errorf("retrieve messages: %s", err)
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var msg Message
		if err := rows.Scan(&msg.Author, &msg.Content); err != nil {
			return nil, fmt.Errorf("scan message: %w", err)
		}
		messages = append(messages, msg)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over messages: %w", err)
	}

	return messages, nil
}

// SendMessage ...
func (r *chatRepository) SendMessage(ctx context.Context, chatName string, msg Message) error {
	_, err := r.qe.Exec(ctx, "INSERT INTO messages (chat_name, author, content) VALUES ($1, $2, $3)", chatName, msg.Author, msg.Content)
	if err != nil {
		return fmt.Errorf("failed to send message: %w", err)
	}

	return nil
}

func (r *chatRepository) ListChats(ctx context.Context) ([]Chat, error) {
	rows, err := r.qe.Query(ctx, "SELECT name, allowed_users FROM chats")
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve chats: %w", err)
	}
	defer rows.Close()

	var chats []Chat
	for rows.Next() {
		var name string
		var allowedUsers []string
		if err := rows.Scan(&name, &allowedUsers); err != nil {
			return nil, fmt.Errorf("failed to scan chat: %w", err)
		}

		chats = append(chats, Chat{
			Name:         name,
			AllowedUsers: allowedUsers,
		})
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over chats: %w", err)
	}

	return chats, nil
}

func (r *chatRepository) GetChat(ctx context.Context, chatName string) (Chat, error) {
	var name string
	var allowedUsers []string
	err := r.qe.QueryRow(ctx, "SELECT name, allowed_users FROM chats WHERE name = $1", chatName).
		Scan(&name, &allowedUsers)
	if err != nil {
		return Chat{}, fmt.Errorf("failed to retrieve chat: %w", err)
	}

	return Chat{
		Name:         name,
		AllowedUsers: allowedUsers,
	}, nil
}
