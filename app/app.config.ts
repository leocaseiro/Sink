export default defineAppConfig({
  title: 'Leo Caseiro',
  github: 'https://github.com/leocaseiro/Sink',
  coffee: '',
  twitter: '',
  telegram: '',
  description: 'Leo Caseiro - link shortener',
  image: 'https://leoc.au/og.png',
  previewTTL: 300, // 5 minutes
  slugRegex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i,
  reserveSlug: [
    'dashboard',
  ],
})
