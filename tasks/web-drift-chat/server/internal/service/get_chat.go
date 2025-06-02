package service

import (
	"context"
	"editor/internal/redis"
	"editor/internal/repository/chat"
	"errors"
	"fmt"
	"log/slog"
	"slices"

	"github.com/gin-gonic/gin"
)

type getChatReq struct {
	Chat string `json:"chat"`
}

type userOnline struct {
	Username string `json:"username"`
	IsOnline bool   `json:"online"`
}

type getChatResp struct {
	Messages []chat.Message `json:"messages"`
	Users    []userOnline   `json:"users"`
}

func (s *Service) GetChat(c *gin.Context) {
	ctx := c.Request.Context()

	req := getChatReq{}
	if err := c.BindJSON(&req); err != nil {
		slog.Error("bind", err)
		c.AbortWithStatus(403)
		return
	}

	tok := c.Request.CookiesNamed(tokenCookie)
	if len(tok) != 1 {
		c.AbortWithStatus(403)
		return
	}
	token := tok[0].Value
	st := s.red.Get(ctx, fmt.Sprintf(redis.SessionUsername, token))
	if st.Err() != nil {
		c.AbortWithStatus(403)
		c.Error(st.Err())
		return
	}
	username := st.Val()

	ok, _ := s.check_is_allowed(ctx, username, req.Chat)
	if !ok {
		c.AbortWithStatus(403)
	}

	messages, err := s.chat.GetMessages(ctx, req.Chat)
	if err != nil {
		c.AbortWithStatus(500)
		c.Error(err)
		return
	}

	chat, err := s.chat.GetChat(ctx, req.Chat)
	if err != nil {
		c.AbortWithStatus(500)
		c.Error(err)
		return
	}

	userStatus := make([]userOnline, 0, len(chat.AllowedUsers))
	for _, user := range chat.AllowedUsers {
		st := s.red.Get(ctx, fmt.Sprintf(redis.Online, user))
		userStatus = append(userStatus, userOnline{
			user, st.Val() == "1",
		})
	}

	c.JSON(200, getChatResp{Messages: messages, Users: userStatus})
}

func (s *Service) check_is_allowed(ctx context.Context, name, chat string) (bool, error) {
	if name == "" {
		return true, errors.New("no name")
	}

	ch, err := s.chat.GetChat(ctx, chat)
	if err != nil {
		return false, err
	}

	return slices.Contains(ch.AllowedUsers, name), nil
}
