package main

import (
	"context"
	"editor/internal/database"
	"editor/internal/repository/chat"
	"editor/internal/repository/user"
	"editor/internal/service"
	"fmt"
	"log"

	red "github.com/redis/go-redis/v9"
)

func main() {
	ctx := context.Background()

	pg, err := database.MakePostgres(ctx, &database.Config{
		ConnString: "postgresql://editor:xVfp9KzAR5F6qjLhd7Z8Ct@db:5432/editor",
		ConnCount:  10,
	})
	if err != nil {
		log.Fatalf("postgres: %s", err)
	}

	qe := database.NewQE(pg)

	redis := red.NewRing(&red.RingOptions{
		Addrs: map[string]string{
			"redis1": "redis1:6379",
			"redis2": "redis2:6379",
		},
	})

	c := chat.New(qe)
	u := user.New(qe)

	app, err := service.Init(ctx, c, u, redis)
	if err != nil {
		log.Fatalf("init: %s", err)
	}

	fmt.Println("starting app")

	app.Run()
}
