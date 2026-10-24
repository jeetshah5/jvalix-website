# Jvalix — GitHub Pages + Render deployment

This package is split for production:

- **Frontend:** GitHub Pages (static `index.html`)
- **Backend:** Render (`backend/` Node/Express API)
- **Domain:** Your GoDaddy domain pointed to GitHub Pages
- **Email:** Gmail SMTP using a Google App Password

## 1. Deploy the backend to Render

Create a Render **Web Service** from this repository.

- Root Directory: `backend`
- Runtime: Node
- Build Command: `npm install`
- Start Command: `npm start`

Add these environment variables in Render:

- `GMAIL_USER` = your Gmail address
- `GMAIL_APP_PASSWORD` = your 16-character Gmail App Password
- `OWNER_EMAIL` = where new leads should arrive
- `FRONTEND_ORIGIN` = `https://YOUR-DOMAIN.com,https://www.YOUR-DOMAIN.com`

After deploy, test:

`https://YOUR-RENDER-SERVICE.onrender.com/health`

It should return JSON containing `"ok":true`.

## 2. Set the frontend API URL

Open the root `index.html` and find:

`window.API_BASE = "https://YOUR-JVALIX-BACKEND.onrender.com";`

Replace it with the actual Render URL, for example:

`window.API_BASE = "https://jvalix-api.onrender.com";`

Do not put Gmail credentials in `index.html`.

## 3. Deploy the frontend to GitHub Pages

Push this repository to GitHub. Enable **Settings → Pages → Deploy from a branch**, using the branch containing `index.html` at the repository root.

## 4. Connect the GoDaddy domain

In GoDaddy DNS, add the GitHub Pages records shown by GitHub under **Settings → Pages → Custom domain**. GitHub may show the exact A/AAAA/CNAME values for your account, so use those values rather than guessing.

Then enter your domain in GitHub Pages and enable **Enforce HTTPS** once DNS has propagated.

## 5. Update CORS

Once the domain is known, set `FRONTEND_ORIGIN` in Render to the exact production origins, e.g.:

`https://jvalix.com,https://www.jvalix.com`

Redeploy the backend after changing it.

## 6. Test the complete flow

1. Open the production domain.
2. Open Schedule consultation.
3. Fill every field.
4. Submit.
5. Confirm the browser shows the thank-you message.
6. Confirm the lead email arrives at `OWNER_EMAIL`.
7. Confirm the confirmation email arrives at the submitted email address.

### Important

GitHub Pages cannot run `server.js`. The frontend and backend must remain separate, which is why this package contains a root static frontend and a `backend/` directory for Render.
