package service

import (
	"editor/internal/redis"
	"editor/internal/repository/chat"
	"fmt"
	"log/slog"

	"github.com/gin-gonic/gin"
)

type sendMessageReq struct {
	Chat string `json:"chat"`
}

func (s *Service) SendMessage(c *gin.Context) {
	ctx := c.Request.Context()

	req := sendMessageReq{}
	if err := c.BindJSON(&req); err != nil {
		slog.Error("parse", "err", err)
		c.AbortWithStatus(532)
		return
	}
	chatName := req.Chat

	tok := c.Request.CookiesNamed(tokenCookie)
	if len(tok) != 1 {
		c.AbortWithStatus(403)
		return
	}
	token := tok[0].Value
	st := s.red.Get(ctx, fmt.Sprintf(redis.SessionUsername, token))
	username := st.Val()

	st = s.red.Get(ctx, fmt.Sprintf(redis.DraftMessage, token))
	if st.Err() != nil {
		c.AbortWithStatus(500)
		c.Error(fmt.Errorf("no draft message %s", st.Err()))
		return
	}
	msg := st.Val()

	st = s.red.Get(ctx, fmt.Sprintf(redis.WrittenNow, token))
	if st.Err() != nil {
		c.AbortWithStatus(500)
		c.Error(fmt.Errorf("no written now %s", st.Err()))
		return
	}
	writtenNow := st.Val()
	if writtenNow != chatName {
		c.AbortWithStatus(403)
		c.Error(fmt.Errorf("written now is wrong %s", st.Err()))
		return
	}

	messages, err := s.chat.GetMessages(ctx, chatName)
	if err != nil {
		c.AbortWithStatus(500)
		c.Error(fmt.Errorf("no messages %s", st.Err()))
		return
	}

	ok, _ := s.check_is_allowed(ctx, username, chatName)
	if !ok {
		c.AbortWithStatus(403)
		return
	}

	err = s.chat.SendMessage(ctx, chatName, chat.Message{
		Author:  username,
		Content: msg,
	})
	if err != nil {
		c.AbortWithStatus(403)
		c.Error(fmt.Errorf("failed to send %s", st.Err()))
		return
	}

	cmd := s.red.Del(ctx,
		fmt.Sprintf(redis.WrittenNow, token),
		fmt.Sprintf(redis.DraftMessage, token))
	if cmd.Err() != nil {
		c.AbortWithStatus(500)
		c.Error(fmt.Errorf("del %s", cmd.Err()))
		return
	}

	c.JSON(200, getChatResp{Messages: messages})
}
