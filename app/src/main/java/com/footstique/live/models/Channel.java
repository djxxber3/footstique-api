package com.footstique.live.models;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class Channel implements Serializable {
    private String id;
    private String name;
    private String logo;
    private int todayMatchesCount;
    private Stream primaryStream;
    private List<Stream> streams;

    public Channel(String id, String name, String logo, int todayMatchesCount, Stream primaryStream, List<Stream> streams) {
        this.id = id;
        this.name = name;
        this.logo = logo;
        this.todayMatchesCount = todayMatchesCount;
        this.primaryStream = primaryStream;
        this.streams = streams;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getLogo() {
        return logo;
    }

    public int getTodayMatchesCount() {
        return todayMatchesCount;
    }

    public Stream getPrimaryStream() {
        return primaryStream;
    }

    public List<Stream> getStreams() {
        return streams;
    }

    public static Channel fromJson(JSONObject jsonObject) throws JSONException {
        String id = jsonObject.getString("id");
        String name = jsonObject.getString("name");
        String logo = jsonObject.getString("logo");
        int todayMatchesCount = jsonObject.getInt("today_matches_count");
        
        Stream primaryStream = Stream.fromJson(jsonObject.getJSONObject("primary_stream"));
        
        List<Stream> streams = new ArrayList<>();
        JSONArray streamsArray = jsonObject.getJSONArray("streams");
        for (int i = 0; i < streamsArray.length(); i++) {
            streams.add(Stream.fromJson(streamsArray.getJSONObject(i)));
        }
        
        return new Channel(id, name, logo, todayMatchesCount, primaryStream, streams);
    }
}
