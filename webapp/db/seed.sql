-- TODO: drizzle-seed が出たら移行する
-- https://orm.drizzle.team/docs/kit-seed-data

INSERT OR IGNORE INTO `oauth_provider` (`id`, `name`) VALUES (1, "GitHub")

INSERT OR IGNORE INTO `scope` (`id`, `name`, `description`) VALUES (1, "read:basic_info", "あなたのユーザー名やユーザー ID、プロフィール画像を読み取ります。")
