package com.footstique.live.models;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class Config {
    private String version;
    private boolean active;
    private String serverUrl;

    public Config(String version, boolean active, String serverUrl) {
        this.version = version;
        this.active = active;
        this.serverUrl = serverUrl;
    }

    public String getVersion() {
        return version;
    }

    public boolean isActive() {
        return active;
    }

    public String getServerUrl() {
        return serverUrl;
    }

    public static Config fromJson(JSONObject jsonObject) throws JSONException {
        JSONArray versionsArray = jsonObject.getJSONArray("versions");
        JSONObject versionObject = versionsArray.getJSONObject(0);
        
        String version = versionObject.getString("version");
        boolean active = versionObject.getString("active").equals("true");
        String serverUrl = jsonObject.getString("server");
        
        return new Config(version, active, serverUrl);
    }
}
