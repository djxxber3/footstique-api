package com.footstique.live.models;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.Serializable;

public class Team implements Serializable {
    private String name;
    private String logo;
    private Integer goals;

    public Team(String name, String logo, Integer goals) {
        this.name = name;
        this.logo = logo;
        this.goals = goals;
    }

    public String getName() {
        return name;
    }

    public String getLogo() {
        return logo;
    }

    public Integer getGoals() {
        return goals;
    }

    public static Team fromJson(JSONObject jsonObject) throws JSONException {
        String name = jsonObject.getString("name");
        String logo = jsonObject.getString("logo");
        Integer goals = jsonObject.isNull("goals") ? null : jsonObject.getInt("goals");
        
        return new Team(name, logo, goals);
    }
}
