package redis

import (
	"crypto/rand"
	"encoding/hex"
)

const (
	SessionUsername = "%s/username"
	WrittenNow      = "%s/written_now_chat" // Chat that the person is writing to now
	DraftMessage    = "%s/draft_message"
	ChatWriteList   = "%s/write_list" // Who is writing to the chat now (array)
	Online          = "%s/online"
)

func GenerateSessionToken() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
