# Behavior Logging & Anotasi FST Annotator

Dokumen ini menjelaskan secara rinci bagaimana FST Annotator merekam aktivitas pengguna (User Journey), request jaringan (Network Logs), serta bagaimana sistem intersepsi (Mode Inspect) bekerja pada DOM.

## 1. Status: Mode Inspect OFF
Secara *default* saat web dimuat, Mode Inspect berada dalam kondisi **OFF** (`STATE.isDebugMode = false`).

**Apa yang terjadi?**
- **DOM Interaction:** Kursor, klik, dan interaksi user pada web berfungsi normal tanpa gangguan.
- **Background Logging:** Event & Network Tracker tetap berjalan di latar belakang. Setiap request AJAX (`fetch` & `XMLHttpRequest`) dan perpindahan halaman direkam ke `sessionStorage` (maks 50 log terakhir) agar *history* tetap **persisten** meskipun terjadi *full-page reload* (SSR).

## 2. Status: Mode Inspect ON
Ketika Anda mengklik tombol "Mode Inspect: OFF" pada panel (menjadi **ON**).

**Apa yang terjadi?**
- **Hover (Mouseover):** Elemen yang dilewati kursor diberi garis tepi putus-putus (`dashed #ff00ff`), dengan *badge* melayang menampilkan CSS Selector.
- **Klik Elemen (Intersepsi):** Klik akan **dicegat** sepenuhnya (`e.preventDefault()`, `e.stopPropagation()`). Halaman *tidak akan berpindah* dan *form tidak akan disubmit*.

## 3. Saat Klik Terjadi (Ketika Mode Inspect ON)
1. Klik dicatat ke dalam log event sebagai `CLICK`.
2. **Mode Inspect otomatis dimatikan (OFF).**
3. Garis tepi elemen berubah menjadi *solid*.
4. **Note Popup (Modal)** muncul untuk menuliskan anotasi.

## 4. Tombol "Save Note" vs "Save & Release"
Saat popup muncul, Anda bisa menyimpan catatan dengan dua cara:
- **Save Note:** Catatan disimpan, lalu popup ditutup. Intersepsi tetap berlaku (event klik asli mati selamanya).
- **Save & Release:** Catatan disimpan, popup ditutup, lalu script secara programatis me-**re-trigger** (mensimulasikan ulang) klik asli pada elemen tersebut (`element.click()`). Hal ini memungkinkan flow aplikasi berjalan kembali secara normal (misal: lanjut ke halaman berikutnya atau popup web asli terbuka) dan menjadikan alat ini bekerja sempurna layaknya *Man-in-the-Middle Debugger*.

## 5. Pengambilan Konteks (Context Snapshot)
Saat disave, sistem meng-capture data berikut:
- **Identitas Elemen:** URL, CSS Selector, Tag Name, Teks elemen, dan HTML Snippet (maks 150 char).
- **Initiator Render:** Sistem bisa mendeteksi secara akurat apakah elemen ini dirender secara *SSR / Initial HTML* (sejak DOMContentLoaded) atau secara *Client-Side Dynamically Rendered* (via framework JS/React/Vue/jQuery).
- **History:** 3 Log Jaringan Terakhir & 3 Log Event Terakhir.

## 6. Bagaimana Request AJAX / API Direkam?
FST Annotator melakukan *override* (menimpa) fungsi bawaan browser secara global, bekerja transparan di *background*:

- **Fetch API & XMLHttpRequest Interceptor:**
  Menangkap semua komunikasi HTTP/AJAX (baik native maupun via Axios/jQuery). Annotator mencatat:
  - HTTP Method (GET/POST/PUT/dll) dan URL target.
  - **Request Payload (`reqBody`)** (maks 300 char). Mendukung JSON/Teks, untuk `FormData`/Binary dicatat aman sebagai identifier.
  - **HTTP Status Code** dan **Response Body (`resBody`)**.

- **Routing / Navigation Tracker:**
  - **SSR (Multi-Page):** Dicatat otomatis sebagai `PAGE_LOAD` tiap kali skrip *reload*.
  - **SPA (Single-Page):** Meng-*override* `history.pushState` dan mendengarkan event `popstate` untuk mencatat navigasi `NAVIGATE_PUSH` dan `NAVIGATE_POP`.
