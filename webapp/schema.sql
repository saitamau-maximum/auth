------------------------------------------------------
-- IdP 関連

CREATE TABLE IF NOT EXISTS `user` (
  -- UUID で生成することを想定 (人に対する連番 ID 嫌いなので)
  `id` TEXT PRIMARY KEY,
  `display_name` TEXT NOT NULL,
  `profile_image_url` TEXT,
  -- その他の個人情報等は後で追加
)

CREATE TABLE IF NOT EXISTS `role` (
  `id` INTEGER PRIMARY KEY,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `priority` INTEGER NOT NULL,
)

CREATE TABLE IF NOT EXISTS `user_role` (
  `user_id` TEXT NOT NULL,
  `role_id` INTEGER NOT NULL,
  PRIMARY KEY (`user_id`, `role_id`),
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`),
)

-- さすがに client_secret とかは環境変数側に持たせるべき (見れちゃうので)
-- → たぶん各々の OAuth ページとかを作ることになりそう
-- OAuth の接続情報に対する Reference Provider ID として使う
CREATE TABLE IF NOT EXISTS `oauth_provider` (
  `id` INTEGER PRIMARY KEY,
  `name` TEXT NOT NULL,
)

CREATE TABLE IF NOT EXISTS `oauth_connection` (
  `user_id` TEXT NOT NULL,
  `provider_id` INTEGER NOT NULL,
  `provider_user_id` TEXT NOT NULL, -- Provider 側の ID
  -- もしあれば取得する情報
  `mail_address` TEXT,
  `name` TEXT,
  `profile_image_url` TEXT,
  PRIMARY KEY (`user_id`, `provider_id`),
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
  FOREIGN KEY (`provider_id`) REFERENCES `oauth_provider`(`id`),
)

------------------------------------------------------
-- Maximum Auth Clients

CREATE TABLE IF NOT EXISTS `auth_client` (
  `id` INTEGER PRIMARY KEY,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `owner_id` TEXT NOT NULL,
  FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`)
)

CREATE TABLE IF NOT EXISTS `auth_pubkey` (
  `id` INTEGER PRIMARY KEY,
  `client_id` INTEGER NOT NULL,
  `pubkey` TEXT NOT NULL,
  FOREIGN KEY (`client_id`) REFERENCES `auth_clients`(`id`)
)

-- Owner とは別の Admin
CREATE TABLE IF NOT EXISTS `auth_admin` (
  `client_id` INTEGER NOT NULL,
  `admin_id` TEXT NOT NULL,
  PRIMARY KEY (`client_id`, `admin_id`),
  FOREIGN KEY (`client_id`) REFERENCES `auth_clients`(`id`),
  FOREIGN KEY (`admin_id`) REFERENCES `user`(`id`)
)

------------------------------------------------------
