package com.footstique.live.models;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.Serializable;

public class Competition implements Serializable {
    private String name;
    private String logo;
    private String country;

    public Competition(String name, String logo, String country) {
        this.name = name;
        this.logo = logo;
        this.country = country;
    }

    public String getName() {
        return name;
    }

    public String getLogo() {
        return logo;
    }

    public String getCountry() {
        return country;
    }

    public static Competition fromJson(JSONObject jsonObject) throws JSONException {
        String name = jsonObject.getString("name");
        String logo = jsonObject.getString("logo");
        String country = jsonObject.getString("country");
        
        return new Competition(name, logo, country);
    }
}
