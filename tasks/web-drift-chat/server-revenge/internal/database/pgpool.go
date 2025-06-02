package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Config struct {
	ConnString string
	ConnCount  int64
}

func MakePostgres(ctx context.Context, cfg *Config) (*pgxpool.Pool, error) {
	poolConf, err := pgxpool.ParseConfig(cfg.ConnString)
	if err != nil {
		return nil, fmt.Errorf("pg init read connstring: %w", err)
	}

	poolConf.MaxConns = int32(cfg.ConnCount)

	pool, err := pgxpool.NewWithConfig(ctx, poolConf)
	if err != nil {
		return nil, fmt.Errorf("pg init new pool: %w", err)
	}

	return pool, nil
}
