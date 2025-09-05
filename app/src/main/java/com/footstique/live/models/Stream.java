package com.footstique.live.models;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.Serializable;

public class Stream implements Serializable {
    private String url;
    private String quality;
    private String label;
    private final String userAgent;
    private final String referer;
    private final String cookie;
    private final String origin;
    private final String drmKey;
    private final String drmScheme;

    public Stream(String url, String quality, String label,
                  String userAgent, String referer, String cookie, String origin,
                  String drmKey, String drmScheme) {
        this.url = url;
        this.quality = quality;
        this.label = label;
        this.userAgent = userAgent;
        this.referer = referer;
        this.cookie = cookie;
        this.origin = origin;
        this.drmKey = drmKey;
        this.drmScheme = drmScheme;
    }

    public String getUrl() {
        return url;
    }

    public String getQuality() {
        return quality;
    }

    public String getLabel() {
        return label;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public String getReferer() {
        return referer;
    }

    public String getCookie() {
        return cookie;
    }

    public String getOrigin() {
        return origin;
    }

    public String getDrmKey() {
        return drmKey;
    }

    public String getDrmScheme() {
        return drmScheme;
    }

    public static Stream fromJson(JSONObject jsonObject) throws JSONException {
        String url = jsonObject.getString("url");
        String quality = jsonObject.getString("quality");
        String label = jsonObject.getString("label");
        String userAgent = jsonObject.optString("userAgent", null);
        String referer = jsonObject.optString("referer", null);
        String cookie = jsonObject.optString("cookie", null);
        String origin = jsonObject.optString("origin", null);
        String drmKey = jsonObject.optString("drmKey", null);
        String drmScheme = jsonObject.optString("drmScheme", null);
        
        return new Stream(url, quality, label, userAgent, referer, cookie, origin, drmKey, drmScheme);
    }
}
