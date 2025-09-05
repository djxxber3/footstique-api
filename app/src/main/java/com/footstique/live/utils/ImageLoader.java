package com.footstique.live.utils;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Handler;
import android.os.Looper;
import android.util.LruCache;
import android.widget.ImageView;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Map;
import java.util.WeakHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * A simple image loader utility class that loads images from URLs
 * with both memory and disk caching.
 */
public class ImageLoader {

    private static final ExecutorService executor = Executors.newFixedThreadPool(5);
    private static final Handler mainHandler = new Handler(Looper.getMainLooper());

    // Memory cache (1/8th of available app memory)
    private static final LruCache<String, Bitmap> memoryCache = new LruCache<String, Bitmap>(
            (int) (Runtime.getRuntime().maxMemory() / 1024 / 8)
    ) {
        @Override
        protected int sizeOf(String key, Bitmap value) {
            return value.getByteCount() / 1024;
        }
    };

    // Tracks the last request for each ImageView to prevent displaying the wrong image after recycling
    private static final Map<ImageView, String> requestMap =
            Collections.synchronizedMap(new WeakHashMap<>());

    /**
     * Loads an image from a URL into an ImageView with memory and disk cache.
     */
    public static void loadImage(String url, ImageView imageView, int placeholderResId) {
        if (url == null || url.isEmpty()) {
            imageView.setImageResource(placeholderResId);
            return;
        }

        // Set a temporary placeholder and associate it with the current request
        imageView.setImageResource(placeholderResId);
        requestMap.put(imageView, url);

        // 1) Check memory cache
        Bitmap cached = memoryCache.get(url);
        if (cached != null && !cached.isRecycled()) {
            mainHandler.post(() -> {
                if (url.equals(requestMap.get(imageView))) {
                    imageView.setImageBitmap(cached);
                }
            });
            return;
        }

        // 2) In the background: check disk cache, then download if needed
        executor.execute(() -> {
            Bitmap result = null;
            try {
                Context appCtx = imageView.getContext().getApplicationContext();
                File cacheFile = getCacheFile(appCtx, url);

                // From disk
                if (cacheFile.exists() && cacheFile.length() > 0) {
                    result = BitmapFactory.decodeFile(cacheFile.getAbsolutePath());
                    if (result != null) {
                        memoryCache.put(url, result);
                    }
                } else {
                    // From network -> save to disk then decode
                    if (downloadToDisk(url, cacheFile)) {
                        result = BitmapFactory.decodeFile(cacheFile.getAbsolutePath());
                        if (result != null) {
                            memoryCache.put(url, result);
                            // Limit cache size to ~30MB by removing oldest files
                            trimDiskCache(cacheFile.getParentFile(), 30L * 1024L * 1024L);
                        }
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }

            final Bitmap bmp = result;
            mainHandler.post(() -> {
                if (bmp != null && url.equals(requestMap.get(imageView))) {
                    imageView.setImageBitmap(bmp);
                }
            });
        });
    }

    // === Disk Cache Utilities ===

    private static File getCacheFile(Context ctx, String url) {
        File dir = new File(ctx.getCacheDir(), "image_cache");
        if (!dir.exists()) {
            dir.mkdirs();
        }
        String ext = getExtension(url);
        return new File(dir, sha256(url) + "." + ext);
    }

    private static String getExtension(String url) {
        try {
            String clean = url;
            int q = clean.indexOf('?');
            if (q >= 0) clean = clean.substring(0, q);
            int h = clean.indexOf('#');
            if (h >= 0) clean = clean.substring(0, h);
            int dot = clean.lastIndexOf('.');
            if (dot >= 0 && dot < clean.length() - 1) {
                String ext = clean.substring(dot + 1).toLowerCase();
                if (ext.length() <= 5) return ext;
            }
        } catch (Exception ignored) {}
        return "img";
    }

    private static String sha256(String s) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] dig = md.digest(s.getBytes("UTF-8"));
            StringBuilder sb = new StringBuilder(dig.length * 2);
            for (byte b : dig) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return Integer.toHexString(s.hashCode());
        }
    }

    private static boolean downloadToDisk(String imageUrl, File outFile) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(imageUrl);
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);
            connection.connect();

            if (connection.getResponseCode() == HttpURLConnection.HTTP_OK) {
                File tmp = new File(outFile.getAbsolutePath() + ".tmp");
                try (BufferedInputStream in = new BufferedInputStream(connection.getInputStream());
                     FileOutputStream fos = new FileOutputStream(tmp);
                     BufferedOutputStream bos = new BufferedOutputStream(fos)) {
                    byte[] buf = new byte[8192];
                    int len;
                    while ((len = in.read(buf)) != -1) {
                        bos.write(buf, 0, len);
                    }
                    bos.flush();
                }
                if (outFile.exists() && !outFile.delete()) {
                    // ignore
                }
                if (!tmp.renameTo(outFile)) {
                    // fallback copy
                    try (FileOutputStream fos = new FileOutputStream(outFile)) {
                        // no need to write, tmp may already be moved; if it failed, consider it failed
                    } catch (Exception ignored) {
                        outFile.delete();
                        return false;
                    }
                }
                outFile.setLastModified(System.currentTimeMillis());
                return true;
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (connection != null) connection.disconnect();
        }
        return false;
    }

    private static void trimDiskCache(File dir, long maxBytes) {
        if (dir == null || !dir.isDirectory()) return;
        File[] files = dir.listFiles();
        if (files == null || files.length == 0) return;

        long total = 0;
        for (File f : files) total += f.length();
        if (total <= maxBytes) return;

        // Delete oldest first
        Arrays.sort(files, Comparator.comparingLong(File::lastModified));
        int i = 0;
        while (total > maxBytes && i < files.length) {
            File f = files[i++];
            long len = f.length();
            f.delete();
            total -= len;
        }
    }
}