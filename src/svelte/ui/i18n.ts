import { htmlElements } from 'finkas/core/utils';
/**
 * @module ui/i18n
 * Client-side Indonesian/English DOM interface translation engine.
 */

const MONTH_EN: Record<string, string> = {
  Januari: 'January', Februari: 'February', Maret: 'March', April: 'April',
  Mei: 'May', Juni: 'June', Juli: 'July', Agustus: 'August',
  September: 'September', Oktober: 'October', November: 'November', Desember: 'December',
  Agu: 'Aug', Okt: 'Oct', Des: 'Dec'
};
const trMonths = (s: string) => s.replace(
  /\b(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|Agu|Okt|Des)\b/g,
  (m) => MONTH_EN[m] || m
);

const EXACT_EN: Record<string, string> = {
  // Topbar, Startup & Group overview
  'Buku Kas Digital': 'Digital Cash Ledger', 'Buku Kas Warga': 'Community Cash Ledger',
  'Tampilan Anggota · Transparansi Kas': 'Member View · Cash Transparency',
  'Mode Pengguna': 'View Mode', 'Mode Super Admin': 'Super Admin Mode', 'Mode Admin': 'Admin Mode',
  'Mode Anggota (Baca Saja)': 'Member View (Read-Only)', 'Mode Pengurus': 'Admin Mode', 'Pengurus aktif': 'Admin Active',
  'Tampilan': 'Appearance', 'Sensor Saldo': 'Hide Amounts', 'Tampilkan Saldo': 'Show Amounts',
  'Ganti Tema': 'Toggle Theme', 'Menu Navigasi': 'Navigation Menu', 'Menu Navigasi Finkas': 'Finkas Navigation Menu',
  'Menu & Aksi Cepat': 'Menu & Quick Actions', 'Ganti Grup': 'Switch Group',
  'Memuat buku kas…': 'Loading cash ledger…', 'Buku kas belum bisa dimuat.': 'Unable to load cash ledger.', 'Coba Lagi': 'Try Again',
  'Catat Kas': 'Record Cash', 'Pilih Banyak': 'Multi-Select', 'Pesan WA': 'WA Reminder', 'Data Master': 'Master Data',
  // Bento cards
  'Saldo Kas Aktif': 'Active Cash Balance', 'Belum ada iuran jatuh tempo': 'No dues due yet',
  'Kepatuhan iuran tahun ini': 'Dues compliance this year',
  'Total Pemasukan': 'Total Inflow', 'Belum ada pemasukan': 'No inflows yet', 'Masuk': 'Inflow', 'Masuk →': 'Inflows →',
  'Total Pengeluaran': 'Total Outflow', 'Belum ada pengeluaran': 'No outflows yet', 'Keluar': 'Outflow', 'Keluar →': 'Outflows →',
  // Spotlight & Priority Arrears
  'Pantau Iuran Saya': 'Track My Dues',
  'Trik': 'Trick',
  'Interaksi Kasi': 'Kasi Actions',
  'Sayang Kasi': 'Kasi Love', 'Elus Kasi': 'Pet Kasi', 'Kasih Koin': 'Toss Coin',
  'Beri Ikan': 'Give Fish', 'Trik & Tidur': 'Tricks & Nap', 'Salto 360': '360 Flip',
  'Sapaan Maneki': 'Maneki Wave', 'Mode Detektif': 'Detective Mode', 'Tidur Zzz': 'Sleepy Zzz',
  'Elus atau colek Kasi': 'Pet or boop Kasi', 'Level sayang Kasi': 'Kasi love level', 'Mainkan Kasi': 'Play with Kasi',
  'Pilih nama Anda atau sematkan dari tabel untuk akses cepat ringkasan iuran pribadi.': 'Select your name or pin it from the table for instant access to your personal dues summary.',
  'Pilih Nama Anggota untuk Disematkan': 'Select Member to Pin', 'Ganti Anggota Tersemat': 'Change Pinned Member',
  'Pilih nama Anda...': 'Select your name...', 'Pantauan Iuran Saya': 'My Pinned Dues',
  'Iuran Jatuh Tempo Lunas': 'All Due Months Paid', 'Lunas Bulan Berjalan': 'Current Month Paid',
  'Lepas': 'Unpin', 'Lepas sematan': 'Unpin member', 'Sematkan': 'Pin', 'Tersemat': 'Pinned',
  'Bayar Iuran': 'Pay Dues', 'Buku Iuran': 'Passbook', 'Tunggakan Prioritas': 'Priority Arrears',
  'Tidak ada tunggakan bulan ini': 'No arrears this month',
  'Semua anggota telah lunas hingga bulan berjalan': 'All members are paid up through the current month',
  'Batal': 'Cancel', 'Tinjau Pembayaran': 'Review Payment',
  // Workspace tabs, filters, legend, matrix
  'Status Iuran': 'Dues Matrix', 'Riwayat Arus Kas': 'Cash Flow Ledger',
  'Kesehatan & Grafik Kas': 'Analytics & Charts', 'Analitik & Grafik Kas': 'Analytics & Charts',
  'Arus Kas': 'Cash Flow', 'Grafik Kas': 'Charts', 'Grafik': 'Charts', 'Bayar': 'Pay', 'Lompat Cepat': 'Quick Jump',
  'Cari nama atau catatan...': 'Search member name or note...', 'Cari menu, aksi, atau laporan...': 'Search menus, actions, or reports...',
  'Cari pilihan': 'Search options...',
  'Semua': 'All', 'Nunggak': 'Overdue', 'Lunas': 'Paid', 'LUNAS': 'PAID',
  'Sebagian': 'Partial', 'SEBAGIAN': 'PARTIAL', 'Tunggakan': 'Overdue',
  'Belum': 'Unpaid', 'BELUM': 'UNPAID', 'Akan Datang': 'Upcoming', 'Nanti': 'Later', 'NANTI': 'LATER',
  'Libur': 'Exempt', 'LIBUR': 'EXEMPT', 'Belum jatuh tempo': 'Not due yet',
  'Tahun:': 'Year:', 'Tahun': 'Year', 'Arti Status': 'Status Guide', 'Anggota': 'Member', 'Sinkron': 'Synced', 'Data Baru': 'New Data', 'Memuat…': 'Syncing…',
  'Januari': 'January', 'Februari': 'February', 'Maret': 'March', 'April': 'April', 'Mei': 'May', 'Juni': 'June',
  'Juli': 'July', 'Agustus': 'August', 'September': 'September', 'Oktober': 'October', 'November': 'November', 'Desember': 'December',
  'Agu': 'Aug', 'Okt': 'Oct', 'Des': 'Dec',
  'Status pembayaran iuran per anggota sepanjang 12 bulan': 'Monthly dues payment status per member across 12 months',
  'Tidak ada anggota ditemukan.': 'No members found.', 'Halaman': 'Page', 'Buka': 'Go', 'Sebelumnya': 'Previous', 'Berikutnya': 'Next',
  // Ledger / Riwayat
  'Semua Kategori': 'All Categories', 'Terbaru': 'Newest First', 'Terlama': 'Oldest First',
  'Nominal Terbesar': 'Highest Amount', 'Nominal Terkecil': 'Lowest Amount',
  'Klik baris untuk membuka Struk Digital': 'Click any row to view Digital Receipt',
  'Belum ada transaksi yang sesuai filter.': 'No transactions match the current filter.',
  'Belum ada transaksi tercatat.': 'No transactions recorded yet.',
  'Koreksi / Struk': 'Edit / Receipt', 'Lihat Struk': 'View Receipt', 'Koreksi': 'Edit', 'Struk': 'Receipt',
  // Analytics & Charts
  'Arus Kas Bulanan & Tren Saldo': 'Monthly Cash Flow & Balance Trend',
  'Pemasukan': 'Inflow', 'Pengeluaran': 'Outflow', 'Tren Saldo Kumulatif': 'Cumulative Balance Trend',
  'Unduh CSV': 'Download CSV', 'Komposisi & Kepatuhan': 'Breakdown & Compliance', 'Kepatuhan Iuran Grup': 'Group Dues Compliance',
  'Distribusi pengeluaran & tingkat pelunasan anggota': 'Expense distribution & member payment compliance',
  'Belum ada pengeluaran tercatat': 'No expenses recorded yet',
  'Arahkan kursor atau ketuk grafik untuk rincian bulan': 'Hover or tap the chart for monthly details',
  // Appearance & Language Modal (#modal-tampilan)
  'Tampilan & Bahasa': 'Appearance & Language',
  'Sesuaikan bahasa, tema warna, pencahayaan, dan gaya tampilan aplikasi': 'Customize language, color palette, theme mode, and display preferences',
  'Bahasa Aplikasi': 'Interface Language', 'Paket Harmoni Warna': 'Color Harmony Palette',
  'Coral hangat & biru laut': 'Warm coral & ocean blue', 'Biru kobalt & langit cerah': 'Cobalt blue & bright sky',
  'Grafit tegas & aksen pastel': 'Bold graphite & pastel accents', 'Nila tua & jingga kontras': 'Deep indigo & contrasting tangerine',
  'Mode Pencahayaan': 'Theme Mode', 'Terang': 'Light', 'Gelap': 'Dark', 'Otomatis': 'Auto',
  'Gaya Stempel Lunas': 'Paid Stamp Style', 'Gaya Stempel': 'Stamp Style',
  'Segel Bulat': 'Round Seal', 'Segel bundar kontras tinggi dan bersih': 'Clean high-contrast circular seal',
  'Lencana Roset': 'Rosette Badge', 'Lencana 12 kelopak khas verifikasi resmi': '12-petal official verification badge',
  'Perisai Sah': 'Verified Shield', 'Perisai arsip digital bergaya modern': 'Modern digital archive shield',
  'Suasana Latar Belakang': 'Canvas Background', 'Pendar warna lembut': 'Soft ambient color glow',
  'Gelombang Topografi': 'Topographic Waves', 'Garis kontur dinamis': 'Dynamic contour lines',
  'Kertas Buku Kas': 'Ledger Paper', 'Grid titik pembukuan': 'Dotted accounting grid',
  'Polos Minimal': 'Minimal Clean', 'Kanvas bersih fokus data': 'Clean data-focused canvas',
  'Format Nominal Kas': 'Currency Format', 'Lengkap (Rp 50.000)': 'Full (Rp 50.000)', 'Ringkas (Rp 50rb / 3,5 Jt)': 'Compact (Rp 50rb / 3,5 Jt)',
  'Maskot Interaktif': 'Interactive Mascot', 'Tampilkan Maskot Kasi': 'Show Kasi Mascot',
  'Kucing kas interaktif yang menemani di papan utama': 'Interactive cash cat companion on the main workspace',
  'Pengaturan tersimpan otomatis di perangkat ini.': 'Preferences are saved automatically on this device.',
  'Selesai': 'Done', 'Tutup': 'Close', 'Pilih': 'Select', 'Cari...': 'Search...', 'Tidak ditemukan.': 'No results found.',
  // Navigation Modal (#modal-menu)
  'Akses cepat seluruh fitur, laporan, dan pengaturan kas': 'Quick access to all ledger tools, reports, and settings',
  'Menu tidak ditemukan': 'No matching menu found',
  'Coba kata kunci lain seperti laporan, tema, atau anggota': 'Try another keyword such as report, theme, or member',
  'Navigasi': 'Navigate', 'Hapus pencarian': 'Clear search', 'Cari navigasi menu': 'Search navigation menu',
  'Login Pengurus': 'Admin Sign In', 'Masuk untuk mencatat transaksi & mengelola data kas': 'Sign in to record transactions & manage group ledger',
  'Manajemen & Data Kas': 'Ledger & Master Data', 'Kelola Data Master': 'Master Data',
  'Atur daftar anggota, kategori transaksi & bulan libur': 'Manage members, transaction categories & exempt months',
  'Manajemen Grup': 'Group Management', 'Buat grup kas baru & kelola akses pengurus': 'Create new cash groups & manage admin credentials',
  'Log Aktivitas': 'Activity Audit Log', 'Riwayat perubahan data dan jejak audit pengurus': 'Complete history of data mutations and admin actions',
  'Antrean Offline': 'Offline Queue', 'Transaksi tersimpan lokal yang menunggu sinkronisasi': 'Locally queued transactions awaiting cloud sync',
  'Laporan & Analitik': 'Reports & Analytics',
  'Daftar lengkap transaksi masuk, keluar & struk digital': 'Complete log of inflows, outflows & digital receipts',
  'Visualisasi tren saldo bulanan & rasio kepatuhan': 'Monthly balance trends & member compliance metrics',
  'Laporan & Ekspor Data': 'Reports & Data Export',
  'Cetak laporan bulanan, unduh CSV/PDF & rekap WhatsApp': 'Print monthly statements, export CSV/PDF & WhatsApp recap',
  'Preferensi & Bantuan': 'Preferences & Help',
  'Bahasa aplikasi, tema warna, mode gelap & format nominal': 'Interface language, color palette, dark mode & number format',
  'Panduan & FAQ': 'Guide & FAQ', 'Penjelasan status iuran dan bantuan penggunaan': 'Dues status glossary and frequently asked questions',
  'Instal Aplikasi Finkas': 'Install Finkas App', 'Tambahkan pintasan aplikasi ke layar utama perangkat': 'Add instant shortcut to your device home screen',
  'Keluar Sesi Pengurus': 'Sign Out Admin', 'Kembali ke mode tampilan anggota': 'Return to read-only member transparency view',
  // Auth, Groups & PIN Modals
  'Masuk untuk mengelola pencatatan dan pengaturan kas grup': 'Sign in to manage group ledger records and settings',
  'Masukkan kata sandi pengurus untuk mengelola buku kas': 'Enter admin password to manage the group ledger',
  'Email Pengurus': 'Admin Email', 'Kata Sandi Pengurus': 'Admin Password', 'Masukkan kata sandi...': 'Enter password...',
  'Ketik password admin...': 'Enter admin password...',
  'Grup Aktif': 'Active Group', 'Akses Pengurus': 'Admin Access', 'Opsional': 'Optional',
  'Kata Sandi': 'Password', 'Caps Lock aktif': 'Caps Lock is on',
  'Tampilkan kata sandi': 'Show password', 'Sembunyikan kata sandi': 'Hide password',
  'Sesi terenkripsi · Berlaku 12 jam': 'Encrypted session · Valid 12 hours',
  'Mengecek...': 'Signing in...',
  'Masukkan kata sandi pengurus terlebih dahulu.': 'Please enter the admin password first.',
  'Format email tidak valid.': 'Please enter a valid email address.',
  'Email atau Password Admin salah!': 'Incorrect admin email or password.',
  'Gagal terhubung ke server.': 'Could not connect to server.',
  'Masuk sebagai Pengurus': 'Sign In as Admin',
  'Keluar Sesi Admin?': 'Sign Out of Admin Session?',
  'Anda perlu memasukkan password kembali untuk mencatat dan mengedit kas.': 'You will need to sign in again to record or edit ledger entries.',
  'Akhiri sesi pengurus dan kembali ke tampilan anggota?': 'End admin session and return to member view?', 'Ya, Keluar': 'Yes, Sign Out',
  'Tentang Finkas': 'About Finkas', 'Buku Kas Digital Transparan & Modern': 'Transparent & Modern Digital Cash Ledger',
  'Pembukuan kas kelompok yang sederhana dan jujur.': 'Simple, transparent group cash bookkeeping.',
  'Versi': 'Version', ' © 2025 Finkas. Dibuat dengan': '© 2025 Finkas. Built with', '© 2025 Finkas. Dibuat dengan': '© 2025 Finkas. Built with',
  'untuk pengelolaan kas yang lebih baik.': 'for better community cash management.', 'Kebijakan Privasi': 'Privacy Policy',
  'Transparan': 'Transparent', 'Sinkron Cloud': 'Cloud Sync', 'Siap Offline': 'Offline Ready',
  'Pilih Grup Kas': 'Select Cash Group', 'Setiap grup memiliki buku kas dan data anggota yang terpisah': 'Each group maintains its own isolated cash ledger and member list',
  'Daftar Grup Tersedia': 'Available Groups',
  'Halaman Utama': 'Welcome Page', 'Keluar dari Grup': 'Leave Group', 'Memuat daftar grup...': 'Loading groups...',
  'Grup aktif': 'Active group', 'Grup aktif saat ini': 'Currently active group',
  'Ketuk untuk masuk': 'Tap to unlock', 'Ketuk untuk masuk dengan PIN': 'Tap to unlock with PIN',
  'Langsung masuk': 'Instant access', 'Akses langsung tanpa PIN': 'Direct access without PIN',
  'Instan': 'Instant',
  'Belum ada grup. Minta admin pemilik membuatkan grup.': 'No cash groups yet. Ask the owner admin to create one.',
  'Belum ada grup kas tersedia': 'No cash groups available yet',
  'Hubungi pengurus pemilik untuk membuat ruang kas baru.': 'Contact the owner admin to create a new cash group.',
  'Pilih grup lalu masukkan 4 digit PIN aksesnya.': 'Select a group and enter its 4-digit access PIN.',
  'Grup': 'Group', 'Masukkan 4 digit PIN untuk membuka grup ini': 'Enter the 4-digit PIN to unlock this group',
  'PIN Akses Grup': 'Group Access PIN', 'Masukkan 4 digit PIN grup': 'Enter 4-digit group PIN',
  'Buka Grup': 'Unlock Group', 'Pilih Grup Lain': 'Switch Group',
  'Akses dikunci sementara selama 5 menit setelah 5 kali salah PIN.': 'Access is temporarily locked for 5 minutes after 5 failed attempts.',
  'Kelola Grup': 'Group Management', 'Kelola Grup & Akses': 'Manage Groups & Access',
  'Atur kelas atau buat ruang kas baru': 'Manage existing groups or create a new cash space',
  'Tambah Grup Baru': 'Create New Group', 'Buat': 'Create',
  'Buat akun Admin Grup langsung (Email & Password)': 'Set up Group Admin account directly (Email & Password)',
  'Grup Terdaftar': 'Registered Groups', 'Memuat...': 'Loading...',
  'Daftar Super Admin (Google Login)': 'Super Admin Whitelist (Google Sign-In)',
  'Hanya email Google terdaftar yang dapat masuk melalui tautan rahasia pemilik.': 'Only whitelisted Google emails can sign in via the owner portal.',
  'Data tiap grup terisolasi aman. Hapus grup memerlukan konfirmasi nama.': 'Each group is strictly isolated. Deleting a group requires name confirmation.',
  'Kredensial Grup': 'Group Credentials', 'Akun siap dibagikan ke pengurus': 'Credentials ready to share with group administrators',
  'Grup:': 'Group:', 'PIN Warga:': 'Member PIN:', 'Email Admin:': 'Admin Email:', 'Password Admin:': 'Admin Password:',
  'Salin Format WhatsApp': 'Copy for WhatsApp', 'Salin Info Akses': 'Copy Credentials', 'Simpan Perubahan': 'Save Changes',
  // Transactions Modals (#modal-transaksi, #modal-edit-transaksi, #modal-hapus, #modal-quickpay)
  'Catat Transaksi Baru': 'Record New Transaction',
  'Catat pembayaran iuran anggota atau arus kas operasional': 'Record member dues payments or general operational cash flows',
  'Pilih tab pembayaran iuran anggota atau pencatatan kas operasional': 'Record member dues payments or general operational cash flows',
  'Pencatatan otomatis memperbarui saldo kas dan status iuran': 'Recording automatically updates cash balance and dues status',
  'Langkah pencatatan': 'Recording steps', 'Jenis': 'Type', 'Tinjau': 'Review',
  'Tinjau Iuran Anggota': 'Review Member Dues', 'Tinjau Transaksi Operasional': 'Review Operational Transaction',
  'Siapa yang bayar?': 'Who paid?', 'Berapa nominal dan keperluannya?': 'How much, and why?',
  'Uang keluar dari kas': 'Money going out', 'Uang masuk ke kas': 'Money coming in',
  'Periode tagihan': 'Billing period', 'Nominal per anggota': 'Amount per member',
  'Tanggal bayar': 'Payment date', 'Belum diatur': 'Not set',
  'Anggota membayar': 'Paying members', 'Ditambahkan ke saldo kas': 'Added to cash balance', 'Total kas masuk': 'Total inflow',
  'Arus transaksi': 'Flow type', 'Tanggal transaksi': 'Transaction date', 'Terkait anggota': 'Related member',
  'Bukan transaksi anggota': 'Not member-specific', 'Mengurangi saldo kas': 'Reduces the cash balance',
  'Menambah saldo kas': 'Adds to the cash balance', 'Dampak saldo': 'Balance impact', 'Nominal:': 'Amount:',
  'BELUM BAYAR': 'UNPAID', 'Belum bayar': 'Unpaid', 'Tidak ditagih': 'Not billed',
  'Pilih kategori iuran terlebih dahulu.': 'Select a dues category first.',
  'Nominal iuran harus lebih dari 0.': 'Dues amount must be greater than 0.',
  'Bulan dan tahun iuran wajib dipilih.': 'Billing month and year are required.',
  'Pilih minimal 1 anggota!': 'Select at least 1 member!',
  'Pilih kategori transaksi terlebih dahulu.': 'Select a transaction category first.',
  'Nominal transaksi harus lebih dari 0.': 'Transaction amount must be greater than 0.',
  'Isi keterangan atau keperluan transaksi.': 'Enter a transaction description or purpose.',
  'Iuran Anggota': 'Member Dues', 'Kas Operasional': 'Operational Cash', 'Pemasukan Lain': 'Other Inflow', 'Pengeluaran Kas': 'Cash Outflow',
  'Kategori Iuran': 'Dues Category', 'Iuran Bulanan': 'Monthly Dues', 'Donasi Warga': 'Community Donation', 'Sewa Tenda & Kursi': 'Equipment Rental',
  'Nominal (per orang)': 'Amount (per member)', 'Bulan Tagihan': 'Billing Month', 'Tanggal Bayar (Opsional)': 'Payment Date (Optional)',
  'Daftar Anggota': 'Member List', 'Pilih Semua Belum Lunas': 'Select All Unpaid', 'Pilih Semua': 'Select All', 'Lunas Semua!': 'All Paid!',
  'Cari nama anggota...': 'Search member name...', 'Cari nama anggota': 'Search member name',
  'Semua anggota sudah lunas bulan ini!': 'All members are already paid for this month!',
  'Memuat daftar anggota...': 'Loading member list...', 'Anggota Dipilih': 'Selected Members', '0 Orang': '0 Members',
  'Nominal / Orang': 'Amount / Member', 'Total Kas Masuk': 'Total Inflow', 'Simpan Iuran': 'Save Dues',
  'Arus Transaksi': 'Cash Flow Type', 'Pengeluaran (-)': 'Outflow (-)', 'Pengeluaran (−)': 'Outflow (−)', 'Pemasukan (+)': 'Inflow (+)',
  '25rb': '25k', '50rb': '50k', '100rb': '100k', '250rb': '250k',
  'Saldo Bertambah': 'Balance Added', 'Saldo Berkurang': 'Balance Deducted',
  'Kategori': 'Category', '-- Pilih Kategori --': '-- Select Category --',
  'Kebersihan & Sampah': 'Sanitation & Waste', 'Keamanan Pos Ronda': 'Neighborhood Security',
  'Penerangan Jalan': 'Street Lighting', 'Kerja Bakti': 'Community Service', 'Administrasi Kas': 'Ledger Administration',
  'Nominal (Rp)': 'Amount (Rp)', 'Tanggal Transaksi (Opsional)': 'Transaction Date (Optional)',
  'Terkait Anggota (Opsional)': 'Related Member (Optional)', 'Terkait Anggota': 'Related Member',
  '-- Bukan transaksi anggota --': '-- Not member-specific --', 'Keterangan / Keperluan': 'Description / Purpose',
  'Jenis Arus': 'Flow Type', 'Nominal': 'Amount', 'Dampak Saldo': 'Balance Impact', 'Simpan Transaksi': 'Save Transaction',
  'Koreksi Transaksi': 'Edit Transaction', 'Koreksi nominal, kategori, atau catatan pembukuan': 'Update amount, category, or ledger notes',
  'Sesuaikan arus kas, nominal, atau catatan dengan tinjauan dampak saldo': 'Adjust flow, nominal, or ledger notes with live balance impact review',
  'Langkah koreksi': 'Edit steps', 'Jenis & Nominal': 'Type & Amount', 'Rincian & Bukti': 'Details & Proof', 'Rincian': 'Details',
  'Data Asal': 'Original Entry', '10rb': '10k',
  'Nominal tetap · Tidak mengubah saldo': 'Unchanged · No balance impact',
  'Perbarui detail & lampiran': 'Update details & attachments', 'Tinjau Koreksi Transaksi': 'Review Edit Transaction',
  'ID Referensi': 'Reference ID', 'Periode & tanggal': 'Period & Date', 'Selisih saldo': 'Balance delta', 'Selisih:': 'Delta:',
  'Rp 0 (Tetap)': 'Rp 0 (Unchanged)', 'Tercatat di log audit': 'Logged in audit trail',
  'Nominal Diterima': 'Amount Received', 'Nominal Dikeluarkan': 'Amount Disbursed', 'No. Referensi': 'Reference No.',
  'Koreksi Data': 'Edit Entry', 'Bukti Kas Digital Sah': 'Verified Digital Cash Receipt', 'Tercatat di Buku Kas & Audit': 'Recorded in Cashbook & Audit',
  'Tipe Transaksi': 'Transaction Type', 'Tidak ada pilihan.': 'No options available.', 'Bulan': 'Month', 'Tanggal Transaksi': 'Transaction Date',
  'Tanggal pembayaran sebenarnya (tampil di riwayat).': 'Actual settlement date (shown in cash flow ledger).',
  'Keterangan': 'Description', 'Bukti Transaksi (maks 512 KiB)': 'Transaction Proof (max 512 KiB)',
  'Unggah': 'Upload', 'Unduh': 'Download', 'Hapus': 'Delete', 'Belum ada bukti terlampir.': 'No attachment uploaded yet.',
  'Dampak Koreksi': 'Adjustment Impact', 'Tipe': 'Type', 'Nominal Lama': 'Previous Amount', 'Nominal Baru': 'New Amount', 'Selisih Saldo': 'Balance Delta',
  'Perubahan tersimpan dengan jejak audit.': 'All edits are recorded in the audit trail.', 'Cetak Struk': 'Print Receipt',
  'Hapus Transaksi': 'Delete Transaction', 'Hapus Transaksi?': 'Delete Transaction?',
  'Data yang dihapus akan dicatat ke log aktivitas dan saldo kas akan disesuaikan.': 'Deleted entries are logged in the audit trail and the cash balance is recalculated.',
  'Ya, Hapus': 'Yes, Delete', 'Tahan 1 dtk untuk hapus': 'Hold 1s to delete',
  'Konfirmasi Perubahan': 'Confirm Changes', 'Apakah Anda yakin ingin menyimpan perubahan ini ke database?': 'Are you sure you want to save these changes to the database?',
  'Ya, Lanjutkan': 'Yes, Continue', 'Konfirmasi Tindakan': 'Confirm Action', 'Lanjutkan': 'Continue',
  'Bayar Iuran Kilat': 'Quick Dues Payment', 'Nominal Pembayaran': 'Payment Amount', 'Simpan Pembayaran': 'Save Payment',
  'Catatan (Opsional)': 'Note (Optional)', 'Contoh: Transfer / Tunai': 'e.g. Transfer / Cash',
  'Kas masuk': 'Cash inflow', 'Lunasi': 'Full', 'Lunasi Sisa': 'Settle Rem.',
  'Akan Lunas': 'Will be Paid in Full', 'Masukkan nominal pembayaran': 'Enter payment amount',
  'Tanggal Bayar Kilat': 'Quick Payment Date', 'Nominal cepat': 'Quick amounts',
  // Master Data Modal (#modal-kelola-master)
  'Pengaturan anggota, pos kategori, dan bulan libur iuran': 'Configure members, cash categories, exempt months, and bank account',
  'Pengaturan anggota, pos kategori, bulan libur, dan rekening kas': 'Configure members, cash categories, exempt months, and bank account',
  'Cari anggota...': 'Search members...', 'Cari anggota': 'Search members',
  'Nama Anggota Baru...': 'New member name...', 'No. WA (Opsional)...': 'WhatsApp No. (Optional)...',
  'Nama Kategori Baru...': 'New category name...',
  'Awal Mulai Kas': 'Ledger Start Month', 'Tambah Bulan Libur': 'Add Exempt Month', 'Daftar Bulan Libur': 'Exempt Months List',
  'Ditampilkan ke anggota pada panduan pembayaran mandiri': 'Shown to members in the self-payment guide',
  'Simpan perubahan agar langsung muncul di panduan transfer anggota.': 'Save changes to update the member transfer guide immediately.',
  'Bulan Libur': 'Exempt Months', 'Rekening': 'Bank Account', 'Tambah': 'Add', 'Nama Anggota': 'Member Name',
  'No. WhatsApp': 'WhatsApp No.', 'Nomor WhatsApp': 'WhatsApp Number', 'Status': 'Status', 'Aksi': 'Action',
  'Memuat data anggota...': 'Loading members...', 'Belum ada anggota terdaftar.': 'No members registered yet.',
  'Tipe Kategori Kas': 'Category Flow Type', 'Kas Masuk': 'Cash Inflow', 'Kas Keluar': 'Cash Outflow',
  'Nama Kategori': 'Category Name', 'Tipe Arus': 'Flow Type', 'Memuat data kategori...': 'Loading categories...', 'Belum ada kategori.': 'No categories yet.',
  'Rekening Kas Grup': 'Group Bank Account', 'Nama bank': 'Bank Name', 'Nomor rekening': 'Account Number',
  'Atas nama': 'Account Holder', 'WhatsApp bendahara': 'Treasurer WhatsApp', 'Simpan Rekening': 'Save Account',
  'Awal mulai kas menandai bulan pertama grup menarik iuran. Bulan sebelumnya tidak dihitung sebagai tunggakan.': 'Ledger start month marks the first month dues are billed. Prior months are not counted as arrears.',
  'Pilih awal mulai kas...': 'Select ledger start month...', 'Kosongkan': 'Clear', 'Bulan ini': 'This Month', 'Simpan': 'Save',
  'Bulan yang ditandai sebagai bulan libur akan dibebaskan dari kewajiban iuran seluruh anggota.': 'Months marked as exempt waive mandatory dues for all members.',
  'Pilih bulan libur...': 'Select exempt month...', 'Memuat data bulan libur...': 'Loading exempt months...',
  'Belum ada bulan libur yang diatur.': 'No exempt months configured.',
  'Pilih Bulan dan Tahun': 'Select Month and Year', 'Tahun sebelumnya': 'Previous Year', 'Tahun berikutnya': 'Next Year',
  'Perubahan tersimpan langsung ke tampilan aktif.': 'Changes are applied immediately to the active workspace.',
  'Edit Data Anggota': 'Edit Member Profile', 'Perbarui identitas, nomor WhatsApp, dan status keanggotaan': 'Update member name, WhatsApp contact, and active status',
  'Chat WA': 'WA Chat', 'Riwayat Setoran': 'Payment History', 'Status Keanggotaan': 'Membership Status',
  'Aktif': 'Active', 'Nonaktif': 'Inactive',
  'Detail Kategori Kas': 'Cash Category Details', 'Informasi pos arus kas dan tindakan penghapusan': 'Category flow details and removal options',
  'Hapus Kategori': 'Delete Category',
  // Audit Log & Offline Queue Modals
  'Log Aktivitas Admin': 'Admin Activity Audit Log', 'Jejak audit dan rekaman histori aksi pengurus kas': 'Complete audit trail and historical log of administrator actions',
  'Cari aksi atau detail aktivitas...': 'Search actions or activity details...', 'Transaksi': 'Transactions', 'Keamanan & Akses': 'Security & Access',
  'Grup & Backup': 'Groups & Backup', 'Menampilkan maksimal 100 aktivitas terbaru · Akses eksklusif Super Admin': 'Showing up to 100 latest activities · Exclusive Super Admin access',
  'Hanya Super Admin yang dapat mengakses Log Aktivitas.': 'Only Super Admins can access the Activity Audit Log.',
  'Tidak ada aktivitas yang cocok dengan filter.': 'No activities match the active filter.',
  'Waktu': 'Timestamp', 'Detail': 'Details', 'Belum ada aktivitas tercatat.': 'No activity recorded yet.', 'Gagal memuat log.': 'Failed to load audit log.',
  'Login Admin': 'Admin Login', 'Login Gagal': 'Failed Login', 'Login Google': 'Google Login', 'PIN Benar': 'Valid PIN', 'PIN Salah': 'Wrong PIN',
  'Tanpa PIN': 'No PIN', 'Duplikat Ditolak': 'Duplicate Rejected', 'Sinkron Offline': 'Offline Sync', 'Buat Grup': 'Create Group',
  'Super Admin +': 'Add Super Admin', 'Super Admin -': 'Remove Super Admin',
  'Antrean Transaksi Offline': 'Offline Transaction Queue', 'Data tersimpan di perangkat lokal, siap disinkronkan ke server': 'Entries stored locally on this device, ready to sync with the server',
  'Online — siap sinkron': 'Online — ready to sync', 'Offline — tersimpan lokal': 'Offline — saved locally',
  'Semua tersinkron': 'All synced', 'Tidak ada transaksi tertunda.': 'No pending transactions.',
  'Gagal memuat antrean': 'Failed to load queue', 'Coba tekan Refresh.': 'Try pressing Refresh.', 'Catat Aktivitas': 'Log Activity',
  'Status antrean': 'Queue Status', 'Tersimpan lokal': 'Saved Locally', 'Sinkron Sekarang': 'Sync Now', 'Memuat antrean...': 'Loading queue...',
  'Tambah Transaksi': 'Add Transaction', 'Iuran Massal': 'Bulk Dues', 'Edit Transaksi': 'Edit Transaction',
  'Tambah Anggota': 'Add Member', 'Hapus Anggota': 'Delete Member', 'Status Anggota': 'Member Status',
  'Tambah Kategori': 'Add Category', 'Bulan Libur +': 'Add Exempt Month', 'Bulan Libur -': 'Remove Exempt Month',
  'Hapus Grup': 'Delete Group', 'Ubah Nama': 'Rename', 'Ubah PIN': 'Change PIN', 'Ubah Admin': 'Change Admin',
  // Reports & Export Modal (#modal-export)
  'Laporan & Ekspor Kas': 'Cash Reports & Export', 'Buku kas bulanan, rekapitulasi, cetak dokumen, dan cadangan data': 'Monthly cash statements, recaps, printable reports, and data backups',
  'Pilih periode bulan...': 'Select statement month...', 'Rekap & Cetak': 'Recaps & Print',
  'Ekspor seluruh riwayat transaksi grup ke berkas .csv': 'Export full group transaction history to a .csv spreadsheet',
  'Cadangan & Pemulihan Database': 'Database Backup & Restore', 'Simpan atau pulihkan seluruh data grup dalam format JSON': 'Save or restore all group data in JSON format',
  'Laporan Bulanan': 'Monthly Statement', 'Ekspor & Backup': 'Export & Backup', 'Periode Bulan (WIB)': 'Statement Month (WIB)',
  'Cetak Laporan': 'Print Statement',
  'Dihitung berdasarkan tanggal kalender transaksi (Asia/Jakarta, UTC+7), bukan periode iuran.': 'Calculated by transaction settlement date (Asia/Jakarta, UTC+7), independent of dues billing month.',
  'Saldo Awal': 'Opening Balance', 'Saldo Akhir': 'Closing Balance', 'Rincian Arus Kas': 'Cash Flow Statement',
  'Urutan Kronologis (WIB)': 'Chronological Order (WIB)', 'Keterangan / Transaksi': 'Description / Transaction', 'Saldo': 'Balance',
  'Salin Rekap Bulan Ini (WA)': 'Copy Monthly Recap (WA)',
  'Ringkasan masuk/keluar + daftar yang belum bayar siap tempel ke grup WA.': 'Formatted inflow/outflow summary + unpaid member list ready to paste into WhatsApp.',
  'Cetak Rekap Tahunan': 'Print Annual Dues Matrix', 'Cetak matriks status iuran anggota ke format PDF (A4 Landscape).': 'Print the 12-month member dues matrix to PDF (A4 Landscape).',
  'Unduh CSV spreadsheet lengkap': 'Download Full CSV Spreadsheet', 'Backup JSON': 'JSON Backup', 'Restore JSON': 'Restore JSON',
  'Laporan dihitung otomatis berdasarkan zona waktu WIB.': 'Statements are automatically calculated in WIB (UTC+7) timezone.',
  // Member Profile, Self-Pay & Receipt Modals
  'Buku Iuran Digital Anggota': 'Member Digital Dues Passbook', 'Riwayat setoran & kartu iuran 12 bulan': '12-month dues stamp card & personal payment history',
  'Total Kontribusi': 'Total Contribution', 'Riwayat Setoran Pribadi': 'Personal Payment History',
  'Bayar / Lapor': 'Pay / Report', 'Salin Ringkasan': 'Copy Summary', 'Setoran': 'Payment',
  'Hitung & Konfirmasi Bayar Iuran': 'Calculate & Confirm Dues Payment',
  'Pilih bulan iuran atau rapel, cek rekening bendahara, lalu kirim konfirmasi': 'Select due or advance months, check treasurer account details, and send confirmation',
  'Atas Nama Anggota': 'Member Name', 'Pilih Bulan Pembayaran (Tunggakan / Bayar Dimuka)': 'Select Months to Pay (Arrears / Advance)',
  'Bulan Ini': 'Current Month', 'Semua Tunggakan': 'All Arrears', 'Semua Belum': 'All Unpaid',
  'Rapel +2 Bulan': 'Advance +2 Months', 'Rapel +2': '+2 Months', 'Total Transfer': 'Total Transfer Amount',
  'Salin Nominal': 'Copy Amount', 'Bank Tujuan': 'Destination Account', 'Salin No. Rekening': 'Copy Account No.',
  'Draf Pesan Konfirmasi WhatsApp': 'WhatsApp Confirmation Message Draft', 'Buka WhatsApp untuk Konfirmasi': 'Open WhatsApp to Confirm',
  'Struk Digital Transaksi': 'Digital Transaction Receipt', 'Salin Struk': 'Copy Receipt', 'Unduh Bukti': 'Download Proof', 'Cetak Kwitansi': 'Print Receipt',
  // FAQ & Guide Modal (#modal-faq)
  'Penjelasan status iuran dan pertanyaan yang sering diajukan': 'Dues status glossary and answers to frequently asked questions',
  'Kamus Status': 'Status Glossary', 'Arti Status Iuran': 'Dues Status Meanings',
  'Setoran sudah memenuhi nominal iuran bulan itu.': 'Payment covers the full mandatory dues amount for that month.',
  'Sudah ada setoran. Angka di bawah status menunjukkan jumlah yang sudah dibayar.': 'Partial payment received. The amount below indicates how much has been paid so far.',
  'Iuran sudah jatuh tempo menurut kalender WIB dan belum ada setoran.': 'Dues are currently due or past due in WIB calendar with no payment recorded yet.',
  'Iuran belum jatuh tempo dan belum ada setoran.': 'Future month not yet due, with no advance payment recorded.',
  'Bulan tidak ditagih karena diliburkan, kas belum dimulai, atau anggota belum bergabung.': 'Month is not billed because it is an exempt holiday, prior to ledger start, or before member joined.',
  'Ulangi Tur': 'Replay Guided Tour',
  'Siapa yang bisa mencatat transaksi?': 'Who can record transactions?',
  'Hanya Pengurus/Admin yang telah memasukkan kata sandi admin. Anggota umum dapat melihat saldo dan rekap iuran secara transparan.': 'Only Group Admins signed in with the admin password can record or edit entries. All members can transparently view balances and dues.',
  'Apakah data kas kelompok aman?': 'Is our group ledger data secure?',
  'Data disimpan di Cloud Firestore dan hanya bisa diakses lewat server aplikasi — tidak ada koneksi langsung dari browser ke database. Setiap kelompok terisolasi dan dilindungi PIN 4 digit, dengan pembatasan jumlah percobaan di sisi server.': 'Data is stored in Cloud Firestore and accessed strictly through the application server. Every group is isolated and protected by a 4-digit PIN with server-side rate limiting.',
  'Bagaimana cara menyalin laporan ke WA?': 'How do I copy a report to WhatsApp?',
  'Buka menu "Ekspor Data" lalu pilih "Salin Rekap Bulan Ini (WA)". Pesan otomatis terformat rapi dan siap ditempel langsung ke grup chat.': 'Open "Reports & Data Export" and click "Copy Monthly Recap (WA)". A clean summary is copied to your clipboard ready to paste in your group chat.',
  'Bisa mencatat tanpa koneksi internet?': 'Can I record transactions offline?',
  'Bisa. Transaksi akan disimpan di Antrean Offline lokal (IndexedDB) dan otomatis disinkronkan saat ponsel kembali terhubung ke internet.': 'Yes. Transactions are stored in your device Offline Queue (IndexedDB) and automatically synced when connectivity returns.',
  'Bagaimana jika berganti perangkat?': 'What if I switch devices?',
  'Cukup buka tautan Finkas, pilih nama kelompok Anda di daftar kelompok, lalu masukkan 4-digit PIN kelompok.': 'Simply open Finkas on your new device, select your group from the list, and enter your 4-digit group PIN.',
  'Panduan ringkas transparansi buku kas warga.': 'Quick reference guide for transparent community bookkeeping.',
  // Kasi Mascot & Guided Tour
  'Elus': 'Pet', 'Koin': 'Coin', 'Ikan': 'Fish', 'Salto': 'Flip', 'Panduan': 'Guide',
  'Lewati Tur': 'Skip Tour', 'Lewati': 'Skip', 'Kembali': 'Back', 'Lanjut': 'Next',
  'Ringkasan Saldo & Tren': 'Balance & Trend Overview',
  'Lihat saldo aktif dan geser penanda grafik untuk memeriksa saldo setiap bulan.': 'View your active balance and scrub the sparkline to inspect each month.',
  'Lunasi iuran bulan berjalan atau pilih beberapa sel untuk pembayaran massal.': 'Settle current-month arrears in one click or select multiple cells for bulk payment.',
  'Sematkan nama untuk memeriksa status 12 bulan dan membuka kalkulator iuran.': 'Pin your name to track your 12-month dues status and open the payment calculator.',
  'Status dan Arsip Tahun': 'Status Guide & Year Archive',
  'Berpindah antara Status Iuran, Riwayat Arus Kas, dan Kesehatan & Grafik Kas.': 'Switch seamlessly between the Dues Matrix, Cash Flow Ledger, and Analytics & Charts.'
};

const PATTERN_EN: Array<[RegExp, (match:string, ...groups:string[]) => string]> = [
  [/^Iuran\s+(.+)\/bln$/i, (_, amt) => `Dues ${amt}/mo`],
  [/^(\d+)\s+anggota aktif$/i, (_, n) => `${n} active members`],
  [/^(\d+)\s+anggota$/i, (_, n) => `${n} members`],
  [/^(\d+)\s+Orang$/i, (_, n) => `${n} Members`],
  [/^Awal kas:\s*(.+)$/i, (_, d) => `Since: ${trMonths(d)}`],
  [/^(\d+)%\s+Lunas Tahun Ini$/i, (_, p) => `${p}% Paid This Year`],
  [/^Dari\s+(\d+)\s+setoran iuran & donasi$/i, (_, n) => `From ${n} dues & donation inflows`],
  [/^(\d+)\s+setoran tercatat$/i, (_, n) => `${n} inflows recorded`],
  [/^(\d+)\s+pengeluaran tercatat$/i, (_, n) => `${n} outflows recorded`],
  [/^Terbesar:\s*(.+)$/i, (_, rest) => `Largest: ${rest}`],
  [/^Tunggakan Prioritas\s*\((.+)\)$/i, (_, m) => `Priority Arrears (${trMonths(m)})`],
  [/^(\d+)\s+anggota belum lunas\s+(.+)$/i, (_, n, m) => `${n} members unpaid for ${trMonths(m)}`],
  [/^Lunasi\s+(.+)$/i, (_, m) => `Pay ${trMonths(m)}`],
  [/^(\d+)\s+dipilih\s*·\s*(.+)$/i, (_, n, amt) => `${n} selected · ${amt}`],
  [/^Semua\s*\((\d+)\)$/i, (_, n) => `All (${n})`],
  [/^Nunggak\s*\((\d+)\)$/i, (_, n) => `Overdue (${n})`],
  [/^Lunas\s*\((\d+)\)$/i, (_, n) => `Paid (${n})`],
  [/^Masuk\s*\((\d+)\)$/i, (_, n) => `Inflow (${n})`],
  [/^Keluar\s*\((\d+)\)$/i, (_, n) => `Outflow (${n})`],
  [/^(\d+\/\d+)\s+lunas$/i, (_, r) => `${r} paid`],
  [/^(\d+\/\d+)\s*·\s*nunggak\s+(\d+)$/i, (_, r, n) => `${r} · ${n} overdue`],
  [/^(\d+)\s+Nunggak$/i, (_, n) => `${n} Overdue`],
  [/^(\d+)\s+Tunggakan$/i, (_, n) => `${n} Overdue`],
  [/^(\d+)\s+Bulan Tertunggak$/i, (_, n) => `${n} Months Overdue`],
  [/^(\d+)\s+Bulan Belum Lunas\s*\((.+)\)$/i, (_, n, amt) => `${n} Months Unpaid (${amt})`],
  [/^(\d+)\s+bulan tertunggak\s*\((.+)\)$/i, (_, n, amt) => `${n} months overdue (${amt})`],
  [/^Tunggakan\s+(.+)$/i, (_, amt) => `Arrears ${amt}`],
  [/^Tabungan\s+\+(\d+)\s+bln$/i, (_, n) => `+${n} mo credit`],
  [/^Sisa\s+(.+)$/i, (_, amt) => `Rem. ${amt}`],
  [/^Kurang\s+(.+)$/i, (_, amt) => `Short ${amt}`],
  [/^Menampilkan\s+(\d+)\s+transaksi$/i, (_, n) => `Showing ${n} transactions`],
  [/^(?:Menampilkan\s+)?([\d–-]+)\s+dari\s+(\d+)\s+anggota$/i, (_, r, t) => `${r} of ${t} members`],
  [/^(?:Menampilkan\s+)?([\d–-]+)\s+dari\s+(\d+)\s+transaksi$/i, (_, r, t) => `${r} of ${t} transactions`],
  [/^(\d+)\s+dari\s+(\d+)$/i, (_, a, b) => `${a} of ${b}`],
  [/^dari\s+(\d+)$/i, (_, n) => `of ${n}`],
  [/^Langkah\s+(\d+)\s+dari\s+(\d+)$/i, (_, a, b) => `Step ${a} of ${b}`],
  [/^Kartu Cap Iuran\s+(\d{4})$/i, (_, y) => `Dues Stamp Card ${y}`],
  [/^Tidak ada transaksi tercatat pada periode\s+(.+)\.$/i, (_, p) => `No transactions recorded for period ${p}.`],
  [/^Arus Kas Bulanan & Tren Saldo\s*\(?(\d{4})\)?$/i, (_, y) => `Monthly Cash Flow & Balance Trend (${y})`],
  [/^Tingkat Kepatuhan Iuran\s*\(?(\d{4})\)?$/i, (_, y) => `Dues Compliance Rate (${y})`],
  [/^(\d+\/\d+)\s+anggota lunas hingga bulan berjalan$/i, (_, r) => `${r} members paid through current month`],
  [/^([A-Za-z]+)\s*·\s*Masuk\s+(.+)\s*·\s*Keluar\s+(.+)\s*·\s*Saldo\s+(.+)$/i, (_, m, i, o, b) => `${trMonths(m)} · Inflow ${i} · Outflow ${o} · Balance ${b}`],
  [/^Iuran\s+([A-Za-z]+)\s+(\d{4})$/i, (_, m, y) => `Dues ${trMonths(m)} ${y}`],
  [/^Iuran\s+([A-Za-z]+)\s*·\s*(.+)$/i, (_, m, who) => `Dues ${trMonths(m)} · ${who}`],
  [/^SEBAGIAN\s*\(Sisa\s+(.+)\)$/i, (_, amt) => `PARTIAL (Rem. ${amt})`],
  [/^(\d+)\s+dipilih$/i, (_, n) => `${n} selected`],
  [/^(\d+)\s+anggota\s*×\s*(.+)$/i, (_, n, amt) => `${n} ${Number(n) === 1 ? 'member' : 'members'} × ${amt}`],
  [/^(Pengeluaran|Pemasukan)\s*\(([−+-])\)\s*·\s*(.+)$/i, (_, t, s, amt) => `${t === 'Pemasukan' ? 'Inflow' : 'Outflow'} (${s}) · ${amt}`],
  [/^\+(\d+)\s+lainnya$/i, (_, n) => `+${n} more`],
  [/^Tagihan bulanan\s+(.+)$/i, (_, amt) => `Monthly dues ${amt}`],
  [/^Sudah bayar\s+(.+)\s*·\s*Sisa\s+(.+)$/i, (_, paid, rem) => `Paid ${paid} · Rem. ${rem}`],
  [/^Bayar Sebagian\s*\(Sisa\s+(.+)\)$/i, (_, rem) => `Partial Payment (Rem. ${rem})`],
  [/^Saldo:\s*(.+)\s*→\s*(.+)$/i, (_, a, b) => `Balance: ${a} → ${b}`],
  [/^(\d+)\s+aktif$/i, (_, n) => `${n} active`],
  [/^(\d+)\s+aktif\s*·\s*(\d+)\s+nonaktif$/i, (_, a, b) => `${a} active · ${b} inactive`],
  [/^(\d+)\s+transaksi menunggu sinkronisasi$/i, (_, n) => `${n} transactions awaiting sync`],
  [/^Grup:\s*(.+)$/i, (_, g) => `Group: ${g}`],
  [/^(\d+)\s+grup$/i, (_, n) => `${n} ${Number(n) === 1 ? 'group' : 'groups'}`],
  [/^(\d+)\s+entri$/i, (_, n) => `${n} ${Number(n) === 1 ? 'entry' : 'entries'}`],
  [/^(\d+)\s*\/\s*(\d+)\s+entri$/i, (_, a, b) => `${a} / ${b} entries`],
  [/^(\d+)\s+tertunda$/i, (_, n) => `${n} pending`],
  [/^(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})$/i, (_, m, y) => `${trMonths(m)} ${y}`]
];

const translateToEn = (trimmed: string) => {
  if (!trimmed) return null;
  if (Object.prototype.hasOwnProperty.call(EXACT_EN, trimmed)) return EXACT_EN[trimmed];
  for (const [regex, replacer] of PATTERN_EN) {
    if (regex.test(trimmed)) return trimmed.replace(regex, replacer);
  }
  return null;
};

const origTextMap = new WeakMap<Node, string>();
const lastEnTextMap = new WeakMap<Node, string>();
const origAttrMap = new WeakMap<Element, Record<string, string>>();
const lastEnAttrMap = new WeakMap<Element, Record<string, string>>();
const I18N_ATTRS = ['placeholder', 'title', 'aria-label'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE']);
let i18nObserver: MutationObserver | null = null;
let isApplyingI18n = false;

const translateSubtree = (root: Element, isEn: boolean) => {
  if (!root || typeof document === 'undefined') return;
  isApplyingI18n = true;
  try {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (parent && !SKIP_TAGS.has(parent.tagName)) {
        const raw = node.nodeValue || '';
        const trimmed = raw.trim();
        if (trimmed) {
          if (isEn) {
            if (raw !== lastEnTextMap.get(node)) origTextMap.set(node, raw);
            const baseRaw = origTextMap.get(node) ?? raw;
            const baseTrim = baseRaw.trim();
            const enTrim = translateToEn(baseTrim);
            if (enTrim && enTrim !== baseTrim) {
              const nextRaw = baseRaw.replace(baseTrim, enTrim);
              lastEnTextMap.set(node, nextRaw);
              if (node.nodeValue !== nextRaw) node.nodeValue = nextRaw;
            }
          } else if (origTextMap.has(node)) {
            const orig = origTextMap.get(node);
            if (raw === lastEnTextMap.get(node) && node.nodeValue !== orig) {
              node.nodeValue = orig ?? raw;
            }
          }
        }
      }
      node = walker.nextNode();
    }

    const els = root.querySelectorAll ? root.querySelectorAll('[placeholder],[title],[aria-label]') : [];
    for (const el of els) {
      let origObj = origAttrMap.get(el);
      let lastEnObj = lastEnAttrMap.get(el);
      if (!origObj) { origObj = {}; origAttrMap.set(el, origObj); }
      if (!lastEnObj) { lastEnObj = {}; lastEnAttrMap.set(el, lastEnObj); }
      for (const attr of I18N_ATTRS) {
        const val = el.getAttribute(attr);
        if (!val) continue;
        if (isEn) {
          if (val !== lastEnObj[attr]) origObj[attr] = val;
          const baseVal = (origObj[attr] ?? val).trim();
          const enVal = translateToEn(baseVal);
          if (enVal && enVal !== baseVal) {
            lastEnObj[attr] = enVal;
            if (el.getAttribute(attr) !== enVal) el.setAttribute(attr, enVal);
          }
        } else if (origObj[attr] && val === lastEnObj[attr]) {
          el.setAttribute(attr, origObj[attr]);
        }
      }
    }
  } finally {
    i18nObserver?.takeRecords?.();
    isApplyingI18n = false;
  }
};

const pendingRoots = new Set<Element>();
let flushScheduled = false;
const scheduleFlush = () => {
  if (flushScheduled) return;
  flushScheduled = true;
  queueMicrotask(() => {
    flushScheduled = false;
    if (isApplyingI18n || getLanguage() !== 'en') {
      pendingRoots.clear();
      return;
    }
    const roots = Array.from(pendingRoots);
    pendingRoots.clear();
    for (const root of roots) {
      if (!root || !root.isConnected) continue;
      if (roots.some((other) => other !== root && other.contains?.(root))) continue;
      translateSubtree(root, true);
    }
  });
};

/**
 * Get the active interface language ('id' | 'en').
 */
export const getLanguage = () => {
  try {
    return localStorage.getItem('finkas_lang') === 'en' ? 'en' : 'id';
  } catch (_) {
    return 'id';
  }
};

/**
 * Apply the saved interface language across document.body and manage the DOM observer.
 */
export const applyLanguagePreference = () => {
  const lang = getLanguage();
  const isEn = lang === 'en';
  if (typeof document === 'undefined' || !document.body) return;
  document.documentElement.lang = lang;
  document.body.dataset.lang = lang;

  htmlElements('[data-action="select-language"]').forEach((btn) => {
    const active = btn.dataset.lang === lang;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  translateSubtree(document.body, isEn);

  if (isEn) {
    if (!i18nObserver && typeof MutationObserver !== 'undefined') {
      i18nObserver = new MutationObserver((mutations) => {
        if (isApplyingI18n || getLanguage() !== 'en') return;
        for (const m of mutations) {
          if (m.type === 'characterData' && m.target?.parentElement) {
            pendingRoots.add(m.target.parentElement);
          } else if (m.type === 'childList' && m.target instanceof Element) {
            pendingRoots.add(m.target);
          }
        }
        if (pendingRoots.size) scheduleFlush();
      });
      i18nObserver.observe(document.body, { childList: true, characterData: true, subtree: true });
    }
  } else if (i18nObserver) {
    pendingRoots.clear();
    i18nObserver.disconnect();
    i18nObserver = null;
  }

  if (typeof CustomEvent !== 'undefined') {
    document.dispatchEvent(new CustomEvent('finkas:language-changed', { detail: { lang } }));
  }
};

/**
 * Persist and apply the interface language ('id' | 'en').
 */
export const setLanguage = (langKey: 'id'|'en') => {
  const next = langKey === 'en' ? 'en' : 'id';
  try {
    localStorage.setItem('finkas_lang', next);
  } catch (_) {}
  applyLanguagePreference();
};
