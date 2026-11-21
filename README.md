# Karya

A simple todo app in plain HTML, CSS and JavaScript.

- **My tasks**: a personal list (due dates, progress, edit, delete). Saved in your own browser.
- **Team**: one shared project board (To do / In progress / Done) with teammates, assignees and a progress bar.

No login for anyone. A manager view and multi-team projects can be added later.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page |
| `style.css` | All styling (light and dark mode) |
| `app.js` | All behaviour |
| `api/team.js` | Vercel serverless function that stores the shared team board in Neon |
| `schema.sql` | Optional. The tables are created automatically, so you can ignore this |
| `package.json` | Lists the one dependency (`@neondatabase/serverless`) |

## Deploy on Vercel

1. Put this folder in a GitHub repository (or run `vercel` from inside the folder with the Vercel CLI).
2. On vercel.com choose **Add New → Project** and import it.
3. Set **Framework Preset** to **Other**. Leave Build Command and Output Directory empty.
4. Click **Deploy**.

After step 4 the site works. Personal tasks work for everyone. The Team board also works,
but it is saved **on each person's own device** until you connect the database below.

## Share the team board with everyone (Neon)

1. In your Vercel project open **Storage** (or the **Marketplace**), choose **Neon**, and create a database.
   The free plan is plenty.
2. Connect it to this project. Vercel adds `DATABASE_URL` to the project's environment variables for you.
   If you created the database on neon.tech instead, copy its connection string and add it
   in Vercel under **Settings → Environment Variables** as `DATABASE_URL`.
3. **Redeploy** (Deployments → the latest one → Redeploy).

Open the Team tab. The "saved on this device only" note disappears and everyone sees the same board.
It refreshes itself every few seconds. The three tables the app needs (`doable_meta`,
`doable_members`, `doable_tasks`) are created automatically the first time the board loads.

## Try it on your computer

- Quick look: double-click `index.html`. Everything works in device-only mode.
- With the shared board: run `npm install`, add `DATABASE_URL` to a `.env` file, and run `vercel dev`.

## Good to know

- There is no login yet, so anyone who has your link can change the team board.
  Share the link only with your team until the manager login is added.
- Personal tasks never leave your browser. Clearing the browser's site data deletes them.
- Internal names still say `doable` (the `doable_*` database tables and the `doable.*` browser storage keys). They are kept on purpose so nothing already saved is lost; users never see them.
- To start the team board fresh, run `DROP TABLE doable_tasks, doable_members, doable_meta;`
  in the Neon SQL Editor. The tables are recreated empty on the next load.
