# Put StudyBloom on Vercel for free

StudyBloom uses Vercel for the website and Supabase for your private login and cross-device data. Your OpenAI or ChatGPT account is not used for saving.

## 1. Create your free Supabase project

1. Go to `https://supabase.com/dashboard` and create a free project.
2. Open **SQL Editor**, choose **New query**, paste everything from `supabase/schema.sql`, and press **Run**.
3. Open **Project Settings → API** and keep this page available. You will copy the project URL, publishable/anon key, and service-role key in the next step.

## 2. Add the project to Vercel

1. Import this folder or its Git repository into a free Vercel Hobby project.
2. In **Settings → Environment Variables**, add these five values for Production, Preview, and Development:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable or anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role secret |
| `STUDYBLOOM_OWNER_EMAIL` | Your private email address |
| `OPENAI_API_KEY` | Optional; leave unset to keep AI API features off |

Never put the service-role key in a variable beginning with `NEXT_PUBLIC_`.

3. Deploy or redeploy the project.

## 3. Create your private StudyBloom login

1. Open the deployed site and press **Sign in** in the top bar.
2. Choose **First time here? Create your account**.
3. Use the same private email entered as `STUDYBLOOM_OWNER_EMAIL` and a password of at least eight characters.
4. If Supabase asks for email confirmation, confirm it and then sign in.
5. Sign into StudyBloom with that account on your computer, iPad, and phone.

Only the owner email can use the sync API. All devices keep a local offline copy and synchronize changes after reconnecting.

## Updating later

Upload the newer StudyBloom project to the same Vercel project or push it to the connected Git repository. Keep the same Supabase project and environment variables so your existing school data remains available.
