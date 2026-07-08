# FST Annotator

**FST Annotator** adalah tool *client-side* ringan (Vanilla JS) yang berfungsi sebagai **Man-In-The-Middle Debugger**. Alat ini memungkinkan Developer atau tim QA untuk menganotasi elemen antarmuka langsung di browser, mencegat (*intercept*) event klik, serta secara otomatis merekam riwayat navigasi (*User Journey*) dan *Network API Logs*.

## 🚀 Fitur Utama

- **Visual Element Selector:** Arahkan kursor dan klik elemen apa saja di layar untuk menandainya (dilengkapi dengan *outline* interaktif dan pencatatan CSS Selector serta Tag HTML secara otomatis).
- **Save & Release (MITM Debugger):** Mem-pause event klik asli, memberikan Anda waktu untuk menulis anotasi/bug report, lalu meneruskan (*re-trigger*) event klik tersebut agar flow web berjalan normal seolah tidak terjadi apa-apa.
- **Network Log Interceptor:** Secara *background* menangkap semua request HTTP dari **Fetch API** maupun **XMLHttpRequest** (termasuk payload request body dan response body) tanpa mengganggu fungsi asli web.
- **SPA & SSR Persistence:** History klik dan jaringan disimpan di memori *sessionStorage*, sehingga tetap utuh meskipun terjadi navigasi *Single-Page Application* (React/Vue/HTMX) maupun *Full-Page Reload* (SSR).
- **Initiator Detection:** Dapat membedakan apakah elemen yang diklik di-render secara Statis/SSR saat pertama kali halaman dimuat, atau di-render secara Dinamis di Client-Side oleh framework JS.
- **Auto Markdown Report:** Menghasilkan laporan AI Debugging berformat Markdown yang rapi (sangat cocok untuk diserahkan ke tim Developer atau asisten AI seperti Claude/GPT).

## 📦 Instalasi

Cukup tambahkan *script tag* berikut ke dalam `<head>` atau sebelum `</body>` di layout HTML proyek Anda:

```html
<script src="https://cdn.jsdelivr.net/gh/stuckfull/annotator@main/annotator.js"></script>
```

Atau, jika Anda ingin menjalankannya secara *ad-hoc* (sementara) untuk debugging di web mana pun:
Cukup salin seluruh isi dari file `annotator.js` dan _paste_ di **Browser Console (F12)**, lalu tekan Enter.

## 🛠 Cara Kerja (Inti Log & Report)

Agar Anda memahami kekuatan dari annotator ini, berikut ringkasan alur kerjanya:

1. **Background Tracking:** Begitu script ter-*load*, ia langsung menyadap (*intercept*) semua perpindahan URL (SPA/SSR) dan request jaringan (Fetch/XHR). Data ini disimpan secara terus-menerus di *sessionStorage* (maksimal menyimpan 50 log terakhir secara *rolling* FIFO).
2. **Mode Inspect ON:** Ketika Anda mengaktifkan _Inspect Mode_ melalui tombol FST yang melayang, seluruh halaman akan dipasang pelindung klik (`e.preventDefault()` & `e.stopPropagation()`). 
3. **Pencatatan Konteks Cerdas:** Saat Anda mengklik sebuah elemen dan menyimpan catatan, script hanya akan merekam **3 aktivitas (klik/navigasi) terakhir** dan **3 request jaringan terakhir** yang terjadi tepat sebelum detik Anda melakukan klik tersebut. Ini memastikan laporan sangat relevan dengan bug dan bebas dari *noise*.
4. **Markdown Export:** Anda tidak perlu mengambil _screenshot_ berkali-kali. Cukup _copy_ hasil Markdown (yang sudah memuat URL target, Tag HTML, Teks Elemen, HTTP Method, Payload, dan Status) dan serahkan untuk segera ditindaklanjuti.

## 🔗 Demo
Lihat implementasinya secara langsung di SPA Environment:
[Live Demo FST Annotator](https://stuckfull.github.io/annotator/)
*(Coba klik tombol **FST** di pojok kanan bawah lalu navigasikan ke halaman About atau Checkout).*

## 📚 Dokumentasi Lebih Lanjut
Untuk memahami cara kerja secara teknis lebih dalam, silakan baca dokumen berikut:
- [Log Perilaku, History, & Cara Intersepsi Bekerja (logging.md)](./logging.md)
- [Contoh Hasil Report Markdown Lengkap (report.md)](./report.md)
