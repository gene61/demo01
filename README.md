# Todo List PWA

A modern, responsive todo list Progressive Web App built with Next.js, TypeScript, and Tailwind CSS.

## Features

- ✅ Add, edit, and delete todos
- ✅ Mark todos as complete/incomplete
- ✅ Clear completed todos
- ✅ Local storage persistence
- ✅ Responsive design
- ✅ PWA capabilities (installable, offline support)
- ✅ Dark mode ready
- ✅ Statistics dashboard

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **PWA**: next-pwa
- **Deployment**: Vercel ready

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## PWA Features

This app is a Progressive Web App with:
- Installable on mobile and desktop
- Offline functionality
- Fast loading with service worker
- App-like experience

## Deployment



### Deploy on Vercel

The easiest way to deploy this app is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Vercel will automatically detect the Next.js app and deploy it

The app includes a `vercel.json` configuration file for optimal deployment settings.

### Manual Deployment

```bash
npm run build
npm start
```

## Project Structure

```
demo01/
├── src/
│   └── app/
│       ├── layout.tsx      # Root layout with PWA metadata
│       ├── page.tsx        # Main todo list component
│       └── globals.css     # Global styles
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── icon-192x192.svg    # App icons
│   └── icon-512x512.svg
├── next.config.ts          # Next.js + PWA configuration
└── vercel.json             # Vercel deployment config
```

## License

MIT
