package com.footstique.player;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ListPopupWindow;

import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.appcompat.app.AppCompatActivity;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.hls.HlsMediaSource;
import androidx.media3.exoplayer.source.MediaSource;
import androidx.media3.ui.PlayerView;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class PlayerActivity extends AppCompatActivity {

    public static final String EXTRA_STREAMS = "streams";

    private ExoPlayer exoPlayer;
    private PlayerView playerView;
    private LinearLayout qualityBar;
    private DefaultHttpDataSource.Factory baseHttpFactory;
    private MediaSource.Factory mediaSourceFactory;


    private final List<Map<String, String>> streams = new ArrayList<>();
    private final Map<String, List<Map<String, String>>> byQuality = new LinkedHashMap<>();

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_player);

        playerView = findViewById(R.id.player_view);
        qualityBar = findViewById(R.id.quality_bar);

        readStreamsFromIntent();
        groupByQuality();
        setupQualityButtons();
    }

    @Override
    protected void onStart() {
        super.onStart();
        initializePlayer();
        Map<String, String> first = getFirstStream();
        if (first != null) {
            playStream(first);
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        releasePlayer();
    }

    @OptIn(markerClass = UnstableApi.class)
    private void initializePlayer() {
        if (exoPlayer == null) {
            // 1. إعداد مصدر بيانات أساسي يدعم إعادة التوجيه (Redirects)
            baseHttpFactory = new DefaultHttpDataSource.Factory();
            baseHttpFactory.setAllowCrossProtocolRedirects(true);

            // 2. إعداد مصدر وسائط HLS باستخدام المصنع الأساسي
            // هذا هو الجزء الذي يضيف دعم .m3u8 و .ts
            mediaSourceFactory = new HlsMediaSource.Factory(baseHttpFactory);

            // 3. بناء المشغل مع الإعدادات المتقدمة
            exoPlayer = new ExoPlayer.Builder(this)
                    .setMediaSourceFactory(mediaSourceFactory)
                    .build();

            playerView.setPlayer(exoPlayer);
            exoPlayer.setPlayWhenReady(true);
        }
    }

    private void releasePlayer() {
        if (exoPlayer != null) {
            exoPlayer.release();
            exoPlayer = null;
        }
    }

    @OptIn(markerClass = UnstableApi.class)
    private void playUrl(String url) {
        if (exoPlayer == null) return;

        // 4. بناء MediaItem مع إعدادات البث المباشر
        MediaItem.Builder mediaItemBuilder = new MediaItem.Builder()
                .setUri(Uri.parse(url));

        // إذا كان الرابط هو HLS، نطبق إعدادات البث المباشر
        if (url.contains(".m3u8")) {
            mediaItemBuilder.setMimeType(MimeTypes.APPLICATION_M3U8);
            MediaItem.LiveConfiguration liveConfiguration = new MediaItem.LiveConfiguration.Builder()
                    .setTargetOffsetMs(5000) // لمحاولة البقاء قريباً من البث الحي بـ 5 ثواني
                    .setMinPlaybackSpeed(0.9f)
                    .setMaxPlaybackSpeed(1.1f)
                    .build();
            mediaItemBuilder.setLiveConfiguration(liveConfiguration);
        }

        MediaItem mediaItem = mediaItemBuilder.build();

        // استخدام mediaSourceFactory لإنشاء المصدر من MediaItem
        MediaSource mediaSource = mediaSourceFactory.createMediaSource(mediaItem);

        exoPlayer.setMediaSource(mediaSource);
        exoPlayer.prepare();
        exoPlayer.play();
    }

    private void readStreamsFromIntent() {
        Intent intent = getIntent();
        Serializable extra = intent.getSerializableExtra(EXTRA_STREAMS);
        if (extra instanceof ArrayList<?>) {
            for (Object item : (ArrayList<?>) extra) {
                if (item instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> raw = (Map<String, Object>) item;
                    Map<String, String> s = new HashMap<>();
                    putIfNonNullString(s, "url", raw.get("url"));
                    putIfNonNullString(s, "quality", raw.get("quality"));
                    putIfNonNullString(s, "label", raw.get("label"));
                    putIfNonNullString(s, "userAgent", raw.get("userAgent"));
                    putIfNonNullString(s, "referer", raw.get("referer"));
                    putIfNonNullString(s, "cookie", raw.get("cookie"));
                    putIfNonNullString(s, "origin", raw.get("origin"));
                    putIfNonNullString(s, "drmKey", raw.get("drmKey"));
                    putIfNonNullString(s, "drmScheme", raw.get("drmScheme"));
                    if (s.get("url") != null) {
                        streams.add(s);
                    }
                }
            }
        }
    }

    private void groupByQuality() {
        byQuality.clear();
        for (Map<String, String> s : streams) {
            String q = s.get("quality");
            if (q == null || q.isEmpty()) q = "AUTO";
            List<Map<String, String>> list = byQuality.get(q);
            if (list == null) {
                list = new ArrayList<>();
                byQuality.put(q, list);
            }
            list.add(s);
        }
    }

    private void setupQualityButtons() {
        qualityBar.removeAllViews();
        for (Map.Entry<String, List<Map<String, String>>> entry : byQuality.entrySet()) {
            String quality = entry.getKey();
            List<Map<String, String>> links = entry.getValue();

            Button btn = new Button(this);
            btn.setAllCaps(false);
            btn.setText(quality);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
            );
            lp.setMargins(8, 8, 8, 8);
            btn.setLayoutParams(lp);

            btn.setOnClickListener(v -> showLinksPopup(btn, quality, links));
            qualityBar.addView(btn);
        }
    }

    private void showLinksPopup(View anchor, String quality, List<Map<String, String>> links) {
        List<String> labels = new ArrayList<>();
        for (int i = 0; i < links.size(); i++) {
            Map<String, String> s = links.get(i);
            String label = s.get("label");
            if (label == null || label.isEmpty()) label = quality + " - Link " + (i + 1);
            labels.add(label);
        }

        ListPopupWindow popup = new ListPopupWindow(this);
        popup.setAnchorView(anchor);
        popup.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_list_item_1, labels));
        popup.setOnItemClickListener((parent, view, position, id) -> {
            Map<String, String> s = links.get(position);
            playStream(s);
            popup.dismiss();
        });
        popup.show();
    }

    private Map<String, String> getFirstStream() {
        if (!streams.isEmpty()) {
            return streams.get(0);
        }
        return null;
    }

    private static void putIfNonNullString(Map<String, String> out, String key, Object value) {
        if (value instanceof String) {
            out.put(key, (String) value);
        }
    }

    @OptIn(markerClass = UnstableApi.class)
    private void playStream(Map<String, String> stream) {
        if (exoPlayer == null || stream == null) return;
        String url = stream.get("url");
        if (url == null || url.isEmpty()) return;

        // إنشاء مصنع HTTP مخصص لهذا الرابط فقط
        DefaultHttpDataSource.Factory httpFactory = new DefaultHttpDataSource.Factory();
        httpFactory.setAllowCrossProtocolRedirects(true);

        String userAgent = stream.get("userAgent");
        if (userAgent != null && !userAgent.isEmpty()) {
            httpFactory.setUserAgent(userAgent);
        }

        Map<String, String> headers = new HashMap<>();
        String referer = stream.get("referer");
        if (referer != null && !referer.isEmpty()) headers.put("Referer", referer);
        String cookie = stream.get("cookie");
        if (cookie != null && !cookie.isEmpty()) headers.put("Cookie", cookie);
        String origin = stream.get("origin");
        if (origin != null && !origin.isEmpty()) headers.put("Origin", origin);
        if (!headers.isEmpty()) {
            httpFactory.setDefaultRequestProperties(headers);
        }

        MediaSource.Factory msFactory = new HlsMediaSource.Factory(httpFactory);

        // بناء MediaItem مع إعدادات البث المباشر عند الحاجة
        MediaItem.Builder mediaItemBuilder = new MediaItem.Builder().setUri(Uri.parse(url));
        if (url.contains(".m3u8")) {
            mediaItemBuilder.setMimeType(MimeTypes.APPLICATION_M3U8);
            MediaItem.LiveConfiguration liveConfiguration = new MediaItem.LiveConfiguration.Builder()
                    .setTargetOffsetMs(5000)
                    .setMinPlaybackSpeed(0.9f)
                    .setMaxPlaybackSpeed(1.1f)
                    .build();
            mediaItemBuilder.setLiveConfiguration(liveConfiguration);
        }
        MediaItem mediaItem = mediaItemBuilder.build();
        MediaSource mediaSource = msFactory.createMediaSource(mediaItem);
        exoPlayer.setMediaSource(mediaSource);
        exoPlayer.prepare();
        exoPlayer.play();
    }
}

