# B2B Lead Finder

## Try it locally on Windows

You need Python, Node.js, and an Android phone with Expo Go (or an Android emulator).
The phone and computer should use the same Wi-Fi network.

1. Revoke any Groq key previously shared in chat, then create a fresh key at
   [console.groq.com/keys](https://console.groq.com/keys). Keep the new key
   private; do not send it to anyone or put it in `App.js`.
2. In PowerShell, go to this project and create your local settings file:

   ```powershell
   cd D:\web-scrap
   Copy-Item .env.example .env
   notepad .env
   ```

3. In `.env`, replace `GROQ_API_KEY` with your key. For `EXPO_PUBLIC_API_URL`,
   replace `192.168.0.110` with your computer's Wi-Fi IPv4 address. Find it by
   running `ipconfig` and looking under the Wi-Fi adapter for **IPv4 Address**.
   The URL should look like `http://192.168.1.42:8000`. For the standard Android
   emulator, use `http://10.0.2.2:8000` instead.
4. In the first PowerShell window, install the Python packages and start the backend:

   ```powershell
   python -m pip install -r requirements.txt
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   Leave this window running. Check `http://127.0.0.1:8000/health` in a browser;
   it should show `{"status":"ok"}`.
5. Open a second PowerShell window in `D:\web-scrap` and start Expo:

   ```powershell
   npm install
   npm start
   ```

   Scan the QR code with Expo Go. If Windows Firewall asks, allow access on your
   private network. On Android, you may need Expo Go's **Scan QR code** option.
6. Enter a product and countries (for example, `Silk cloth` and `UAE, South
   Africa`), then tap **Search Leads**. Allow a little time for the search.
   Use **Export to CSV** to share the results.

The `.env` file is local and ignored by Git. Expo only exposes variables prefixed
with `EXPO_PUBLIC_` to the app; the Groq key is read by the Python backend.
Do not share screenshots or logs that reveal your key.

The backend uses Groq's `openai/gpt-oss-120b` model by default. If needed, set
`GROQ_MODEL` in `.env` to another active model enabled for your account.

## GitHub APK builds (optional)

The GitHub Actions workflow is only needed to build an installable APK; it is
not needed to try the app using Expo Go. A working APK also needs the backend
deployed to a publicly reachable HTTPS URL. The local Wi-Fi address in `.env`
will not work for a phone outside your home network.

### 1. Put the project on GitHub

Create a GitHub repository and push this project to it. Do not upload `.env`;
it is excluded by `.gitignore`.

### 2. Deploy the backend to Render

In Render, choose **New → Blueprint**, connect the GitHub repository, and let
Render use its `render.yaml` file. When prompted, enter a **new, private**
`GROQ_API_KEY` in Render's environment settings. Do not use any key that was
previously posted in chat. Wait for the service to deploy, then open
`https://YOUR-SERVICE.onrender.com/health`. It must show `{"status":"ok"}`.

The Blueprint uses Render's Free plan for a first test. Free services sleep
after 15 minutes without traffic and can take about a minute to wake up. This is
fine for trying the app, but choose a paid plan if you need it to be ready
without cold starts.

### 3. Link the Expo project

Sign in at [expo.dev](https://expo.dev), create a project, and copy its project
ID. Create an Expo access token in your account settings.

### 4. Add GitHub Actions secrets

In the repository, open **Settings → Secrets and variables → Actions → New
repository secret** and add:

- `EXPO_TOKEN`: create an access token from your Expo account.
- `EXPO_PROJECT_ID`: the project ID from your EAS project.
- `EXPO_PUBLIC_API_URL`: the public HTTPS backend origin, for example
  `https://your-backend.example` (do not include `/health`).

### 5. Build and download the APK

Open the repository's **Actions** tab, choose **Build Android APK → Run
workflow**, and start it on `main`. The workflow waits for a sleeping Render
service to wake, checks `/health`, configures the API URL for EAS, validates the
Expo app, and builds the APK. Download it from the completed run's **Artifacts**
section. The Groq key belongs only in Render's environment; never add it to
GitHub or the mobile app.

The APK needs an internet-accessible backend. If the Render health check or EAS
build fails, open the failed workflow step for its error, then check the Render
service logs. No hosted build can be guaranteed before the real repository,
account credentials, and deployment have been tested.
