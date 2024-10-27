import { ComponentPropsWithoutRef } from 'react'

import { Link } from '@remix-run/react'

import { css, cx } from '@styled-system/css'

type Props = ComponentPropsWithoutRef<typeof Link>

export const Linkable = ({ children, className, ...rest }: Props) => {
  return (
    <Link
      {...rest}
      className={cx(
        className,
        css({
          display: 'contents',
        }),
      )}
    >
      {children}
    </Link>
  )
}
