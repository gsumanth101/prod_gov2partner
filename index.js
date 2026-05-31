const express = require("express");
const cors = require("cors");

require("dotenv").config();

const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
  credentials: {
    type: process.env.TYPE,
    project_id: process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    private_key: process.env.PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.CLIENT_EMAIL,
    client_id: process.env.CLIENT_ID,
    auth_uri: process.env.AUTH_URI,
    token_uri: process.env.TOKEN_URI,
    auth_provider_x509_cert_url:
      process.env.AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url:
      process.env.CLIENT_X509_CERT_URL,
    universe_domain: process.env.UNIVERSE_DOMAIN,
  },
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
  ],
});

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;

const app = express();

/* -------------------------------------------------------------------------- */
/*                                MIDDLEWARE                                  */
/* -------------------------------------------------------------------------- */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: "*",
  })
);

/* -------------------------------------------------------------------------- */
/*                            GOOGLE SHEETS CONFIG                             */
/* -------------------------------------------------------------------------- */

// const auth = new google.auth.GoogleAuth({
//   keyFile: "./credentials.json",
//   scopes: ["https://www.googleapis.com/auth/spreadsheets"],
// });


/* -------------------------------------------------------------------------- */
/*                              HEALTH CHECK                                  */
/* -------------------------------------------------------------------------- */

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "API Running Successfully",
  });
});

/* -------------------------------------------------------------------------- */
/*                             CONTACT FORM API                               */
/* -------------------------------------------------------------------------- */

app.post("/", async (req, res) => {
  try {
    const { name, email, phone, message, siteName } = req.body;

    if (!name || !email || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const client = await auth.getClient();

    const sheets = google.sheets({
      version: "v4",
      auth: client,
    });

    /* ----------------------------- Get Existing ---------------------------- */

    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:F`,
    });

    let rows = existingData.data.values || [];

    /* ----------------------------- Create Header --------------------------- */

    if (rows.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1:G1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [
            [
              "S.No",
              "Name",
              "Email",
              "Phone",
              "Message",
              "siteName",
              "Submitted At",
            ],
          ],
        },
      });

      rows = [
        [
          "S.No",
          "Name",
          "Email",
          "Phone",
          "Message",
          "siteName",
          "Submitted At",
        ],
      ];
    }

    /* ------------------------------ Serial No ----------------------------- */

    const serialNo = rows.length;

    /* ----------------------------- Insert Row ----------------------------- */

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:G`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [
          [
            serialNo,
            name,
            email,
            phone || "",
            message || "",
            siteName || "",
            new Date().toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            }),
          ],
        ],
      },
    });

    return res.status(200).json({
      success: true,
      message: "Form submitted successfully",
      serialNo,
    });
  } catch (error) {
    console.error("Google Sheet Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
});

/* -------------------------------------------------------------------------- */
/*                               404 HANDLER                                  */
/* -------------------------------------------------------------------------- */

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* -------------------------------------------------------------------------- */
/*                              START SERVER                                  */
/* -------------------------------------------------------------------------- */

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});