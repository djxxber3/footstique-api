package com.footstique.live.models;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.Serializable;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

public class Match implements Serializable {
    private String id;
    private String matchId;
    private Date fixtureDate;
    private Date kickoffTime;
    private String status;
    private String statusText;
    private Team homeTeam;
    private Team awayTeam;
    private Competition competition;
    private List<MatchChannel> streamingChannels;
    private Venue venue;

    public Match(String id, String matchId, Date fixtureDate, Date kickoffTime, String status, String statusText,
                Team homeTeam, Team awayTeam, Competition competition, List<MatchChannel> streamingChannels, Venue venue) {
        this.id = id;
        this.matchId = matchId;
        this.fixtureDate = fixtureDate;
        this.kickoffTime = kickoffTime;
        this.status = status;
        this.statusText = statusText;
        this.homeTeam = homeTeam;
        this.awayTeam = awayTeam;
        this.competition = competition;
        this.streamingChannels = streamingChannels;
        this.venue = venue;
    }

    public String getId() {
        return id;
    }

    public String getMatchId() {
        return matchId;
    }

    public Date getFixtureDate() {
        return fixtureDate;
    }

    public Date getKickoffTime() {
        return kickoffTime;
    }

    public String getStatus() {
        return status;
    }

    public String getStatusText() {
        return statusText;
    }

    public Team getHomeTeam() {
        return homeTeam;
    }

    public Team getAwayTeam() {
        return awayTeam;
    }

    public Competition getCompetition() {
        return competition;
    }

    public List<MatchChannel> getStreamingChannels() {
        return streamingChannels;
    }

    public Venue getVenue() {
        return venue;
    }

    public static Match fromJson(JSONObject jsonObject) throws JSONException {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        
        String id = jsonObject.getString("id");
        String matchId = jsonObject.getString("match_id");
        
        Date fixtureDate = null;
        Date kickoffTime = null;
        try {
            fixtureDate = format.parse(jsonObject.getString("fixture_date"));
            kickoffTime = format.parse(jsonObject.getString("kickoff_time"));
        } catch (ParseException e) {
            e.printStackTrace();
        }
        
        String status = jsonObject.getString("status");
        String statusText = jsonObject.getString("status_text");
        
        Team homeTeam = Team.fromJson(jsonObject.getJSONObject("home_team"));
        Team awayTeam = Team.fromJson(jsonObject.getJSONObject("away_team"));
        Competition competition = Competition.fromJson(jsonObject.getJSONObject("competition"));
        Venue venue = Venue.fromJson(jsonObject.getJSONObject("venue"));
        
        List<MatchChannel> streamingChannels = new ArrayList<>();
        JSONArray channelsArray = jsonObject.getJSONArray("streaming_channels");
        for (int i = 0; i < channelsArray.length(); i++) {
            streamingChannels.add(MatchChannel.fromJson(channelsArray.getJSONObject(i)));
        }
        
        return new Match(id, matchId, fixtureDate, kickoffTime, status, statusText, 
                homeTeam, awayTeam, competition, streamingChannels, venue);
    }
}
