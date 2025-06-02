package service

import (
	"editor/internal/redis"
	"fmt"
	"log/slog"

	"github.com/gin-gonic/gin"
)

type loginReq struct {
	Login    string `json:"login"`
	Password string `json:"password"`
}

type loginResp struct{}

func (s *Service) Login(c *gin.Context) {
	ctx := c.Request.Context()

	req := loginReq{}
	if err := c.BindJSON(&req); err != nil {
		slog.Error("bind", err)
		c.AbortWithStatus(403)
		return
	}

	passw, err := s.user.Get(ctx, req.Login)
	if err != nil {
		c.AbortWithStatus(500)
		c.Error(fmt.Errorf("user get: %w", err))
		return
	}
	if passw == "" || passw != req.Password {
		c.AbortWithStatus(403)
		return
	}

	token, err := redis.GenerateSessionToken()
	if err != nil {
		c.AbortWithStatus(500)
		c.Error(err)
		return
	}

	st := s.red.Set(ctx, fmt.Sprintf(redis.SessionUsername, token), req.Login, 0)
	if st.Err() != nil {
		c.AbortWithStatus(500)
		c.Error(fmt.Errorf("redis set: %w", st.Err()))
		return
	}

	c.SetCookie(tokenCookie, token, 36000, "/", "", false, false)

	c.JSON(200, loginResp{})
}
