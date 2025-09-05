package com.footstique.player;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ListPopupWindow;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.appcompat.app.AppCompatActivity;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.common.util.Util;
import androidx.media3.datasource.DataSource;
import androidx.media3.datasource.DataSourceInputStream;
import androidx.media3.datasource.DataSpec;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.drm.DefaultDrmSessionManager;
import androidx.media3.exoplayer.drm.DrmSessionManager;
import androidx.media3.exoplayer.drm.FrameworkMediaDrm;
import androidx.media3.exoplayer.drm.HttpMediaDrmCallback;
import androidx.media3.exoplayer.source.MediaSource;
import androidx.media3.exoplayer.source.ProgressiveMediaSource;
import androidx.media3.exoplayer.dash.DashMediaSource;
import androidx.media3.exoplayer.hls.HlsMediaSource;
import androidx.media3.ui.PlayerView;

import java.io.IOException;
import java.io.Serializable;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;


public class PlayerActivity extends AppCompatActivity {

    public static final String EXTRA_STREAMS = "streams";
    private static final String TAG = "PlayerActivity";
    private static final String DEFAULT_USER_AGENT = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36";

    private ExoPlayer exoPlayer;
    private PlayerView playerView;
    private LinearLayout qualityBar;

    private final List<Map<String, String>> streams = new ArrayList<>();
    private final Map<String, List<Map<String, String>>> byQuality = new LinkedHashMap<>();

    // ... (onCreate, onStart, onStop, releasePlayer, initializePlayer remain the same)
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

    private void releasePlayer() {
        if (exoPlayer != null) {
            exoPlayer.release();
            exoPlayer = null;
        }
    }

    private void initializePlayer() {
        if (exoPlayer == null) {
            exoPlayer = new ExoPlayer.Builder(this).build();
            exoPlayer.addListener(new Player.Listener() {
                @Override
                public void onPlayerError(PlaybackException error) {
                    Log.e(TAG, "Player Error: " + error.getErrorCodeName() + " - " + error.getMessage(), error);
                    Toast.makeText(PlayerActivity.this, "Playback Error: " + error.getErrorCodeName(), Toast.LENGTH_LONG).show();
                }
            });
            playerView.setPlayer(exoPlayer);
            exoPlayer.setPlayWhenReady(true);
        }
    }

    @OptIn(markerClass = UnstableApi.class)
    private void playStream(Map<String, String> stream) {
        if (exoPlayer == null || stream == null) return;
        String url = stream.get("url");
        if (url == null || url.isEmpty()) return;

        DefaultHttpDataSource.Factory httpDataSourceFactory = new DefaultHttpDataSource.Factory()
                .setUserAgent(stream.get("userAgent") != null ? stream.get("userAgent") : DEFAULT_USER_AGENT)
                .setAllowCrossProtocolRedirects(true);

        Map<String, String> requestProperties = new HashMap<>();
        String referer = stream.get("referer");
        if (referer != null && !referer.isEmpty()) requestProperties.put("Referer", referer);
        String origin = stream.get("origin");
        if (origin != null && !origin.isEmpty()) requestProperties.put("Origin", origin);
        String cookie = stream.get("cookie");
        if (cookie != null && !cookie.isEmpty()) requestProperties.put("Cookie", cookie);

        if (!requestProperties.isEmpty()) {
            httpDataSourceFactory.setDefaultRequestProperties(requestProperties);
        }

        MediaItem mediaItem = new MediaItem.Builder().setUri(url).build();
        MediaSource mediaSource;
        int type = Util.inferContentType(Uri.parse(url));

        if (type == C.CONTENT_TYPE_DASH) {
            DrmSessionManager drmSessionManager = buildDrmSessionManager(stream, httpDataSourceFactory);
            mediaSource = new DashMediaSource.Factory(httpDataSourceFactory)
                    .setDrmSessionManagerProvider(item -> drmSessionManager)
                    .createMediaSource(mediaItem);
        } else if (type == C.CONTENT_TYPE_HLS) {
            mediaSource = new HlsMediaSource.Factory(httpDataSourceFactory)
                    .createMediaSource(mediaItem);
        } else {
            mediaSource = new ProgressiveMediaSource.Factory(httpDataSourceFactory)
                    .createMediaSource(mediaItem);
        }

        exoPlayer.setMediaSource(mediaSource);
        exoPlayer.prepare();
        exoPlayer.play();
    }

    @OptIn(markerClass = UnstableApi.class)
    private DrmSessionManager buildDrmSessionManager(Map<String, String> stream, DefaultHttpDataSource.Factory httpDataSourceFactory) {
        String drmScheme = stream.get("drmScheme");
        String drmKey = stream.get("drmKey");

        if ("clearkey".equalsIgnoreCase(drmScheme) && drmKey != null && !drmKey.isEmpty()) {
            String[] parts = drmKey.split(":");
            if (parts.length == 2) {
                try {
                    String keyIdHex = parts[0].trim();
                    String keyHex = parts[1].trim();

                    byte[] kidBytes = hexStringToByteArray(keyIdHex);
                    byte[] keyBytes = hexStringToByteArray(keyHex);

                    String kidB64 = Base64.encodeToString(kidBytes, Base64.NO_WRAP | Base64.URL_SAFE | Base64.NO_PADDING);
                    String keyB64 = Base64.encodeToString(keyBytes, Base64.NO_WRAP | Base64.URL_SAFE | Base64.NO_PADDING);

                    String clearKeyJson = "{\"keys\":[{\"kty\":\"oct\",\"k\":\"" + keyB64 + "\",\"kid\":\"" + kidB64 + "\"}],\"type\":\"temporary\"}";

                    // --- هذه هي الطريقة الجديدة والاحترافية ---
                    LocalDrmDataSourceFactory localDrmDataSourceFactory = new LocalDrmDataSourceFactory(clearKeyJson.getBytes());
                    HttpMediaDrmCallback drmCallback = new HttpMediaDrmCallback(null, localDrmDataSourceFactory);

                    return new DefaultDrmSessionManager.Builder()
                            .setUuidAndExoMediaDrmProvider(C.CLEARKEY_UUID, FrameworkMediaDrm.DEFAULT_PROVIDER)
                            .build(drmCallback);

                } catch (Exception e) {
                    Log.e(TAG, "Failed to build ClearKey DRM session", e);
                }
            }
        }
        return DrmSessionManager.DRM_UNSUPPORTED;
    }

    // --- كلاس داخلي جديد لإنشاء مصدر بيانات محلي ---
    @UnstableApi
    private static class LocalDrmDataSourceFactory implements DataSource.Factory {
        private final byte[] response;
        public LocalDrmDataSourceFactory(byte[] response) {
            this.response = response;
        }
        @Override
        public DataSource createDataSource() {
            return new LocalDrmDataSource(response);
        }
    }

    @UnstableApi
    private static class LocalDrmDataSource implements DataSource {
        private final byte[] data;
        private Uri uri;
        public LocalDrmDataSource(byte[] data) {
            this.data = data;
        }
        @Override
        public long open(DataSpec dataSpec) {
            this.uri = dataSpec.uri;
            return data.length;
        }
        @Override
        public int read(byte[] buffer, int offset, int length) {
            if (length == 0) return 0;
            int remaining = data.length;
            if (remaining == 0) return C.RESULT_END_OF_INPUT;
            int bytesToRead = Math.min(length, remaining);
            System.arraycopy(data, 0, buffer, offset, bytesToRead);
            return bytesToRead;
        }
        @Override
        public Uri getUri() {
            return uri;
        }
        @Override
        public void close() {}

        @OptIn(markerClass = UnstableApi.class)
        @Override
        public void addTransferListener(androidx.media3.datasource.TransferListener transferListener) {}
        @Override
        public Map<String, List<String>> getResponseHeaders() {
            return new HashMap<>();
        }
    }

    public static byte[] hexStringToByteArray(String s) {
        int len = s.length();
        if (len % 2 != 0) {
            throw new IllegalArgumentException("Hex string must have an even number of digits");
        }
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4)
                    + Character.digit(s.charAt(i+1), 16));
        }
        return data;
    }

    private void readStreamsFromIntent() {
        Intent intent = getIntent();
        Serializable extra = intent.getSerializableExtra(EXTRA_STREAMS);
        if (extra instanceof ArrayList<?>) {
            for (Object item : (ArrayList<?>) extra) {
                if (item instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, String> raw = (Map<String, String>) item;
                    if (raw.get("url") != null) {
                        streams.add(new HashMap<>(raw));
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
            playStream(links.get(position));
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
}