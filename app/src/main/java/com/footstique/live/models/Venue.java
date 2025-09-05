package com.footstique.live.models;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.Serializable;

public class Venue implements Serializable {
    private String name;
    private String city;

    public Venue(String name, String city) {
        this.name = name;
        this.city = city;
    }

    public String getName() {
        return name;
    }

    public String getCity() {
        return city;
    }

    public static Venue fromJson(JSONObject jsonObject) throws JSONException {
        String name = jsonObject.isNull("name") ? null : jsonObject.getString("name");
        String city = jsonObject.isNull("city") ? null : jsonObject.getString("city");
        
        return new Venue(name, city);
    }
}
