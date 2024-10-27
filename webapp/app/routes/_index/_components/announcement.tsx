import { css } from '@styled-system/css'

export const Announcement = () => {
  return (
    <div
      className={css({
        display: 'grid',
        placeItems: 'center',
        height: '100dvh',
        width: '100vw',
      })}
    >
      <div
        className={css({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        })}
      >
        <h1
          className={css({
            fontSize: '4xl',
            fontWeight: 'bold',
            color: 'text',
          })}
        >
          Maximum Auth
        </h1>
        <p>Aggregated Authentication Platform of Maximum</p>
        <p>認証が必要なサイトからアクセスしてください。</p>
      </div>
    </div>
  )
}
