package service

import (
	"context"
	"editor/internal/repository/chat"
	"editor/internal/repository/user"
	"log/slog"

	"github.com/gin-gonic/gin"
	red "github.com/redis/go-redis/v9"
)

const tokenCookie = "token"

type Service struct {
	eng  *gin.Engine
	red  red.UniversalClient
	chat chat.Repository
	user user.Repository
}

func Init(ctx context.Context, chat chat.Repository, user user.Repository, r red.UniversalClient) (Service, error) {
	return Service{
		eng:  gin.Default(),
		chat: chat,
		user: user,
		red:  r,
	}, nil
}

func (s *Service) Run() {
	s.routes()
	s.eng.Run(":3134")
}

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "http://localhost:37755")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func ginBodyLogMiddleware(c *gin.Context) {
	for _, err := range c.Errors {
		if err == nil {
			slog.Error("nil error")
			continue
		}
		slog.Error("error", "err", err.Error())
	}
}

func (s *Service) routes() {
	eng := gin.Default()
	eng.Use(CORSMiddleware())
	eng.Use(ginBodyLogMiddleware)

	routes := eng.Group("/api")

	routes.POST("/register", s.Register)
	routes.POST("/login", s.Login)
	routes.POST("/logout", s.Logout)

	routes.POST("/chat/create", s.Create)
	routes.GET("/chat/list", s.List)
	routes.POST("/chat/get_drafts", s.GetDrafts)
	routes.POST("/chat/get", s.GetChat)

	routes.POST("/send_message", s.SendMessage)
	routes.POST("/set_draft", s.SetDraft)

	s.eng = eng
}
