/**
 * ============================================================================
 * SCRIPT OTOMATISASI SETUP DATABASE KAS (TANPA LOGIN)
 * ============================================================================
 * Fungsi ini akan membuat Sheet dan Header secara otomatis.
 * Menerapkan prinsip idempotency: Jika sheet sudah ada, tidak akan error.
 */

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. SETUP TABEL ANGGOTA
  let sheetAnggota = ss.getSheetByName("Anggota");
  if (!sheetAnggota) {
    sheetAnggota = ss.insertSheet("Anggota");
    const headerAnggota = ["ID_Anggota", "Nama_Anggota", "Nomor_WA", "Status_Aktif"];
    sheetAnggota.appendRow(headerAnggota);
    formatHeader(sheetAnggota);
    
    // Insert Data Dummy Awal
    sheetAnggota.appendRow(["ANG-001", "Budi Santoso", "08123456789", "Aktif"]);
    sheetAnggota.appendRow(["ANG-002", "Siti Aminah", "08987654321", "Aktif"]);
  }

  // 2. SETUP TABEL KATEGORI
  let sheetKategori = ss.getSheetByName("Kategori");
  if (!sheetKategori) {
    sheetKategori = ss.insertSheet("Kategori");
    const headerKategori = ["ID_Kategori", "Tipe", "Nama_Kategori"];
    sheetKategori.appendRow(headerKategori);
    formatHeader(sheetKategori);
    
    // Insert Data Default Kategori
    const defaultKategori = [
      ["KAT-M01", "Masuk", "Iuran Bulanan Wajib"],
      ["KAT-M02", "Masuk", "Donasi / Sumbangan"],
      ["KAT-K01", "Keluar", "Konsumsi Rapat"],
      ["KAT-K02", "Keluar", "Operasional / Fotokopi"]
    ];
    sheetKategori.getRange(2, 1, defaultKategori.length, 3).setValues(defaultKategori);
  }

  // 3. SETUP TABEL TRANSAKSI
  let sheetTransaksi = ss.getSheetByName("Transaksi");
  if (!sheetTransaksi) {
    sheetTransaksi = ss.insertSheet("Transaksi");
    // Kolom Bulan_Iuran & Tahun_Iuran khusus untuk melacak iuran rutin
    const headerTransaksi = [
      "ID_Transaksi", "Timestamp", "Tipe_Arus", "ID_Kategori", 
      "ID_Anggota", "Bulan_Iuran", "Tahun_Iuran", "Nominal", "Keterangan"
    ];
    sheetTransaksi.appendRow(headerTransaksi);
    formatHeader(sheetTransaksi);
  }

  // Hapus "Sheet1" bawaan yang kosong jika ada
  const sheet1 = ss.getSheetByName("Sheet1");
  if (sheet1) {
    ss.deleteSheet(sheet1);
  }

  SpreadsheetApp.getUi().alert("✅ Berhasil! Struktur Database berhasil dibuat.");
}

/**
 * Helper function untuk merapikan visual Header Tabel
 */
function formatHeader(sheet) {
  const range = sheet.getRange("A1:Z1");
  range.setFontWeight("bold");
  range.setBackground("#4CAF50"); // Warna hijau khas uang/kas
  range.setFontColor("white");
  sheet.setFrozenRows(1); // Bekukan baris pertama agar header tidak ikut scroll
  sheet.autoResizeColumns(1, sheet.getLastColumn());
}