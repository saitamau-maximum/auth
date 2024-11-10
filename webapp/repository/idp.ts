// saitamau-maximum/id の db/schema.ts 参照
interface IUserInfo {
  id: string
  displayName: string
  profileImageUrl: string | null
}
interface IOauthConnection {
  userId: string
  providerId: number
  providerUserId: string
  email: string | null
  name: string | null
  profileImageUrl: string | null
}

type ImplementedGetters = 'userById' | 'userIdByOauthId'
type ImplementedInserters = 'user' | 'oauthConnection'

export class IdpRepository {
  private readonly db: D1Database
  private readonly getStmt: Record<ImplementedGetters, D1PreparedStatement>
  private readonly insertStmt: Record<ImplementedInserters, D1PreparedStatement>

  constructor(db: D1Database) {
    this.db = db
    this.getStmt = {
      userById: db.prepare('SELECT * FROM user WHERE id = ?'),
      userIdByOauthId: db.prepare(
        'SELECT user_id FROM oauth_connection WHERE provider_id = ? AND provider_user_id = ?',
      ),
    }
    this.insertStmt = {
      user: db.prepare(
        'INSERT INTO user (id, display_name, profile_image_url) VALUES (?, ?, ?)',
      ),
      oauthConnection: db.prepare(
        'INSERT INTO oauth_connection (user_id, provider_id, provider_user_id, email, name, profile_image_url) VALUES (?, ?, ?, ?, ?, ?)',
      ),
    }
  }

  async findUserById(id: string): Promise<IUserInfo | null> {
    return await this.getStmt.userById.bind(id).first()
  }

  async getUserIdByGithubId(
    githubId: number,
  ): Promise<{ user_id: string } | null> {
    return await this.getStmt.userIdByOauthId
      .bind(1, githubId.toString())
      .first()
  }

  async createUserWithOauth(
    user: IUserInfo,
    oauthConn: IOauthConnection,
  ): Promise<boolean> {
    // Cloudflare D1 での transaction はサポートされてないっぽいので Batch する (ググるといろいろ出てくる)
    const res = await this.db.batch([
      this.insertStmt.user.bind(
        user.id,
        user.displayName,
        user.profileImageUrl,
      ),
      this.insertStmt.oauthConnection.bind(
        oauthConn.userId,
        oauthConn.providerId,
        oauthConn.providerUserId,
        oauthConn.email,
        oauthConn.name,
        oauthConn.profileImageUrl,
      ),
    ])
    return res.every(r => r.success)
  }
}
