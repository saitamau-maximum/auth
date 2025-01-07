/* eslint-disable sort-exports/sort-exports */
// saitamau-maximum/id の db/schema.ts 参照
export interface IUserInfo {
  id: string
  display_name: string
  profile_image_url: string | null
}

type ImplementedGetters = 'userById'
type ImplementedInserters = 'user'

export class IdpRepository {
  private readonly db: D1Database
  private readonly getStmt: Record<ImplementedGetters, D1PreparedStatement>
  private readonly insertStmt: Record<ImplementedInserters, D1PreparedStatement>

  constructor(db: D1Database) {
    this.db = db
    this.getStmt = {
      userById: db.prepare('SELECT * FROM user WHERE id = ?'),
    }
    this.insertStmt = {
      user: db.prepare(
        'INSERT INTO user (id, display_name, profile_image_url) VALUES (?, ?, ?)',
      ),
    }
  }

  async findUserById(id: string): Promise<IUserInfo | null> {
    return await this.getStmt.userById.bind(id).first()
  }

  async createUserWithOauth(user: IUserInfo): Promise<boolean> {
    // Cloudflare D1 での transaction はサポートされてないっぽいので Batch する (ググるといろいろ出てくる)
    const res = await this.insertStmt.user
      .bind(user.id, user.display_name, user.profile_image_url)
      .run()
    return res.success
  }
}
