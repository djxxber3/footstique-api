package com.footstique.live.models;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class ChannelCategory implements Serializable {
    private String id;
    private String name;
    private String nameAr;
    private String logo;
    private int channelsCount;
    private List<Channel> channels;

    public ChannelCategory(String id, String name, String nameAr, String logo, int channelsCount, List<Channel> channels) {
        this.id = id;
        this.name = name;
        this.nameAr = nameAr;
        this.logo = logo;
        this.channelsCount = channelsCount;
        this.channels = channels;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getNameAr() {
        return nameAr;
    }

    public String getLogo() {
        return logo;
    }

    public int getChannelsCount() {
        return channelsCount;
    }

    public List<Channel> getChannels() {
        return channels;
    }

    public static ChannelCategory fromJson(JSONObject jsonObject) throws JSONException {
        String id = jsonObject.getString("id");
        String name = jsonObject.getString("name");
        String nameAr = jsonObject.getString("name_ar");
        String logo = jsonObject.getString("logo");
        int channelsCount = jsonObject.getInt("channels_count");
        
        List<Channel> channels = new ArrayList<>();
        JSONArray channelsArray = jsonObject.getJSONArray("channels");
        for (int i = 0; i < channelsArray.length(); i++) {
            channels.add(Channel.fromJson(channelsArray.getJSONObject(i)));
        }
        
        return new ChannelCategory(id, name, nameAr, logo, channelsCount, channels);
    }
}
