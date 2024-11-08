/* eslint-disable sort-exports/sort-exports */
import { sql, relations } from 'drizzle-orm'
import {
  check,
  int,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core'

// ---------- IdP 関連 ---------- //

export const user = sqliteTable('user', {
  id: text('id').primaryKey(), // UUID で生成することを想定(人に対する連番 ID 嫌いなので)
  displayName: text('display_name').notNull(),
  profileImageUrl: text('profile_image_url'),
  // その他の個人情報等は後で追加
})

export const role = sqliteTable(
  'role',
  {
    id: int('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    description: text('description'),
    priority: int('priority', { mode: 'number' }).notNull(),
  },
  table => ({
    checkConstraint: check('nonneg_priority', sql`${table.priority} >= 0`),
  }),
)

export const userRole = sqliteTable(
  'user_role',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    roleId: int('role_id', { mode: 'number' })
      .notNull()
      .references(() => role.id),
  },
  table => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
  }),
)

// さすがに client_secret とかは環境変数側に持たせるべき(見れちゃうので)
// → たぶん各々の OAuth ページとかを作ることになりそう
// OAuth の接続情報に対する Reference Provider ID として使う
export const oauthProvider = sqliteTable('oauth_provider', {
  id: int('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
})

export const oauthConnection = sqliteTable(
  'oauth_connection',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    providerId: int('provider_id', { mode: 'number' })
      .notNull()
      .references(() => oauthProvider.id),
    providerUserId: text('provider_user_id').notNull(), // OAuth Provider 側の User ID
    // 以下取れそうな情報を書く
    email: text('email'),
    name: text('name'),
    profileImageUrl: text('profile_image_url'),
  },
  table => ({
    pk: primaryKey({ columns: [table.userId, table.providerId] }),
  }),
)

// ---------- OAuth 関連 ---------- //

export const oauthClient = sqliteTable('oauth_client', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  logo_url: text('logo_url'),
  owner_id: text('owner_id')
    .notNull()
    .references(() => user.id),
})

export const oauthClientSecret = sqliteTable(
  'oauth_client_secret',
  {
    client_id: text('client_id')
      .notNull()
      .references(() => oauthClient.id),
    secret: text('secret').notNull(),
    description: text('description'),
    issued_by: text('issued_by')
      .notNull()
      .references(() => user.id),
    issued_at: int('issued_at', { mode: 'timestamp_ms' }).notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.client_id, table.secret] }),
  }),
)

export const oauthClientCallback = sqliteTable(
  'oauth_client_callback',
  {
    client_id: text('client_id')
      .notNull()
      .references(() => oauthClient.id),
    callback_url: text('callback_url').notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.client_id, table.callback_url] }),
  }),
)

export const oauthScope = sqliteTable('oauth_scope', {
  id: int('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
})

export const oauthClientScope = sqliteTable(
  'oauth_client_scope',
  {
    client_id: text('client_id')
      .notNull()
      .references(() => oauthClient.id),
    scope_id: int('scope_id', { mode: 'number' })
      .notNull()
      .references(() => oauthScope.id),
  },
  table => ({
    pk: primaryKey({ columns: [table.client_id, table.scope_id] }),
  }),
)

export const oauthToken = sqliteTable('oauth_token', {
  id: int('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  client_id: text('client_id')
    .notNull()
    .references(() => oauthClient.id),
  user_id: text('user_id')
    .notNull()
    .references(() => user.id),
  code: text('code').notNull().unique(),
  code_expires_at: int('code_expires_at', { mode: 'timestamp_ms' }).notNull(),
  code_used: int('code_used', { mode: 'boolean' }).notNull(),
  redirect_uri: text('redirect_uri').notNull(),
  access_token: text('access_token').notNull().unique(),
  access_token_expires_at: int('access_token_expires_at', {
    mode: 'timestamp_ms',
  }).notNull(),
})

export const oauthTokenScope = sqliteTable(
  'oauth_token_scope',
  {
    token_id: int('token_id', { mode: 'number' })
      .notNull()
      .references(() => oauthToken.id),
    scope_id: int('scope_id', { mode: 'number' })
      .notNull()
      .references(() => oauthScope.id),
  },
  table => ({
    pk: primaryKey({ columns: [table.token_id, table.scope_id] }),
  }),
)

// ---------- Relations ---------- //

export const userRelations = relations(user, ({ many }) => ({
  roles: many(role),
  oauthConnections: many(oauthConnection),
}))

export const roleRelations = relations(role, ({ many }) => ({
  users: many(user),
}))

export const userRoleRelations = relations(userRole, ({ one }) => ({
  user: one(user, { fields: [userRole.userId], references: [user.id] }),
  role: one(role, { fields: [userRole.roleId], references: [role.id] }),
}))

export const oauthProviderRelations = relations(oauthProvider, ({ many }) => ({
  connections: many(oauthConnection),
}))

export const oauthConnectionRelations = relations(
  oauthConnection,
  ({ one }) => ({
    user: one(user, {
      fields: [oauthConnection.userId],
      references: [user.id],
    }),
    provider: one(oauthProvider, {
      fields: [oauthConnection.providerId],
      references: [oauthProvider.id],
    }),
  }),
)

export const oauthClientRelations = relations(oauthClient, ({ one, many }) => ({
  owner: one(user, { fields: [oauthClient.owner_id], references: [user.id] }),
  secrets: many(oauthClientSecret),
  callbacks: many(oauthClientCallback),
  scopes: many(oauthClientScope),
}))

export const oauthClientSecretRelations = relations(
  oauthClientSecret,
  ({ one }) => ({
    client: one(oauthClient, {
      fields: [oauthClientSecret.client_id],
      references: [oauthClient.id],
    }),
    issuer: one(user, {
      fields: [oauthClientSecret.issued_by],
      references: [user.id],
    }),
  }),
)

export const oauthClientCallbackRelations = relations(
  oauthClientCallback,
  ({ one }) => ({
    client: one(oauthClient, {
      fields: [oauthClientCallback.client_id],
      references: [oauthClient.id],
    }),
  }),
)

export const oauthScopeRelations = relations(oauthScope, ({ many }) => ({
  clients: many(oauthClientScope),
  tokens: many(oauthTokenScope),
}))

export const oauthClientScopeRelations = relations(
  oauthClientScope,
  ({ one }) => ({
    client: one(oauthClient, {
      fields: [oauthClientScope.client_id],
      references: [oauthClient.id],
    }),
    scope: one(oauthScope, {
      fields: [oauthClientScope.scope_id],
      references: [oauthScope.id],
    }),
  }),
)

export const oauthTokenRelations = relations(oauthToken, ({ one }) => ({
  client: one(oauthClient, {
    fields: [oauthToken.client_id],
    references: [oauthClient.id],
  }),
  user: one(user, { fields: [oauthToken.user_id], references: [user.id] }),
}))

export const oauthTokenScopeRelations = relations(
  oauthTokenScope,
  ({ one }) => ({
    token: one(oauthToken, {
      fields: [oauthTokenScope.token_id],
      references: [oauthToken.id],
    }),
    scope: one(oauthScope, {
      fields: [oauthTokenScope.scope_id],
      references: [oauthScope.id],
    }),
  }),
)
