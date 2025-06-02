package service

import (
	"editor/internal/redis"
	"fmt"
	"log/slog"
	"slices"

	"github.com/gin-gonic/gin"
)

type getDraftReq struct {
	Chat string `json:"chat"`
}

type getDraftResp struct {
	Drafts map[string]string `json:"drafts"`
}

func (s *Service) GetDrafts(c *gin.Context) {
	ctx := c.Request.Context()

	req := getDraftReq{}
	if err := c.BindJSON(&req); err != nil {
		slog.Error("parse", "err", err)
		c.AbortWithStatus(532)
		return
	}

	tok := c.Request.CookiesNamed(tokenCookie)
	if len(tok) != 1 {
		c.AbortWithStatus(403)
		return
	}
	token := tok[0].Value
	st := s.red.Get(ctx, fmt.Sprintf(redis.SessionUsername, token))
	username := st.Val()

	chat, err := s.chat.GetChat(ctx, req.Chat)
	if err != nil {
		c.AbortWithStatus(500)
		c.Error(err)
		return
	}

	if !slices.Contains(chat.AllowedUsers, username) {
		c.AbortWithStatus(403)
		return
	}

	members := s.red.SMembers(ctx, fmt.Sprintf(redis.ChatWriteList, chat.Name))
	if members.Err() != nil {
		c.AbortWithStatus(500)
		c.Error(members.Err())
		return
	}

	drafts := make(map[string]string, len(members.Val()))
	for _, userSession := range members.Val() {
		usernameSt := s.red.Get(ctx, fmt.Sprintf(redis.SessionUsername, userSession))

		st = s.red.Get(ctx, fmt.Sprintf(redis.WrittenNow, userSession))
		if st.Val() != chat.Name {
			s.red.SRem(ctx, fmt.Sprintf(redis.ChatWriteList, chat.Name), userSession)
		}

		st = s.red.Get(ctx, fmt.Sprintf(redis.DraftMessage, userSession))

		drafts[usernameSt.Val()] = st.Val()
	}

	c.JSON(200, getDraftResp{drafts})
}
