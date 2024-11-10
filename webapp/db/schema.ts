/* eslint-disable sort-exports/sort-exports */
import { relations } from 'drizzle-orm'
import { int, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const oauthClient = sqliteTable('oauth_client', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  logo_url: text('logo_url'),
  owner_id: text('owner_id').notNull(),
})

export const oauthClientSecret = sqliteTable(
  'oauth_client_secret',
  {
    client_id: text('client_id')
      .notNull()
      .references(() => oauthClient.id),
    secret: text('secret').notNull(),
    description: text('description'),
    issued_by: text('issued_by').notNull(),
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
  user_id: text('user_id').notNull(),
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

export const oauthClientRelations = relations(oauthClient, ({ many }) => ({
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
