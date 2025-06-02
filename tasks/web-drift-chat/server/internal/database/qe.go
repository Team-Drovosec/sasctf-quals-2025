package database

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type (
	// Tx ...
	Tx interface {
		Begin(ctx context.Context) (pgx.Tx, error)
	}

	// QueryExecutor ...
	QueryExecutor interface {
		Tx
		Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error)
		Exec(ctx context.Context, sql string, arguments ...interface{}) (pgconn.CommandTag, error)
		QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
	}

	executor struct {
		e *pgxpool.Pool
	}
)

func NewQE(conn *pgxpool.Pool) QueryExecutor {
	return executor{
		e: conn,
	}
}
