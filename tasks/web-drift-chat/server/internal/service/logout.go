package service

import (
	"editor/internal/redis"
	"fmt"

	"github.com/gin-gonic/gin"
)

func (s *Service) Logout(c *gin.Context) {
	ctx := c.Request.Context()

	tok := c.Request.CookiesNamed(tokenCookie)
	if len(tok) != 1 {
		c.AbortWithStatus(403)
		return
	}
	token := tok[0].Value
	st := s.red.Get(ctx, fmt.Sprintf(redis.SessionUsername, token))
	username := st.Val()
	if username == "" || st.Err() != nil {
		c.JSON(403, registerResp{})
		return
	}

	st = s.red.Get(ctx, fmt.Sprintf(redis.WrittenNow, token))
	if st.Val() == "" || st.Err() != nil {
		s.red.Del(ctx, fmt.Sprintf(redis.SessionUsername, token))
		c.JSON(200, registerResp{})
		return
	}
	chat_name := st.Val()
	s.red.SRem(ctx, fmt.Sprintf(redis.ChatWriteList, chat_name), token)

	s.red.Del(ctx,
		fmt.Sprintf(redis.SessionUsername, token),
		fmt.Sprintf(redis.DraftMessage, token),
		fmt.Sprintf(redis.WrittenNow, token))

	c.JSON(200, registerResp{})
}
