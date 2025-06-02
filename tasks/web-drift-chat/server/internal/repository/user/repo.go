package user

import (
	"context"
	"editor/internal/database"
	"errors"

	"github.com/jackc/pgx/v5"
)

type Repository interface {
	Save(ctx context.Context, user, password string) error
	Get(ctx context.Context, user string) (passwordHash string, err error)
}

type user struct {
	qe database.QueryExecutor
}

func New(qe database.QueryExecutor) Repository {
	return user{qe: qe}
}

func (u user) Save(ctx context.Context, user, password string) error {
	_, err := u.qe.Exec(ctx, "insert into users (username, password) values ($1, $2)", user, password)
	if err != nil {
		return err
	}

	return nil
}

func (u user) Get(ctx context.Context, user string) (password string, err error) {
	err = u.qe.QueryRow(ctx, "select password from users where username = $1", user).
		Scan(&password)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", err
	}

	return password, nil
}
