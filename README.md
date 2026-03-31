Text Layout Validation Dashboard

A clean, browser‑based dashboard for validating text layout accuracy across multiple fonts, sizes, and container widths.  
This tool compares browser‑rendered text height against a custom layout engine prediction, helping you detect mismatches, diagnose line‑breaking issues, and improve rendering consistency.

Ideal for:  
- UI/UX engineers  
- Font/layout engine developers  
- AI‑generated UI validation  
- Cross‑browser text rendering analysis  

---

🚀 Features

- Multi‑font, multi‑size, multi‑width sweep  
- Browser vs. engine height comparison  
- Detailed mismatch diagnostics  
- Per‑line comparison (ours vs. browser)  
- Clean, modern dashboard UI  
- No backend required — runs fully in the browser  
- Optional JSON report output  

---

📂 Project Structure

accuracy.html          → Dashboard UI  
accuracy.ts            → Validation logic  
src/layout.ts          → Layout prediction engine  
src/test-data.ts       → Text samples, sizes, widths  
diagnostic-utils.ts    → Line extraction helpers  
report-utils.ts        → Optional reporting helpers  

---

🖥️ How to Run

Option 1 — Open directly  
Open the file: accuracy.html  
in your browser.  
The sweep runs automatically and displays results in the dashboard.

Option 2 — GitHub Pages  
1. Go to Settings → Pages  
2. Select main branch / root  
3. Save  
4. Visit your published URL  

Your dashboard will run online with no setup.

---

🛠️ Customization

Edit test data  
Modify: src/test-data.ts  
You can change:  
- text samples  
- font sizes  
- container widths  

Edit layout engine  
Modify: src/layout.ts  
This controls:  
- line breaking  
- height prediction  
- grapheme segmentation  
- layout rules  

Edit dashboard UI  
Modify: accuracy.html  
You can customize:  
- colors  
- fonts  
- layout  
- branding  
- buttons  
- footer  

Edit validation logic  
Modify: accuracy.ts  
This controls:  
- sweep logic  
- mismatch detection  
- diagnostics  
- report generation  

---

📊 How It Works

1. The script prepares each text sample using prepareWithSegments().  
2. It renders the same text in a hidden DOM container.  
3. It measures the browser height using getBoundingClientRect().  
4. It predicts the height using your layout engine (layout()).  
5. It compares the two values.  
6. If the difference is 1px or more, it logs a mismatch.  
7. It extracts per‑line differences for debugging.  
8. Results are displayed in the dashboard.  

---

📦 Dependencies

This project relies on:  
- layout.ts  
- layoutWithLines()  
- prepareWithSegments()  
- diagnostic-utils.ts  
- report-utils.ts  

These must remain in your project for the validation engine to work.

---

📘 Development

To modify or extend the tool:  
- Update accuracy.ts for logic  
- Update accuracy.html for UI  
- Update test-data.ts for inputs  
- Update layout.ts for prediction rules  

No build system is required unless you want to compile TypeScript to JavaScript.

---

📝 Credits

This project is based on the concept of text layout validation and uses a layout engine inspired by earlier work in the field.  
All UI, dashboard logic, and validation workflow have been customized and extended for this fork.

