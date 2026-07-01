# Handoff Guide — Host This Dashboard on Your Own GitHub

**For: Dr. Brancamp (rotation director).** No coding needed — everything here is done in a web browser. Plan for about **20 minutes**.

This guide moves the *Transfusion Medicine & Blood Bank Resident Reference* onto **your own** free GitHub account so it runs independently, under your control, with its own web link you can share with residents.

---

## What this actually is (30 seconds)

- It's a **self-contained website** — a set of files (mostly one `index.html` plus a small `assets` folder). There is **no server, no database, and no cost.**
- **GitHub** (a free file-hosting service used worldwide) can publish those files as a live web page for free. That feature is called **GitHub Pages**.
- Once the files live in *your* GitHub account and you switch Pages on, the site is **fully yours** — it does not depend on anyone else's account, and it keeps working even if the original copy goes away.

## What you'll have at the end

- ✅ A free GitHub account
- ✅ Your own copy of the project (a "repository")
- ✅ A live link like **`https://YOUR-USERNAME.github.io/REPO-NAME/`** to send residents
- ✅ The ability to edit the content yourself later

---

## Step 1 — Create a free GitHub account

1. Go to **[github.com](https://github.com)** → click **Sign up**.
2. Enter an email, a password, and a **username**. *(Tip: the username becomes part of your web address, so pick something clean like `brancamplab` or `hfpath-tm`.)*
3. Verify your email. Done.

*(Already have a GitHub account? Skip to Step 2.)*

---

## Step 2 — Get your own copy of the project

You have two ways. **Option A is the fastest.** Both leave you with an independent copy.

### Option A — "Fork" (2 clicks, recommended)

1. Sign in to GitHub, then open the source project:
   **https://github.com/omarzbaba/transfusion-medicine-resident-reference**
2. Click the **Fork** button (top-right). On the next screen click **Create fork**.
3. That's it — GitHub copies everything into **your** account at
   `https://github.com/YOUR-USERNAME/transfusion-medicine-resident-reference`.

> A fork is your own independent copy. It keeps working on its own; you can edit it freely.

### Option B — "Download and upload" (a completely fresh copy, no link back)

1. On the source project page, click the green **Code** button → **Download ZIP**. **Unzip** it on your computer.
2. In GitHub, click the **＋** (top-right) → **New repository**. Give it a name (e.g., `transfusion-medicine-reference`), choose **Public**, click **Create repository**.
3. On the new empty repo page, click the link **"uploading an existing file."**
4. Open the unzipped folder, select **everything inside it** (the `index.html` file, the `assets` folder, the `.md` files) and **drag it all** into the upload box. **Important: include the `assets` folder** — the tools won't work without it.
5. Scroll down and click **Commit changes**.

---

## Step 3 — Turn on the free website (GitHub Pages)

Do this in **your** repository (the one now in your account):

1. Click the **Settings** tab (top of the repo).
2. In the left menu, click **Pages**.
3. Under **Build and deployment**:
   - **Source:** *Deploy from a branch*
   - **Branch:** **`main`**, folder **`/ (root)`** → click **Save**.
4. Wait about **1 minute**, then refresh the page. A green banner shows your live address:
   **`https://YOUR-USERNAME.github.io/REPO-NAME/`**

Open that link — the dashboard should load. 🎉

---

## Step 4 — Share it with residents

Just send them the link from Step 3. It works on any computer or phone browser, with **no login**. Bookmark-friendly.

---

## Step 5 — Updating the content later (optional, no coding)

Everything is editable right on GitHub:

1. In your repo, click into the file you want to change.
2. Click the **pencil icon** (✏️ *Edit this file*, top-right of the file).
3. Change the text, scroll down, click **Commit changes**. The live site updates in ~1 minute.

**Which file holds what:**

| File | Contains |
|---|---|
| `index.html` | All the teaching content, wording, quiz questions, and the page itself. Use your browser's Find (Ctrl/Cmd-F) on the file to locate the text to change. |
| `assets/reference/refdata.js` | **The clinical reference data** — the MSBOS surgery list, ASFA table, platelet-approval and transfusion-reaction rules, reaction catalog. |
| `assets/reference/abo.data.js` | ABO donor prevalences (used for the donor-pool math). |
| `assets/reference/engine.js`, `reference.js`, `reference2.js` | The tool logic/screens. Usually no need to touch these. |

> ⚕️ **Clinical caution:** `refdata.js` and `abo.data.js` are the actual clinical knowledge (including the **HFHS MSBOS**, policy `PCR-PALM-TRM-5.050`). Review any change with the blood bank before residents rely on it. The dashboard is decision **support**, not a protocol — the attending / blood bank physician is always the final decision-maker.

---

## Independence & ownership

- Once **Pages is on in your repo**, the site is served entirely from **your** account. It does **not** depend on the original author's repository or account.
- **Add co-editors** anytime: **Settings → Collaborators → Add people** (e.g., a chief resident to help maintain content).
- **Keeping it current:** the MSBOS and ASFA content should be reviewed periodically against current policy/edition — just edit the data files as in Step 5.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Live link shows **404 / not found** | Wait 1–2 min after enabling Pages. Confirm **Settings → Pages → Source = `main` / root**. The main file must be named exactly **`index.html`**. |
| A reference **tab is blank** | The `assets` folder (with its `reference` subfolder) didn't upload. Re-upload it (Option B, step 4) so the folder structure is preserved. |
| A **change isn't showing** | Pages takes ~1 minute to rebuild. Then hard-refresh the page: **Ctrl/Cmd + Shift + R**. |
| Want to **preview without publishing** | Download the ZIP and just **double-click `index.html`** — the whole thing (including the tools) runs offline in your browser. |

---

## Optional extras

- **Custom web address:** Settings → Pages → *Custom domain* (if your IT can provide a subdomain).
- **Private / behind institutional login:** GitHub Pages on a private repo needs a paid GitHub plan; otherwise host the same files on your institution's intranet (it's just static files).

---

*Questions during setup? The original author can walk you through any step — but by design, day-to-day running and updating is entirely in your hands.*
