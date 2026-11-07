# Setup checklist (things you do by hand)

Goal of milestone 1: you send **"Hola A"** from your phone to the WhatsApp test number and the coach answers.

Plan for about **2–3 hours** the first time. Do the steps in order. Each step says exactly where each value goes.
Meta, Supabase and Vercel sometimes rename menu items; if a label doesn't match exactly, look for the closest one.

**Where values go**

- **Vercel**: Project → Settings → Environment Variables. This is what the live app uses.
- **`.env.local`**: only for running on your own computer (optional). Copy `.env.example` to `.env.local`. Never commit `.env.local`, it's in `.gitignore`.

---

## 0. Accounts you need

- [ ] GitHub (you have it)
- [ ] [Anthropic Console](https://console.anthropic.com), for the Claude API
- [ ] [Supabase](https://supabase.com)
- [ ] [Vercel](https://vercel.com). Sign in with GitHub.
- [ ] [Meta for Developers](https://developers.facebook.com), with your Facebook account, plus a Meta Business portfolio (created during step 4 if you don't have one)
- [ ] [Stripe](https://stripe.com). Not needed until milestone 3.

> **Vercel plan:** the free Hobby plan is for non-commercial use only. Testing on Hobby is fine. Once you charge users, upgrade the project to **Pro**.

---

## 1. Anthropic (Claude): 5 min

1. console.anthropic.com → **Settings → Billing**: add a card and some credit (US$5–10 is plenty for testing).
2. **API Keys → Create Key**, name it `whatsapp-coach`, and copy it. It starts with `sk-ant-`.

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | the key you just copied |

The models are already set in code: `claude-haiku-5-5` for chat (fast and cheap) and `claude-sonnet-5-5` for food photos (good vision at half the price of Opus). Leave `CLAUDE_CHAT_MODEL` and `CLAUDE_VISION_MODEL` unset unless you want to change them.

---

## 2. Supabase: 15 min

1. **New project**. Name: `whatsapp-coach`. Choose a strong database password and save it in your password manager.
   **Region: East US (North Virginia)**. Vercel runs in the same area by default, which keeps things fast.
2. Wait about 2 minutes until the project is ready.
3. Left menu → **SQL Editor → New query**. Open `supabase/migrations/0001_init.sql` from this repo, copy **all** of it, paste it, and click **Run**. You should see "Success. No rows returned".
   Then do the same with `supabase/migrations/0002_costs_and_limits.sql` and `supabase/migrations/0003_photos_private.sql`, each in a **new query**, in that order.
4. Check: **Table Editor** shows `users`, `messages`, `photos`, `meals`, `workouts`, `weights`, `subscriptions` and `deletion_log`. **Storage** shows a bucket named `photos` marked **Private**.
5. **Project Settings → Data API**: copy the **Project URL**.
6. **Project Settings → API Keys**: copy the **secret** key (`sb_secret_…`). If you only see the "Legacy" tab, copy the **service_role** key instead.

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | the secret / service_role key |

> ⚠️ This key bypasses all security rules. Only put it in Vercel and in `.env.local`, never in front-end code or anywhere public.

---

## 3. Vercel (first deploy): 15 min

You need a public URL before Meta can send you messages, so deploy first. Meta keys come next.

1. Merge this milestone's branch into `main` on GitHub. Ask me and I'll open the pull request. Vercel deploys `main` as production.
2. vercel.com → **Add New… → Project** → import `AI-WhatsApp-Coach`. Framework: **Next.js**, detected automatically.
3. Before clicking Deploy, open **Environment Variables** and add:

| Variable | Value for now |
|---|---|
| `ANTHROPIC_API_KEY` | from step 1 |
| `SUPABASE_URL` | from step 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | from step 2 |
| `WHATSAPP_VERIFY_TOKEN` | **make up** a long random phrase, e.g. `coach-verifica-8f3k2m9q`. Write it down. |
| `WHATSAPP_ACCESS_TOKEN` | `pendiente` (temporary placeholder) |
| `WHATSAPP_PHONE_NUMBER_ID` | `pendiente` |
| `WHATSAPP_APP_SECRET` | `pendiente` |

4. Click **Deploy**. When it finishes, copy your production URL, e.g. `https://ai-whatsapp-coach.vercel.app`.
5. Check: open `https://YOUR-URL/` and you should see "Coach de nutrición con IA".

> Use the **production** URL (`*.vercel.app` without random letters) for Meta. Preview URLs are protected by Vercel login, so Meta can't reach them.

---

## 4. Meta / WhatsApp Cloud API: 45–60 min

### 4a. Create the app
1. developers.facebook.com → **My Apps → Create App**.
2. Use case: **"Connect with customers through WhatsApp"**. If you don't see it, choose **Other → Business**.
3. Pick or create your **Business portfolio**, then **Create app**.
4. Inside the app, open **WhatsApp → API Setup** (also called "Getting started" or "Quickstart").

### 4b. Test number and your phone
On the **API Setup** page:
1. Meta gives you a free **test phone number** in the "From" field.
2. Under **"To" → Manage phone number list**, add **your own WhatsApp number** and type the code WhatsApp sends you.
   Enter it with the country code, e.g. `+52` + 10 digits for Mexico (**without** the extra `1`), `+57` for Colombia, `+1` for the US.
3. Copy:

| Variable | Where on the page |
|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | "Phone number ID". This is a long ID number, **not** the phone number. |
| `WHATSAPP_ACCESS_TOKEN` | click **Generate access token**. ⚠️ It expires after 24 h (see 4e for a permanent one). |

### 4c. App secret
**App settings → Basic → App secret → Show** (asks for your Facebook password).

| Variable | Value |
|---|---|
| `WHATSAPP_APP_SECRET` | the App secret |

### 4d. Put the Meta values in Vercel, then redeploy
1. Vercel → your project → **Settings → Environment Variables**: replace the three `pendiente` values with the real ones.
2. **Deployments → ⋯ on the latest one → Redeploy**. Environment variable changes only take effect after a redeploy.

### 4e. Connect the webhook
1. Meta app → **WhatsApp → Configuration** → **Webhook → Edit**.
2. **Callback URL**: `https://YOUR-URL/api/whatsapp/webhook`
3. **Verify token**: exactly the same text as your `WHATSAPP_VERIFY_TOKEN`.
4. Click **Verify and save**. If it fails, see Troubleshooting.
5. Under **Webhook fields → Manage**, turn on **messages** (Subscribe).

---

## 5. ✅ Test it (milestone 1 done)

From **your phone** (the number you verified in 4b), send a WhatsApp message to the **test number**:

| You send | The coach should answer |
|---|---|
| `Hola A` | Welcome message, says it's a *coach de nutrición con IA* and not a nutriólogo, asks your age |
| `30` | Asks for consent to store health data → reply ACEPTO |
| `ACEPTO` | Asks you to choose a personality (1, 2 or 3) |
| `3` | "¡Listo! Voy a ser tu coach en modo balanceado…" |
| `¿Qué puedo desayunar alto en proteína?` | An AI answer in Spanish, with foods from your country |
| a photo of food | "📸 *Estimación aproximada*" with a calorie range and the estimate disclaimer |
| a voice note | Asks you to type it (voice notes come later) |
| `BORRAR MIS DATOS` then `CONFIRMO BORRAR` | Deletes everything; check in Supabase that your row is gone |

Check in **Supabase → Table Editor → users**: your row has `audience_code = A`, `age = 30`, `health_consent_at` filled in, and `onboarding_step = done`.

More checks worth doing:
- Use a second WhatsApp number (add it in 4b) and answer `16` to the age question. You should be blocked, and you get no AI replies after that.
- Send `estoy embarazada`. You should get the "consult a professional" notice, and the user's `restricted_mode` turns `true`.

**To start again from zero** with your number: send `BORRAR MIS DATOS` → `CONFIRMO BORRAR`, then `Hola B`.

---

## 6. Permanent access token (do this once it works)

The token from 4b dies after 24 h. Replace it with one that doesn't expire:

1. business.facebook.com → **Settings → Users → System users → Add**. Name: `whatsapp-coach-bot`, role: **Admin**.
2. Select the system user → **Assign assets**:
   - **Apps** → your app → **Full control**
   - **WhatsApp accounts** → your WhatsApp account → **Full control**
3. **Generate new token** → choose your app → expiration **Never** → permissions `whatsapp_business_messaging` and `whatsapp_business_management` → Generate.
4. Paste it into Vercel as `WHATSAPP_ACCESS_TOKEN`, then **Redeploy**.

---

## 7. Stripe (prep for milestone 3, optional now)

Use **Test mode** (toggle at the top) until launch.

1. **Product catalog → Add product**: name "Coach de nutrición con IA".
   - Price 1: **199.00 MXN**, recurring, **monthly**
   - **Add another price**: **1,490.00 MXN**, recurring, **yearly**
   - Don't set a trial on the price. The 3-day trial with required card will be set in code at checkout (milestone 3).
2. Open each price and copy its ID (`price_…`).
3. **Developers → API keys → Secret key** (`sk_test_…`).

| Variable | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` |
| `STRIPE_PRICE_MONTHLY` | monthly price ID |
| `STRIPE_PRICE_YEARLY` | yearly price ID |
| `STRIPE_WEBHOOK_SECRET` | leave empty; we create the webhook in milestone 3 |

For **live** mode, Stripe México will ask for business details (RFC, CLABE bank account, ID). Start that early, because approval can take a few days.

---

## Optional: run on your computer

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local      # fill in the values
# put WHATSAPP_DRY_RUN=true in .env.local to print replies instead of sending them
npm run dev                     # terminal 1
npm run simulate -- "Hola A"    # terminal 2, then "30", "ACEPTO", "3", "¿qué ceno hoy?"
npm test                        # safety and parsing tests
```

The simulator signs messages like Meta does and uses a fake number (`5215500000000`). It needs real Supabase and Anthropic keys. The coach's replies appear in terminal 1.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Meta says **"The callback URL or verify token couldn't be validated"** | Verify token in Meta ≠ `WHATSAPP_VERIFY_TOKEN` in Vercel, or you didn't redeploy after setting it. Open `https://YOUR-URL/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=123` in a browser: it must show `123`. |
| Message sent, no reply | Vercel → project → **Logs**. "Invalid signature" = wrong `WHATSAPP_APP_SECRET`. "Missing or invalid environment variables: X" = add X and redeploy. Also check the **messages** webhook field is subscribed (4e). |
| Log shows WhatsApp error **131030** (not in allowed list) | Your number isn't in "Manage phone number list" (4b). The code already removes the extra `1` from Mexican numbers. |
| Log shows WhatsApp error **190** / "Session has expired" | The 24 h token expired. Do step 6. |
| Log shows Supabase error **relation "users" does not exist** | The migration didn't run. Repeat step 2.3. |
| Log shows Anthropic **401** / **credit balance** | Wrong `ANTHROPIC_API_KEY`, or no credits. |
| Still nothing reaches Vercel | In Meta, **WhatsApp → Configuration**: make sure the webhook shows your URL and "messages" is subscribed. Clicking **Test** on the "messages" row should show a `POST /api/whatsapp/webhook` request with status 200 in Vercel Logs (Meta's sample message is for a fake number, so the coach won't reply to it). |
