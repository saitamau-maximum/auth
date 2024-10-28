import { css } from '@styled-system/css'

import { ButtonVariant } from '~/components/ui/button-variant'
import { Linkable } from '~/components/ui/linkable'

interface Props {
  user: {
    displayName?: string
    profileImage?: string
    isMember?: boolean
  }
  appName: string
  continueUrl: URL
  cancelUrl: URL
}

export const ProfileDisplay = ({
  user,
  continueUrl,
  cancelUrl,
  appName,
}: Props) => {
  return (
    <div
      className={css({
        display: 'flex',
        gap: 8,
        flexDirection: 'column',
        lg: {
          gap: 24,
          flexDirection: 'row',
        },
      })}
    >
      <div
        className={css({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          lg: {
            gap: 12,
          },
        })}
      >
        <img src='/logo.svg' alt='Maximum Logo' width={200} height={50} />
        <div
          className={css({
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            alignItems: 'center',
          })}
        >
          <img
            src={user.profileImage}
            alt='Profile'
            className={css({
              width: 100,
              height: 100,
              borderRadius: '50%',
              shadow: 'md',
            })}
          />
          <p>{user.displayName}</p>
        </div>
      </div>
      <div
        className={css({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          lg: {
            gap: 8,
          },
        })}
      >
        {user.isMember ? (
          <>
            <p>以下のサイトにログインします。</p>
            <div
              className={css({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                lg: {
                  gap: 2,
                },
              })}
            >
              <span
                className={css({
                  fontWeight: 'bold',
                  fontSize: 'xl',
                })}
              >
                {appName}
              </span>
              <span>({continueUrl.origin})</span>
            </div>
            <div
              className={css({
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                width: '160px',
              })}
            >
              <Linkable to={continueUrl.toString()}>
                <ButtonVariant variant='primary'>続ける</ButtonVariant>
              </Linkable>
              <Linkable to={cancelUrl.toString()}>
                <ButtonVariant variant='secondary'>やめる</ButtonVariant>
              </Linkable>
            </div>
          </>
        ) : (
          <>
            <p
              className={css({
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: 'lg',
              })}
            >
              Maximum メンバーではないため、
              <br />
              続行できません。
            </p>
            <p>このタブを閉じてください。</p>
          </>
        )}
      </div>
    </div>
  )
}
