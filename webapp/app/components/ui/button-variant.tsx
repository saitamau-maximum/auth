import { cva } from '@styled-system/css'

interface Props {
  variant: 'primary' | 'secondary'
  children: React.ReactNode
}

const buttonVariants = cva({
  base: {
    width: '100%',
    padding: 3,
    rounded: 'full',
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: 'md',
    _hover: {
      opacity: 0.8,
    },
  },
  variants: {
    style: {
      primary: {
        bgGradient: 'primary',
        color: 'white',
      },
      secondary: {
        bg: 'white',
        color: 'primary',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'primary',
      },
    },
  },
})

export const ButtonVariant = ({ variant, children }: Props) => {
  return <span className={buttonVariants({ style: variant })}>{children}</span>
}
