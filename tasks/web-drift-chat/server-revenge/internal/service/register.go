package service

import (
	"fmt"
	"log/slog"

	"github.com/gin-gonic/gin"
)

type registerReq struct {
	Username string `json:"login"`
	Password string `json:"password"`
}

type registerResp struct {
	Error string `json:"error"`
}

func (s *Service) Register(c *gin.Context) {
	ctx := c.Request.Context()

	req := registerReq{}
	if err := c.BindJSON(&req); err != nil {
		slog.Error("parse", "err", err)
		c.AbortWithStatus(532)
		return
	}

	if len(req.Username) < 6 {
		c.Error(fmt.Errorf("Name is too short!"))
		c.JSON(200, registerResp{
			Error: "Username should be at least 6 characters long",
		})
		return
	}

	if len(req.Password) < 8 {
		c.Error(fmt.Errorf("Password is too short!"))
		c.JSON(200, registerResp{
			Error: "Password should be at least 8 characters long",
		})
		return
	}

	if err := s.user.Save(ctx, req.Username, req.Password); err != nil {
		slog.Error("save", "err", err)
		c.AbortWithStatus(514)
		c.Error(fmt.Errorf("user save: %w", err))
		return
	}

	c.JSON(200, registerResp{})
}
