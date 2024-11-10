// saitamau-maximum/id の db/schema.ts 参照
interface IUserInfo {
  id: string
  displayName: string
  profileImageUrl: string
}

export class IdpRepository {
  private readonly db: D1Database

  constructor(db: D1Database) {
    this.db = db
  }

  async findUserById(id: string): Promise<IUserInfo | null> {
    return await this.db
      .prepare('SELECT * FROM user WHERE id = ?')
      .bind(id)
      .first()
  }
}
