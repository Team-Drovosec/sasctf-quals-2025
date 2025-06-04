# Drift Chat

> In the first version of the task, there was a broken authorization logic at `/chat/get`, related to the lack of `return` statement after setting the error code, which allowed any authenticated user to access any chat. This issue was fixed in the *Revenge* version of the task, writeup for which is below.

## Main idea
redis.Ring does not check what shards you access. redis.Del on several keys will execute only on the shard of the first key. Leaving non-consistent cache state could be insecure.

## Solution process
The application sends the chat log on every `/SendMessage` request to be more responsive. Let's review the code of `/SendMessage` handler:

```go
    // Check 1. Token cookie
	tok := c.Request.CookiesNamed(tokenCookie)
	if len(tok) != 1 {
		c.AbortWithStatus(403)
		return
	}
	token := tok[0].Value
	st := s.red.Get(ctx, fmt.Sprintf(redis.SessionUsername, token))
	username := st.Val()

    // Check 2. This token/session has draft message
	st = s.red.Get(ctx, fmt.Sprintf(redis.DraftMessage, token))
	if st.Err() != nil {
		c.AbortWithStatus(500)
		c.Error(fmt.Errorf("no draft message %s", st.Err()))
		return
	}
	msg := st.Val()

    // Check 3. This token/session has "WrittenNow" variable that equals to the chat, 
    // that the user is trying to send message to
	st = s.red.Get(ctx, fmt.Sprintf(redis.WrittenNow, token))
	if st.Err() != nil {
		c.AbortWithStatus(500)
		c.Error(fmt.Errorf("no written now %s", st.Err()))
		return
	}
	writtenNow := st.Val()
	if writtenNow != chatName {
		c.AbortWithStatus(403)
		c.Error(fmt.Errorf("written now is wrong %s", st.Err()))
		return
	}

	messages, err := s.chat.GetMessages(ctx, chatName)
	if err != nil {
		c.AbortWithStatus(500)
		c.Error(fmt.Errorf("no messages %s", st.Err()))
		return
	}

    // Check 4. The user is allowed to the chat
	ok, _ := s.check_is_allowed(ctx, username, chatName)
	if !ok {
		c.AbortWithStatus(403)
		return
	}
```

So, the checks are as follows:

1. Token cookie is sent
2. This token has draft message associated
3. This token has "WrittenNow" variable associated that equals to the chat, that the user is trying to send message to
4. The user is allowed to the chat

The `check_is_allowed` is somewhat broken, it grants access to the user, if the username is `""`:
```go
func (s *Service) check_is_allowed(ctx context.Context, name, chat string) (bool, error) {
	if name == "" {
		return true, errors.New("no name")
	}

	ch, err := s.chat.GetChat(ctx, chat)
	if err != nil {
		return false, err
	}

	return slices.Contains(ch.AllowedUsers, name), nil
}
```

So, we need to craft such token, so that it is associated with an empty-string username, but has `DraftMessage` and `WrittenNow` still intact.

Next, we will review logout logic:
```go
	s.red.Del(ctx,
		fmt.Sprintf(redis.SessionUsername, token),
		fmt.Sprintf(redis.DraftMessage, token),
		fmt.Sprintf(redis.WrittenNow, token))
```

As we stated in the beggining, if `redis.Del` encounters keys in different shards, it will delete only those that are on the first shard. So, if `SessionUsername` is in shard-1, and other keys are on shard-2, when we logout, we will get a session with:
- Deleted `SessionUsername` -- will be parsed as `""`
- Still correct `DraftMessage` and `WrittenNow`

Redis keys in this case are distributed uniformly, so it takes a few times to get the desired case.

Also, we can note that the application does not check any access to the chat when the user saves his draft.

## Final exploit

1. Register a new user
2. Call `/set_draft` to the chat "best chat eva"
3. Call `/logout`. 
4. Call `/send_message`. If `SessionUsername` is in a different shard, you will get a flag, otherwise retry steps 1-4

You can find the exploit in `exploit.sh`

## Fun fact
Actually, original task idea has nothing to do with the race condition, it's style and description is just a gag, while inconsistency depends on the redis shard distribution (thus you can perform it request by request with no automation required). But turns out there's *also* a race condition that can happen even with a single redis instance. Thanks to the participants for pointing that out.
