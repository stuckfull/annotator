# FST Annotator

Script UI/UX debugging untuk merekam bug visual, interaksi user, dan request API langsung dari browser.

## Cara Menggunakan (Reproduce)

1. **Jalankan Script:** *Copy-paste* isi `annotator.js` ke Browser Console (F12) pada web target, lalu tekan Enter.
2. **Buka Panel:** Klik tombol bulat **FST** di pojok kanan bawah.
3. **Mulai Anotasi:** Klik **"Mode Inspect: OFF"** (menjadi ON). Hover dan klik elemen web yang ingin diberi catatan.
4. **Tulis Catatan:** Masukkan deskripsi bug/revisi pada popup. Anda bisa memilih:
   - **Save Note:** Simpan saja (klik diblokir permanen).
   - **Save & Release:** Simpan lalu eksekusi klik aslinya (cocok untuk mengetes flow navigasi / submit form setelah dianotasi).
5. **Ambil Laporan:** Buka panel FST, klik **View Markdown Report**. *Copy* hasilnya.

---

## Contoh Hasil Report

Berikut adalah contoh laporan Markdown yang di-generate oleh tool ini:

```markdown
# AI Debugging Report
**Session:** Session 1
**Generated:** 08/07/2026, 15:30:00

### [Issue #1] Target Element
- **URL:** https://example.com/checkout
- **Initiator:** Client-Side (Dynamically Rendered)
- **Tag Name:** `<button>`
- **Selector:** `button#submit-order.btn.btn-primary`
- **HTML Snippet:** `<button id="submit-order" class="btn btn-primary" data-item="123">Bayar Sekarang</button>`
- **Element Text:** "Bayar Sekarang"

**Instruction / Note:**
> Tombol payment stuck loading setelah user memilih metode transfer bank.

**User Journey (Before Issue):**
1. [15:29:45] **PAGE_LOAD** -> `/checkout`
2. [15:29:48] **CLICK** -> `input[type="radio"]#bank-transfer`
3. [15:29:50] **CLICK** -> `button#submit-order.btn.btn-primary`

**Recent Network API Logs:** 
\`\`\`json
[
  {
    "time": "15:29:51",
    "url": "/api/payment/select",
    "method": "POST",
    "reqBody": "{\"method\":\"bank_transfer\",\"amount\":50000}",
    "status": 500,
    "resBody": "{\"error\":\"Internal Server Error\"}"
  }
]
\`\`\`
---
```
