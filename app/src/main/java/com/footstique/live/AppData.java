package com.footstique.live;

import com.footstique.live.models.ChannelCategory;
import com.footstique.live.models.Match;

import java.util.ArrayList;
import java.util.List;

public class AppData {
    private static AppData instance;
    
    private List<Match> matches = new ArrayList<>();
    private List<ChannelCategory> categories = new ArrayList<>();
    private String serverUrl;
    
    private AppData() {
        // Private constructor to prevent instantiation
    }
    
    public static synchronized AppData getInstance() {
        if (instance == null) {
            instance = new AppData();
        }
        return instance;
    }
    
    public List<Match> getMatches() {
        return matches;
    }
    
    public void setMatches(List<Match> matches) {
        this.matches = matches;
    }
    
    public List<ChannelCategory> getCategories() {
        return categories;
    }
    
    public void setCategories(List<ChannelCategory> categories) {
        this.categories = categories;
    }
    
    public String getServerUrl() {
        return serverUrl;
    }
    
    public void setServerUrl(String serverUrl) {
        this.serverUrl = serverUrl;
    }
}
