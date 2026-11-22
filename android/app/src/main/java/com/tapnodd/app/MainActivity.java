package com.tapnodd.app;

import android.app.DownloadManager;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.CookieManager;
import android.webkit.URLUtil;
import android.webkit.WebView;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * TapNodd shell. The web app runs inside Capacitor's web view; this adds what a web view lacks:
 * saving files the app offers for download (vCards, calendar files, QR images, CSV exports).
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView web = getBridge().getWebView();
        web.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            try {
                if (url.startsWith("data:")) saveDataUrl(url, mimeType);
                else if (url.startsWith("http")) download(url, userAgent, contentDisposition, mimeType);
            } catch (Exception e) {
                Toast.makeText(this, "Could not save the file", Toast.LENGTH_SHORT).show();
            }
        });
    }

    /** Server files (signed-in requests keep the session cookie) go through Android's download manager. */
    private void download(String url, String userAgent, String disposition, String mime) {
        String name = URLUtil.guessFileName(url, disposition, mime);
        DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
        String cookies = CookieManager.getInstance().getCookie(url);
        if (cookies != null) req.addRequestHeader("Cookie", cookies);
        req.addRequestHeader("User-Agent", userAgent);
        req.setMimeType(mime);
        req.setTitle(name);
        req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
        ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(req);
        Toast.makeText(this, "Downloading " + name, Toast.LENGTH_SHORT).show();
    }

    /** Files made in the page itself (the QR image) arrive as data: URLs; write them to Downloads. */
    private void saveDataUrl(String url, String mime) throws Exception {
        int comma = url.indexOf(',');
        String meta = url.substring(5, comma);
        byte[] bytes = meta.endsWith(";base64") ? Base64.decode(url.substring(comma + 1), Base64.DEFAULT) : Uri.decode(url.substring(comma + 1)).getBytes("UTF-8");
        String type = meta.split(";")[0];
        if (type.isEmpty()) type = mime != null ? mime : "application/octet-stream";
        String ext = type.contains("png") ? ".png" : type.contains("jpeg") ? ".jpg" : type.contains("vcard") ? ".vcf" : type.contains("csv") ? ".csv" : "";
        String name = "tapnodd-" + System.currentTimeMillis() + ext;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues v = new ContentValues();
            v.put(MediaStore.Downloads.DISPLAY_NAME, name);
            v.put(MediaStore.Downloads.MIME_TYPE, type);
            Uri out = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            try (OutputStream os = getContentResolver().openOutputStream(out)) { os.write(bytes); }
        } else {
            File f = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), name);
            try (FileOutputStream os = new FileOutputStream(f)) { os.write(bytes); }
        }
        Toast.makeText(this, "Saved to Downloads", Toast.LENGTH_SHORT).show();
    }
}
