#🐝            https://demo01-six.vercel.app/
<br><br><br>
<img width="156" height="133" alt="image" src="https://github.com/user-attachments/assets/43145f4c-de06-4a3a-9b8a-83ffc80f5608" />
<br><br><br>

This is a PWA app that is powered by AI to recommend steps for your day-to-day tasks.

app main page:<br>
![image](https://github.com/user-attachments/assets/931e6ae2-959a-423f-b0f5-e3967effa49b)
<br><br><br>
task details page overview:<br>
![image](https://github.com/user-attachments/assets/8217c29d-757d-4e6d-8baf-57d27f5cba99)
<br><br><br>
task details page, chat with GoalBee🐝:<br>
![image](https://github.com/user-attachments/assets/6abc4694-eb3e-4a23-930a-98cd1fff742f)
<br><br><br>
task details page, generated steps by GoalBee🐝:<br>
![image](https://github.com/user-attachments/assets/3682fd7b-d271-4311-90ec-d0508d40fed9)
<br><br><br>
user will receive daily push notification if there is any task available:<br>
<img width="415" height="523" alt="image" src="https://github.com/user-attachments/assets/7e164871-a917-47b4-9dbb-487926a5b49e" />


A modern, responsive todo list Progressive Web App built with Next.js, TypeScript, and Tailwind CSS.

## Features

- ✅ Add, edit, and delete todos
- ✅ Mark todos as complete/incomplete
- ✅ Clear completed todos
- ✅ Local storage persistence
- ✅ Responsive design
- ✅ PWA capabilities (installable, offline support)

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
- App-like experience

## Deployment



### Deploy on Vercel

The easiest way to deploy this app is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Vercel will automatically detect the Next.js app and deploy it

The app includes a `vercel.json` configuration file for optimal deployment settings.



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
