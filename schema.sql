-- Optional. The app creates these tables by itself on the first request.
-- Run this in the Neon SQL Editor only if you prefer to create them yourself.

CREATE TABLE IF NOT EXISTS doable_meta (
  key   text PRIMARY KEY,
  value text NOT NULL
);

CREATE TABLE IF NOT EXISTS doable_members (
  id      text PRIMARY KEY,
  name    text NOT NULL,
  color   integer NOT NULL,
  created bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS doable_tasks (
  id       text PRIMARY KEY,
  title    text NOT NULL,
  assignee text,
  status   text NOT NULL DEFAULT 'todo',
  due      text NOT NULL DEFAULT '',
  created  bigint NOT NULL
);
