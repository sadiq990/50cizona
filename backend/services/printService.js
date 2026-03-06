'use strict';

/**
 * printService.js — Windows Native Raw Printer (No Zadig / No WinUSB)
 *
 * HOW IT WORKS:
 *  1. Builds an ESC/POS binary buffer for the receipt
 *  2. Writes it to a temp .prn file
 *  3. Uses PowerShell + Win32 RawPrinter API (winspool.drv) to send the
 *     raw bytes directly to the printer by its Windows printer name.
 *
 * SETUP (production):
 *  - Plug in Epson XP-80 via USB → Windows installs driver automatically
 *  - Note the printer name from Control Panel → Printers
 *    (e.g. "EPSON TM-T20 Receipt" or "EPSON XP-80 Series")
 *  - Set that name in Admin → Çap Parametrləri → Printer Adı (Windows)
 *
 * No Zadig. No WinUSB. No extra npm packages. Works alongside any other app.
 */

const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const db = require('../database');

// ─── ESC/POS constants ───────────────────────────────────────────────────────
const ESC = 0x1B;
const GS = 0x1D;

const CMD = {
    INIT: Buffer.from([ESC, 0x40]),
    ALIGN_LEFT: Buffer.from([ESC, 0x61, 0x00]),
    ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]),
    ALIGN_RIGHT: Buffer.from([ESC, 0x61, 0x02]),
    BOLD_ON: Buffer.from([ESC, 0x45, 0x01]),
    BOLD_OFF: Buffer.from([ESC, 0x45, 0x00]),
    DOUBLE_ON: Buffer.from([GS, 0x21, 0x11]),   // 2x width + 2x height
    DOUBLE_OFF: Buffer.from([GS, 0x21, 0x00]),
    LF: Buffer.from([0x0A]),
    CUT: Buffer.from([GS, 0x56, 0x42, 0x00]),  // full cut
    UNDERLINE_ON: Buffer.from([ESC, 0x2D, 0x01]),
    UNDERLINE_OFF: Buffer.from([ESC, 0x2D, 0x00]),
};

const LINE_WIDTH = 42;   // chars for 80mm receipt at default font

// ─── Text helpers ─────────────────────────────────────────────────────────────

function txt(str) { return Buffer.from(String(str ?? ''), 'latin1'); }

function pad(str, len, align = 'left') {
    str = String(str ?? '');
    if (str.length > len) str = str.substring(0, len);
    if (align === 'right') return txt(str.padStart(len));
    if (align === 'center') {
        const total = len - str.length;
        const l = Math.floor(total / 2);
        return txt(' '.repeat(l) + str + ' '.repeat(total - l));
    }
    return txt(str.padEnd(len));
}

function lr(left, right) {
    const space = LINE_WIDTH - left.length - right.length;
    const line = space >= 1
        ? left + ' '.repeat(space) + right
        : left.substring(0, LINE_WIDTH - right.length - 1) + ' ' + right;
    return txt(line);
}

function divider(char = '-') { return txt(char.repeat(LINE_WIDTH)); }
function money(v) { return parseFloat(v || 0).toFixed(2) + ' AZN'; }

function formatDate(dt) {
    const d = dt ? new Date(dt) : new Date();
    const D = String(d.getDate()).padStart(2, '0');
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const Y = d.getFullYear();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${D}.${M}.${Y} ${h}:${m}`;
}

// ─── Build ESC/POS buffer ────────────────────────────────────────────────────

function buildBuffer(session, items, waiterName) {
    const settings = getSettings();
    const businessName = (settings.business_name || '50-ci Zona Cay Evi').substring(0, LINE_WIDTH);

    const parts = [];
    const p = (...bufs) => parts.push(...bufs);

    p(CMD.INIT);
    p(CMD.ALIGN_CENTER, CMD.BOLD_ON, txt(businessName), CMD.LF);
    p(txt('* * * * *'), CMD.LF, CMD.BOLD_OFF);
    p(CMD.ALIGN_LEFT, CMD.LF);

    p(lr('Hesab #:', String(session.id)), CMD.LF);
    p(lr('Tarix:', formatDate(session.ended_at || session.started_at)), CMD.LF);
    p(lr('Masa:', 'Masa ' + (session.table_number || '?')), CMD.LF);
    p(lr('Ofisant:', waiterName || 'N/A'), CMD.LF);
    p(divider(), CMD.LF);

    // Column header
    p(pad('Mehsul', 20),
        pad('Miq', 4, 'right'),
        pad('Qiym', 8, 'right'),
        pad('Cemi', 10, 'right'),
        CMD.LF);
    p(divider(), CMD.LF);

    let subtotal = 0;
    for (const item of items) {
        const name = String(item.product_name || '').substring(0, 20);
        const qty = String(item.quantity).padStart(4);
        const price = parseFloat(item.unit_price || 0).toFixed(2).padStart(8);
        const line = parseFloat(item.line_total || item.quantity * item.unit_price || 0);
        const total = line.toFixed(2).padStart(10);
        subtotal += line;

        p(txt(name.padEnd(20) + qty + price + total), CMD.LF);
    }

    p(divider(), CMD.LF);

    const discount = parseFloat(session.discount || 0);
    const tax = parseFloat(session.tax || 0);
    const grand = subtotal - discount + tax;

    if (discount > 0) {
        p(lr('  Ara cem:', money(subtotal)), CMD.LF);
        p(lr('  Endirim:', '-' + money(discount)), CMD.LF);
    }
    if (tax > 0) {
        p(lr('  Vergi:', money(tax)), CMD.LF);
    }

    // Grand total — bold + double size
    p(CMD.BOLD_ON);
    p(lr('  UMUMI CEM:', money(grand)), CMD.LF);
    p(CMD.BOLD_OFF);

    p(divider('='), CMD.LF);
    p(lr('Odenis:', session.payment_method || 'Nagd'), CMD.LF, CMD.LF);
    p(CMD.ALIGN_CENTER);
    p(txt('Xidmətinizdən məmnunuq!'), CMD.LF);
    p(txt('Tesekkur edirik. Yene gelin!'), CMD.LF);
    p(CMD.LF, CMD.LF, CMD.LF);
    p(CMD.CUT);

    return Buffer.concat(parts);
}

// ─── PowerShell raw print helper ─────────────────────────────────────────────

/**
 * Sends raw bytes to a Windows printer by name using winspool.drv via PowerShell.
 * No Zadig, no WinUSB — works with the standard Epson USB driver.
 */
function printRawWindows(printerName, dataBuffer) {
    return new Promise((resolve, reject) => {
        // Write to temp file
        const tmpFile = path.join(os.tmpdir(), `receipt_${Date.now()}.prn`).replace(/\\/g, '\\\\');
        const tmpFileReal = tmpFile.replace(/\\\\/g, '\\');
        fs.writeFileSync(tmpFileReal, dataBuffer);

        // PowerShell script — Win32 RawPrinter API via P/Invoke
        const ps = `
$printerName = "${printerName.replace(/"/g, '\\"')}"
$fileName    = "${tmpFile}"

Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinter {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public class DOC_INFO_1 {
        [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
    }
    [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);
    [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern Int32 StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOC_INFO_1 di);
    [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);
    [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    public static bool SendFileToPrinter(string printerName, string filePath) {
        IntPtr hPrinter;
        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) return false;
        var di = new DOC_INFO_1 { pDocName = "Receipt", pOutputFile = null, pDataType = "RAW" };
        if (StartDocPrinter(hPrinter, 1, di) == 0) { ClosePrinter(hPrinter); return false; }
        StartPagePrinter(hPrinter);
        byte[] bytes = File.ReadAllBytes(filePath);
        IntPtr pBytes = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, pBytes, bytes.Length);
        Int32 written;
        bool success = WritePrinter(hPrinter, pBytes, bytes.Length, out written);
        Marshal.FreeCoTaskMem(pBytes);
        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        return success;
    }
}
"@

$result = [RawPrinter]::SendFileToPrinter($printerName, $fileName)
Remove-Item $fileName -ErrorAction SilentlyContinue
if ($result) { Write-Output "OK" } else { exit 1 }
`;

        execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { timeout: 15000 },
            (err, stdout, stderr) => {
                // Clean up temp file if PS didn't
                try { fs.unlinkSync(tmpFileReal); } catch (_) { }

                if (err) {
                    reject(new Error((stderr || err.message || 'PowerShell print failed').trim()));
                } else if ((stdout || '').trim() === 'OK') {
                    resolve();
                } else {
                    reject(new Error('Printer returned error. Printer adını yoxlayın.'));
                }
            }
        );
    });
}

// ─── Settings reader ─────────────────────────────────────────────────────────

function getSettings() {
    try {
        const rows = db.prepare('SELECT key, value FROM settings').all();
        const s = {};
        rows.forEach(r => { s[r.key] = r.value; });
        return s;
    } catch { return {}; }
}

// ─── List Windows printers (for auto-detect) ─────────────────────────────────

function listWindowsPrinters() {
    return new Promise((resolve) => {
        execFile('powershell', [
            '-NoProfile', '-NonInteractive', '-Command',
            'Get-Printer | Select-Object -ExpandProperty Name | ConvertTo-Json'
        ], { timeout: 8000 }, (err, stdout) => {
            if (err || !stdout) return resolve([]);
            try {
                const list = JSON.parse(stdout.trim());
                resolve(Array.isArray(list) ? list : [list]);
            } catch { resolve([]); }
        });
    });
}

// ─── Main print function ──────────────────────────────────────────────────────

/**
 * Print a receipt.
 * Returns: { success: true } or { success: false, error: string }
 */
async function printReceipt(session, items, waiterName) {
    try {
        const settings = getSettings();
        let printerName = (settings.printer_name || '').trim();

        if (!printerName) {
            // Auto-detect: find first Epson printer in Windows
            const printers = await listWindowsPrinters();
            const epson = printers.find(p =>
                p.toLowerCase().includes('epson') ||
                p.toLowerCase().includes('tm-') ||
                p.toLowerCase().includes('receipt') ||
                p.toLowerCase().includes('xp-80') ||
                p.toLowerCase().includes('kassa')
            );
            if (!epson) {
                return {
                    success: false,
                    error: 'Printer tapılmadı. Admin → Çap Parametrləri-ndə printer adını daxil edin.'
                };
            }
            printerName = epson;
            console.log('🖨️  Auto-detected printer:', printerName);
        }

        const buf = buildBuffer(session, items, waiterName);
        await printRawWindows(printerName, buf);
        return { success: true };

    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ─── Log helper ──────────────────────────────────────────────────────────────

function logPrint(sessionId, status, errorMsg, printedBy) {
    try {
        db.prepare(
            'INSERT INTO print_log (session_id, status, error_msg, printed_by) VALUES (?, ?, ?, ?)'
        ).run(sessionId, status, errorMsg || null, printedBy || null);
    } catch (e) {
        console.error('print_log insert error:', e.message);
    }
}

module.exports = { printReceipt, buildBuffer, logPrint, getSettings, listWindowsPrinters };
