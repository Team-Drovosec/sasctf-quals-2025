

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    
    unique (id)
);

CREATE TABLE IF NOT EXISTS chats (
    name TEXT PRIMARY KEY,
    allowed_users TEXT[] NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    chat_name TEXT REFERENCES chats(name) ON DELETE CASCADE,
    author TEXT NOT NULL,
    content TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_name ON messages(chat_name);

INSERT INTO users (username, password) VALUES ('kek', substring(md5(random()::text) from 0 for 16));
INSERT INTO users (username, password) VALUES ('admin', substring(md5(random()::text) from 0 for 16));
INSERT INTO chats (name, allowed_users) VALUES ('best chat eva', '{"kek", "admin"}');
INSERT INTO messages (chat_name, author, content) VALUES ('best chat eva', 'admin', 'SAS{c1u7ch_k1ck_dr15t_ch4t_b2f771}');

