package service

import (
	"editor/internal/redis"
	"fmt"
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
)

type setDraftReq struct {
	Chat  string `json:"chat"`
	Draft string `json:"draft"`
}

type setDraftResp struct{}

func (s *Service) SetDraft(c *gin.Context) {
	ctx := c.Request.Context()

	req := setDraftReq{}
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
	if username == "" {
		c.AbortWithStatus(403)
		return
	}

	s.red.Set(ctx, fmt.Sprintf(redis.Online, username), "1", 10*time.Second)

	if req.Draft == "" {
		res := s.red.Del(ctx, fmt.Sprintf(redis.DraftMessage, token),
			fmt.Sprintf(redis.WrittenNow, token))
		if res.Err() != nil {
			c.AbortWithStatus(500)
			return
		}

		c.JSON(200, setDraftResp{})
		return
	}

	pipe := s.red.TxPipeline()
	pipe.SAdd(ctx, fmt.Sprintf(redis.ChatWriteList, req.Chat), token)
	pipe.Set(ctx, fmt.Sprintf(redis.DraftMessage, token), req.Draft, 0)
	pipe.Set(ctx, fmt.Sprintf(redis.WrittenNow, token), req.Chat, 0)
	_, err := pipe.Exec(ctx)
	if err != nil {
		c.AbortWithStatus(500)
		c.Error(err)
		return
	}

	c.JSON(200, setDraftResp{})
}
