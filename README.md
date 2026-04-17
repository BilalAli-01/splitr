# Splitr

A mobile-first group event cost splitting app for Australia. Organisers create an event, share a link, and participants know exactly how much to send via PayID — no payment processing needed.

## Features

- Create events with a total cost split across any number of people
- Shareable join link for participants
- Participants can add multiple names in one go (e.g. booking for a friend)
- Organisers can mark participants as paid/unpaid, remove duplicates, and edit event details
- Configurable leave restrictions (anytime, 1/3/7 days before, or never)
- Account-based access — organisers see all their events in one place
- Close events when complete — kept as a read-only record
- Mobile-first design

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com) (Postgres database + Auth)

## Local development

**1. Clone and install**
```bash
git clone https://github.com/BilalAli-01/splitr.git
cd splitr
npm install
```

**2. Set up environment variables**

Create a `.env.local` file in the root:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_key
```

**3. Configure Supabase Auth**

In Supabase → Authentication → URL Configuration:
- Set Site URL to `http://localhost:3000`
- Add `http://localhost:3000/auth/callback` to Redirect URLs

**4. Run the dev server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Hosted on [Vercel](https://vercel.com). Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables in Vercel project settings, and add your Vercel production URL to Supabase's allowed redirect URLs.
