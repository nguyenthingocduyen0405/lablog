# LABLOG

An open-source, gamified social journal for research labs. LABLOG helps members share daily progress, complete personal missions, build streaks, coordinate schedules, and stay connected through a playful team experience.

> **Tiếng Việt:** LABLOG là nhật ký nhóm nghiên cứu mã nguồn mở. Thành viên có thể chia sẻ tiến độ, hoàn thành nhiệm vụ, duy trì streak và theo dõi lịch chung.

## Features

- Email authentication and member profiles
- Custom character avatars
- Daily work updates and photo sharing
- Personal missions, scores, streaks, and reminders
- Reactions, comments, and notifications
- Shared team calendar and member availability
- Interactive lab tour and meeting room
- Row Level Security for member-owned data

## Tech stack

- Next.js 16 and React 19
- TypeScript and Tailwind CSS 4
- Supabase Auth, Postgres, Realtime, and Storage

## Getting started

### Prerequisites

- Node.js 20 or newer
- npm
- A free [Supabase](https://supabase.com/) project

### 1. Clone and install

```bash
git clone https://github.com/nguyenthingocduyen0405/lablog.git
cd lablog
npm install
```

### 2. Configure Supabase

Run the SQL files in `supabase/migrations` in filename order using the Supabase SQL Editor. The migrations create profiles, posts, missions, social interactions, notifications, reminders, and the public `post-images` bucket.

Copy the environment template:

```bash
cp .env.example .env.local
```

Add your Supabase project URL and publishable key:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

In **Supabase → Authentication → URL Configuration**, set the local Site URL to `http://localhost:3000`.

Never put a Supabase secret or service-role key in a `NEXT_PUBLIC_` variable or commit it to the repository.

### 3. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run lint` | Check code quality |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |

## Contributing

Community contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. You can report a bug, suggest a feature, improve documentation, or submit code.

By participating, you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md). Please report security issues according to [SECURITY.md](SECURITY.md), not through a public issue.

## License

LABLOG is available under the [MIT License](LICENSE). You may use, modify, and redistribute it, including in commercial projects, while retaining the license notice.
