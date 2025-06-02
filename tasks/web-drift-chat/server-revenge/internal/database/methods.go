package database

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

func (e executor) Exec(ctx context.Context, sql string, arguments ...interface{}) (pgconn.CommandTag, error) {
	return e.e.Exec(ctx, sql, arguments...)
}

func (e executor) QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row {
	return e.e.QueryRow(ctx, sql, args...)
}

func (e executor) Begin(ctx context.Context) (pgx.Tx, error) {
	return e.e.Begin(ctx)
}

func (e executor) Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
	return e.e.Query(ctx, sql, args...)
}
