/* eslint-disable sort-exports/sort-exports */
import { relations } from 'drizzle-orm'
import { int, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const client = sqliteTable('client', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  logo_url: text('logo_url'),
  owner_id: text('owner_id').notNull(),
})

export const clientSecret = sqliteTable(
  'client_secret',
  {
    client_id: text('client_id')
      .notNull()
      .references(() => client.id),
    secret: text('secret').notNull(),
    description: text('description'),
    issued_by: text('issued_by').notNull(),
    issued_at: int('issued_at', { mode: 'timestamp_ms' }).notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.client_id, table.secret] }),
  }),
)

export const clientCallback = sqliteTable(
  'client_callback',
  {
    client_id: text('client_id')
      .notNull()
      .references(() => client.id),
    callback_url: text('callback_url').notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.client_id, table.callback_url] }),
  }),
)

export const scope = sqliteTable('scope', {
  id: int('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
})

export const clientScope = sqliteTable(
  'client_scope',
  {
    client_id: text('client_id')
      .notNull()
      .references(() => client.id),
    scope_id: int('scope_id', { mode: 'number' })
      .notNull()
      .references(() => scope.id),
  },
  table => ({
    pk: primaryKey({ columns: [table.client_id, table.scope_id] }),
  }),
)

export const token = sqliteTable('token', {
  id: int('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  client_id: text('client_id')
    .notNull()
    .references(() => client.id),
  user_id: text('user_id').notNull(),
  code: text('code').notNull().unique(),
  code_expires_at: int('code_expires_at', { mode: 'timestamp_ms' }).notNull(),
  code_used: int('code_used', { mode: 'boolean' }).notNull(),
  redirect_uri: text('redirect_uri'),
  access_token: text('access_token').notNull().unique(),
  access_token_expires_at: int('access_token_expires_at', {
    mode: 'timestamp_ms',
  }).notNull(),
})

export const tokenScope = sqliteTable(
  'token_scope',
  {
    token_id: int('token_id', { mode: 'number' })
      .notNull()
      .references(() => token.id),
    scope_id: int('scope_id', { mode: 'number' })
      .notNull()
      .references(() => scope.id),
  },
  table => ({
    pk: primaryKey({ columns: [table.token_id, table.scope_id] }),
  }),
)

// ---------- Relations ---------- //

export const clientRelations = relations(client, ({ many }) => ({
  secrets: many(clientSecret),
  callbacks: many(clientCallback),
  scopes: many(clientScope),
}))

export const clientSecretRelations = relations(clientSecret, ({ one }) => ({
  client: one(client, {
    fields: [clientSecret.client_id],
    references: [client.id],
  }),
}))

export const clientCallbackRelations = relations(clientCallback, ({ one }) => ({
  client: one(client, {
    fields: [clientCallback.client_id],
    references: [client.id],
  }),
}))

export const scopeRelations = relations(scope, ({ many }) => ({
  clients: many(clientScope),
  tokens: many(tokenScope),
}))

export const clientScopeRelations = relations(clientScope, ({ one }) => ({
  client: one(client, {
    fields: [clientScope.client_id],
    references: [client.id],
  }),
  scope: one(scope, {
    fields: [clientScope.scope_id],
    references: [scope.id],
  }),
}))

export const tokenRelations = relations(token, ({ one, many }) => ({
  client: one(client, {
    fields: [token.client_id],
    references: [client.id],
  }),
  scopes: many(tokenScope),
}))

export const tokenScopeRelations = relations(tokenScope, ({ one }) => ({
  token: one(token, {
    fields: [tokenScope.token_id],
    references: [token.id],
  }),
  scope: one(scope, {
    fields: [tokenScope.scope_id],
    references: [scope.id],
  }),
}))

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
    userId: text('user_id').notNull(),
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
