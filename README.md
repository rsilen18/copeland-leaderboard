# Copeland Leaderboard

A lightweight group expense tracking and splitting app. Hosted on GitHub Pages with a Google Sheets backend — no server required.

## Features

- Add shared expenses with descriptions, amounts, and locations
- Split costs using predefined ratio-based schemes or custom weights
- See who owes what at a glance
- Automatic monthly email summaries
- All data lives in a Google Sheet for easy review
- Mobile-friendly

## Architecture

```
GitHub Pages (static site)  -->  Google Apps Script (API)  -->  Google Sheets (data)
```

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | HTML/CSS/JS | UI served via GitHub Pages |
| Backend | Google Apps Script | REST API + monthly email trigger |
| Database | Google Sheets | Stores expenses, members, schemes, config |
| Auth | Shared PIN | Validated server-side on every request |

## Setup

### 1. Create the Google Sheet

Create a new spreadsheet with these 4 tabs:

**`Config`** (no header row)
| Key | Value |
|-----|-------|
| PIN | *your shared secret* |
| GROUP_NAME | *e.g., Copeland Leaderboard* |
| CURRENCY | $ |
| SHEET_URL | *this spreadsheet's URL* |

**`Members`** (header row + data)
| Name | Email | Active |
|------|-------|--------|
| Alice | alice@gmail.com | TRUE |
| Bob | bob@gmail.com | TRUE |

**`WeightSchemes`** (header row + data)
| SchemeName | MemberWeights |
|------------|---------------|
| Equal | {"Alice":1,"Bob":1} |
| Rent-based | {"Alice":2,"Bob":1} |

> Keys in the JSON must exactly match names in the Members tab.
> Use weight `0` to exclude someone from a scheme by default.

**`Expenses`** (header row only — app fills in data)
| ID | Date | Description | Amount | PaidBy | SplitScheme | SplitMembers | CreatedAt | CreatedBy | Month | Location | CustomWeights |

### 2. Deploy Google Apps Script

1. Open the spreadsheet > **Extensions > Apps Script**
2. Delete the default code
3. Create files matching each `.gs` file in the `apps-script/` folder:
   - `Code.gs` — request routing
   - `Auth.gs` — PIN validation
   - `Config.gs` — sheet reading helpers
   - `Expenses.gs` — CRUD operations
   - `Balance.gs` — balance calculation
   - `Email.gs` — monthly email trigger
4. **Deploy > New deployment > Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Advanced > Go to (project name) > Allow** when prompted
6. Copy the Web App URL

### 3. Configure the Frontend

Open `js/api.js` and set the `API_BASE_URL` to your Web App URL.

### 4. Set Up Monthly Email

1. In the Apps Script editor, select `createMonthlyTrigger` from the function dropdown
2. Click **Run**
3. Emails will be sent on the 28th of each month

### 5. Deploy to GitHub Pages

1. Push this repo to GitHub
2. **Settings > Pages > Source**: deploy from `main` branch, `/ (root)` folder
3. Site goes live at `https://<username>.github.io/<repo-name>/`

## Usage

1. Open the site
2. Enter the group PIN
3. Select your name
4. Add expenses with the "+ Add Expense" button
5. View the expense list and balance summary
6. Navigate months with the arrow buttons

## Weight Schemes

Schemes use **ratios**, not percentages. Example:

```json
{"Alice": 2, "Bob": 1, "Charlie": 1}
```

- Total weight = 4
- Alice pays 50% (2/4)
- Bob pays 25% (1/4)
- Charlie pays 25% (1/4)

Set a weight to `0` to exclude that person from the scheme by default.

You can also choose **"Custom"** when adding an expense to enter one-off weights.

## Updating the App

**Frontend changes:** Push to GitHub — Pages redeploys automatically.

**Apps Script changes:** Paste updated `.gs` files into the editor, then:
- **Deploy > Manage deployments > Edit (pencil icon) > New version > Deploy**

This updates the same URL. No frontend change needed.

## File Structure

```
├── index.html              # Single-page app
├── css/style.css           # Styles (responsive)
├── js/
│   ├── api.js              # Fetch wrapper + API URL config
│   ├── app.js              # View switching, initialization
│   ├── auth.js             # Two-step login (PIN + name)
│   ├── balance.js          # Balance display
│   └── expenses.js         # Expense list, add/edit/delete, split preview
├── apps-script/            # Backend (copy into Apps Script editor)
│   ├── Code.gs
│   ├── Auth.gs
│   ├── Config.gs
│   ├── Expenses.gs
│   ├── Balance.gs
│   └── Email.gs
└── README.md
```
