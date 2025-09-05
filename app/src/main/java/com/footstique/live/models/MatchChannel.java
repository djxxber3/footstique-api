package com.footstique.live.models;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents a broadcast channel for a given match,
 * including its name, logo and available stream variants.
 */
public class MatchChannel implements Serializable {
    private final String name;
    private final String logo;
    private final List<Stream> streams;

    public MatchChannel(String name, String logo, List<Stream> streams) {
        this.name = name;
        this.logo = logo;
        this.streams = streams;
    }

    public String getName() {
        return name;
    }

    public String getLogo() {
        return logo;
    }

    public List<Stream> getStreams() {
        return streams;
    }

    public static MatchChannel fromJson(JSONObject jsonObject) throws JSONException {
        String name = jsonObject.optString("name", null);
        String logo = jsonObject.optString("logo", null);

        List<Stream> streams = new ArrayList<>();
        JSONArray streamsArray = jsonObject.optJSONArray("streams");
        if (streamsArray != null) {
            for (int i = 0; i < streamsArray.length(); i++) {
                streams.add(Stream.fromJson(streamsArray.getJSONObject(i)));
            }
        }

        return new MatchChannel(name, logo, streams);
    }
}
