const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");

const app = express();

/*
|--------------------------------------------------------------------------
| CORS - Allow All Origins
|--------------------------------------------------------------------------
*/
app.use(cors());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*
|--------------------------------------------------------------------------
| Google Sheets Auth
|--------------------------------------------------------------------------
*/
const auth = new google.auth.GoogleAuth({
  keyFile: "./credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const SPREADSHEET_ID =
  "1untMNCZnpPhdVL-8HizNXx_wxtgkk5ovGKcNCJWGw6w";

const SHEET_NAME = "Sheet1";

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API Running Successfully",
  });
});

/*
|--------------------------------------------------------------------------
| Contact Form API
|--------------------------------------------------------------------------
*/
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and Email are required",
      });
    }

    const client = await auth.getClient();

    const sheets = google.sheets({
      version: "v4",
      auth: client,
    });

    /*
    |--------------------------------------------------------------------------
    | Check Existing Data
    |--------------------------------------------------------------------------
    */
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:F`,
    });

    let rows = existingData.data.values || [];

    /*
    |--------------------------------------------------------------------------
    | Create Header Automatically
    |--------------------------------------------------------------------------
    */
    if (rows.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1:F1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [
            [
              "S.No",
              "Name",
              "Email",
              "Phone",
              "Message",
              "Submitted At",
            ],
          ],
        },
      });

      rows = [["S.No"]];
    }

    /*
    |--------------------------------------------------------------------------
    | Serial Number
    |--------------------------------------------------------------------------
    */
    const serialNo = rows.length;

    /*
    |--------------------------------------------------------------------------
    | Save Data
    |--------------------------------------------------------------------------
    */
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:F`,
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
    console.error("ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| Catch All Routes
|--------------------------------------------------------------------------
*/
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
