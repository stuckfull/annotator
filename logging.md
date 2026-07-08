# Behavior Logging & Anotasi FST Annotator

Dokumen ini menjelaskan secara rinci bagaimana FST Annotator merekam aktivitas pengguna (User Journey), request jaringan (Network Logs), serta bagaimana sistem intersepsi (Mode Inspect) bekerja pada DOM. Memahami alur ini sangat penting agar annotator ini dapat dioptimalkan sebagai *debugger front-end*.

## 1. Status: Mode Inspect OFF
Secara *default* saat web dimuat, Mode Inspect berada dalam kondisi **OFF** (`STATE.isDebugMode = false`).

**Apa yang terjadi?**
- **DOM Interaction:** Kursor, klik, dan interaksi user pada web berfungsi normal tanpa gangguan.
- **Hover:** Tidak ada garis tepi (outline) yang tergambar pada elemen.
- **Background Logging:** Meskipun Mode Inspect OFF, **Event & Network Tracker tetap berjalan** di latar belakang. Setiap request `fetch` dan perpindahan halaman (SPA Routing) akan terus direkam ke dalam *memory array* (maksimal 50 log terakhir).

## 2. Status: Mode Inspect ON
Ketika Anda mengklik tombol "Mode Inspect: OFF" pada panel (menjadi **ON**).

**Apa yang terjadi?**
- **Hover (Mouseover):** Setiap elemen yang dilewati kursor akan diberi garis tepi putus-putus (`dashed #ff00ff`), dan sebuah *badge* melayang akan menampilkan CSS Selector dari elemen tersebut.
- **Klik Elemen (Intersepsi):** Jika Anda **mengklik link, tombol, atau elemen apa pun**, klik tersebut **dicegat** (*intercepted*). 
  - Fungsi `e.preventDefault()` dan `e.stopPropagation()` akan dijalankan.
  - Artinya, halaman *tidak akan berpindah* (jika link diklik) dan *form tidak akan disubmit* (jika tombol submit diklik).

## 3. Saat Klik Terjadi (Ketika Mode Inspect ON)
Saat Anda mengklik sebuah elemen di Mode Inspect ON:
1. Klik tersebut dicatat ke dalam log event (`STATE.logs.events`) sebagai tindakan `CLICK` dengan detail CSS Selector elemen yang diklik.
2. **Mode Inspect otomatis dimatikan (menjadi OFF).**
3. Garis tepi elemen berubah menjadi *solid* (menandakan elemen sedang dipilih).
4. **Note Popup (Modal)** muncul, meminta Anda untuk menuliskan catatan/instruksi terkait elemen tersebut.

## 4. Apa yang Terjadi Saat Submit Anotasi (Save Note)?
Setelah Anda mengetikkan catatan dan menekan tombol **"Save Note"**:
1. Sistem akan menangkap *snapshot* data elemen:
   - URL saat ini (`window.location.href`)
   - CSS Selector dari elemen yang diklik.
   - Teks di dalam elemen (`innerText`, dipotong maksimal 100 karakter).
   - Catatan yang Anda tulis.
2. **Pengambilan Konteks (Context Snapshot):**
   - Mengambil **3 Log Jaringan Terakhir** (Network Logs).
   - Mengambil **3 Log Event Terakhir** (User Journey).
3. Data anotasi tersebut digabungkan menjadi satu objek dan dimasukkan (*push*) ke dalam *Active Session* di `localStorage`.
4. Popup tertutup, dan garis tepi (*outline*) pada elemen dihilangkan.

## 5. Bagaimana Request AJAX / Fetch Direkam?
FST Annotator melakukan *override* (menimpa) fungsi bawaan browser untuk melacak kejadian secara global, baik saat Mode Inspect ON maupun OFF:

- **Fetch API Interceptor:**
  Setiap kali aplikasi/web melakukan `fetch(...)`, FST Annotator akan mencegatnya. Request tetap dilanjutkan secara normal, tetapi Annotator mem- *bypass* hasilnya:
  - Menyimpan metode (GET/POST) dan URL tujuan.
  - Menyalin (*clone*) hasil respons.
  - Menyimpan *HTTP Status* dan isi respons (Body text, maksimal 300 karakter) ke dalam `STATE.logs.network`.
  - *Catatan: Saat ini sistem hanya merekam `fetch()`. Jika web menggunakan `XMLHttpRequest` lawas (misal via jQuery AJAX lama), request tersebut belum terekam.*

- **SPA Routing (History Interceptor):**
  Untuk aplikasi *Single Page Application* (React, Vue, HTMX), URL berubah tanpa *reload* halaman. Annotator meng- *override* `history.pushState` dan memasang *listener* pada `popstate` untuk merekam perpindahan halaman ke dalam `STATE.logs.events` (dicatat sebagai `NAVIGATE_PUSH` atau `NAVIGATE_POP`).
