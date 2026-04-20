# Splitr

**[splitrpay.vercel.app](https://splitrpay.vercel.app)**

A mobile-first web app for splitting group event costs in Australia. Create an event, share the link, and everyone knows exactly how much to send via PayID or bank transfer — no payment processing, no app download needed.

## How it works

1. **Create an account** and set up your event with a pricing mode, cost, and number of spots
2. **Share the join link** with your group
3. **Participants join** and see exactly how much they owe, with payment details to pay instantly
4. **Track payments** from your organiser dashboard — mark people as paid as money comes in
5. **Close the event** when done — it stays on record as a read-only summary

## Features

### Pricing modes
- **Split** — set a total cost and number of spots; cost per person is calculated automatically
- **Fixed** — set a flat per-person rate upfront; total adjusts to how many join
- **Flexible** — participants RSVP first, organiser confirms the exact amount after the event (great for variable turnout)

### For organisers
- Dashboard to track paid/unpaid, mark payments, add or remove participants
- Optional event details — location, start time, and duration
- Set custom payment amounts per participant (overrides the default split)
- Follow-up tool — compose a payment reminder with each person's name and amount outstanding, shareable via WhatsApp or copy-paste
- Confirm cost for Flexible events directly from the dashboard without going to the edit form
- Edit event details, payment methods, and pricing mode at any time
- Configurable leave restrictions — lock headcounts before the event date
- Close events when done; they stay as read-only records

### For participants
- Join with your name, or add extra names for friends you're bringing
- Add or remove people even after joining
- Clear payment instructions with PayID and bank transfer details
- Notify the organiser via WhatsApp or email after paying (if enabled by organiser)

### General
- Account-based auth — organisers own their events, no shared PINs needed
- Dark mode with system preference detection
- Works great on mobile

## Tech stack

- [Next.js](https://nextjs.org) (App Router)
- [Supabase](https://supabase.com) — database, auth, and row-level security
- [Tailwind CSS v4](https://tailwindcss.com)
- Deployed on [Vercel](https://vercel.com)
