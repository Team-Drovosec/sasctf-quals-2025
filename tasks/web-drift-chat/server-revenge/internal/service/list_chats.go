package service

import (
	"editor/internal/redis"
	"fmt"
	"log/slog"
	"slices"

	"github.com/gin-gonic/gin"
)

type listReq struct{}

type chatResp struct {
	ChatName  string `json:"name"`
	IsAllowed bool   `json:"is_allowed"`
}

type listResp struct {
	Chats []chatResp `json:"chats"`
}

func (s *Service) List(c *gin.Context) {
	ctx := c.Request.Context()

	tok := c.Request.CookiesNamed(tokenCookie)
	if len(tok) != 1 {
		c.AbortWithStatus(403)
		return
	}
	token := tok[0].Value
	st := s.red.Get(ctx, fmt.Sprintf(redis.SessionUsername, token))
	username := st.Val()

	chats, err := s.chat.ListChats(ctx)
	if err != nil {
		c.AbortWithStatus(500)
		c.Error(err)
		return
	}

	resp := make([]chatResp, 0, len(chats))
	for _, ch := range chats {
		slog.Info("allowed users", "chat.users", ch.AllowedUsers, "username", username)
		resp = append(resp, chatResp{
			ChatName:  ch.Name,
			IsAllowed: slices.Contains(ch.AllowedUsers, username),
		})
	}

	c.JSON(200, listResp{resp})
}
