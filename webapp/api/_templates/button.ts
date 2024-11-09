import { html } from 'hono/html'

const buttonVariants = {
  primary:
    'bg-green-600 border-green-600 text-white hover:bg-white hover:text-green-600 transition-colors',
  secondary:
    'bg-white border-green-600 text-green-600 hover:bg-green-600 hover:text-white transition-colors',
} as const

type Attributes = Record<string, string>

interface ButtonProps {
  text: string
  variant?: keyof typeof buttonVariants
  attributes?: Attributes
}

const flattenAttributes = (attributes: Attributes) =>
  Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')

export const _Button = ({
  text,
  variant = 'primary',
  attributes,
}: ButtonProps) => html`
  <button
    class="px-4 py-2 rounded-lg font-bold focus:outline-none border-2 w-full ${buttonVariants[
      variant
    ]}"
    ${attributes ? flattenAttributes(attributes) : ''}
  >
    ${text}
  </button>
`
