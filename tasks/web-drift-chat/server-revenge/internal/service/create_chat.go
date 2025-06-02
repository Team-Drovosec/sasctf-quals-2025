package service

import (
	"editor/internal/redis"
	"editor/internal/repository/chat"
	"fmt"
	"log/slog"
	"slices"

	"github.com/gin-gonic/gin"
)

type createReq struct {
	Name         string   `json:"name"`
	AllowedUsers []string `json:"allowed_users"`
}

type createResp struct{}

func (s *Service) Create(c *gin.Context) {
	ctx := c.Request.Context()

	req := createReq{}
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

	if !slices.Contains(req.AllowedUsers, username) {
		req.AllowedUsers = append(req.AllowedUsers, username)
	}

	err := s.chat.Create(ctx, chat.Chat{
		Name:         req.Name,
		AllowedUsers: req.AllowedUsers,
	})
	if err != nil {
		c.AbortWithStatus(500)
		c.Error(err)
		return
	}

	c.JSON(200, createResp{})
}
