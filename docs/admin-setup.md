# Admin setup (one-off)

The admin at `/admin` lets the team publish stories. People log in with their own GitHub accounts, and Netlify handles the sign-in. Do these steps once, after the site is live on Netlify.

## 1. Create a GitHub OAuth app

1. Signed in to GitHub as the account that owns the repository (`twedex-web`), go to **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Fill in:
   - **Application name:** Gulf Youth Sport admin
   - **Homepage URL:** https://gulfyouthsport.com (the Netlify address is fine until the domain is connected)
   - **Authorization callback URL:** `https://api.netlify.com/auth/done`
3. Click **Register application**, then **Generate a new client secret**. Keep this page open for step 2.

## 2. Connect it to Netlify

1. In Netlify, open the site and go to **Project configuration → Security → OAuth**.
2. Under **Authentication providers**, click **Install provider**, choose **GitHub**, and paste the **Client ID** and **Client secret** from step 1.

Never paste the client secret into this repository or send it in chat.

## 3. Give each person access

1. Each person creates a free GitHub account at https://github.com/signup.
2. In the repository, go to **Settings → Collaborators → Add people** and invite their GitHub username with the **Write** role.
3. They accept the email invitation, then log in at `https://gulfyouthsport.com/admin` with **Login with GitHub**.

To remove someone, delete them from **Collaborators**. They lose access straight away.

## 4. Scheduled refresh for videos and galleries

The Videos and Photos tabs update when the site rebuilds. A scheduled job rebuilds every 6 hours once this is set:

1. **Project configuration → Build & deploy → Continuous deployment → Build hooks → Add build hook**. Name it "Scheduled refresh", branch `main`.
2. Copy the URL it creates, then go to **Project configuration → Environment variables → Add a variable**: key `BUILD_HOOK_URL`, value the URL.

Keep the hook URL out of the repository: anyone who has it can trigger builds.

## Trying the admin on your own computer

```
npm install
npm start          # the site, at http://localhost:8080
npm run cms        # in a second terminal: lets /admin edit local files without logging in
```

Then open http://localhost:8080/admin/ and click **Login**. Changes are saved as files on your computer only.
