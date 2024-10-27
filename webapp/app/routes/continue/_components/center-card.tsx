import { css } from '@styled-system/css'

interface Props {
  children: React.ReactNode
}

export const CenterCard = ({ children }: Props) => {
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
          bg: 'transparent',
          boxShadow: 'none',
          lg: {
            bg: 'white',
            px: 24,
            py: 24,
            boxShadow: 'xl',
            rounded: '2xl',
          },
        })}
      >
        {children}
      </div>
    </div>
  )
}
