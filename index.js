const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");

const app = express();

app.use(cors());
app.use(express.json());

const auth = new google.auth.GoogleAuth({
  keyFile: "./credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const SPREADSHEET_ID = "1untMNCZnpPhdVL-8HizNXx_wxtgkk5ovGKcNCJWGw6w";

app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    const client = await auth.getClient();

    const sheets = google.sheets({
      version: "v4",
      auth: client,
    });

    // Get all existing rows
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:F",
    });

    const rows = response.data.values || [];

    // Create headers if sheet is empty
    if (rows.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: "Sheet1!A1:F1",
        valueInputOption: "RAW",
        requestBody: {
          values: [[
            "S.No",
            "Name",
            "Email",
            "Phone",
            "Message",
            "Submitted At"
          ]]
        }
      });
    }

    // Header row is row 1, so serial starts from 1
    const serialNo = rows.length === 0 ? 1 : rows.length;

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:F",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          serialNo,
          name,
          email,
          phone || "",
          message || "",
          new Date().toLocaleString("en-IN")
        ]]
      }
    });

    res.status(200).json({
      success: true,
      message: "Form submitted successfully",
      serialNo
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.get("/", (req, res) => {
  res.send("API Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});