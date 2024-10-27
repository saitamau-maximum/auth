import { defineConfig } from '@pandacss/dev'

export default defineConfig({
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ['./app/**/*.{js,jsx,ts,tsx}'],

  // Files to exclude
  exclude: [],

  // Useful for theme customization
  theme: {
    extend: {
      tokens: {
        gradients: {
          primary: {
            value: {
              type: 'linear',
              placement: 'to left top',
              stops: [
                { color: '#62c077', position: 0 },
                { color: '#34aa8e', position: 100 },
              ],
            },
          },
        },
        colors: {
          primary: {
            value: '#4bb583',
          },
        },
      },
    },
  },

  // The output directory for your css system
  outdir: 'styled-system',
})
