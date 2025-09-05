package com.footstique.live;

import android.app.AlertDialog;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.footstique.live.models.ChannelCategory;
import com.footstique.live.models.Config;
import com.footstique.live.models.Match;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class SplashActivity extends AppCompatActivity {

    private TextView statusText;
    private String serverUrl;
    private List<Match> matches = new ArrayList<>();
    private List<ChannelCategory> categories = new ArrayList<>();
    
    private static final String CONFIG_URL = "https://footstique.app/data.json";
    private static final String WEBSITE_URL = "https://footstique.app";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);
        
        statusText = findViewById(R.id.statusText);
        
        loadConfig();
    }
    
    private void loadConfig() {
        ExecutorService executor = Executors.newSingleThreadExecutor();
        
        executor.execute(() -> {
            try {
                String configResponse = makeHttpRequest(CONFIG_URL);
                JSONObject configJson = new JSONObject(configResponse);
                
                Config config = Config.fromJson(configJson);
                
                runOnUiThread(() -> {
                    if (config.isActive()) {
                        serverUrl = config.getServerUrl();
                        statusText.setText("Loading matches...");
                        loadData();
                    } else {
                        showUpdateDialog();
                    }
                });
                
            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() -> {
                    Toast.makeText(this, "Error loading config: " + e.getMessage(), Toast.LENGTH_LONG).show();
                    statusText.setText("Error loading config");
                    
                    new Handler().postDelayed(this::loadConfig, 3000);
                });
            }
        });
        
        executor.shutdown();
    }
    
    private void loadData() {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        
        final boolean[] matchesLoaded = {false};
        final boolean[] channelsLoaded = {false};
        
        // Load matches
        executor.execute(() -> {
            try {
                String currentDate = java.time.LocalDate.now().toString();
                String matchesUrl = serverUrl + "/api/client/matches/" + currentDate;
                String matchesResponse = makeHttpRequest(matchesUrl);
                JSONObject matchesJson = new JSONObject(matchesResponse);
                
                if (matchesJson.getBoolean("success")) {
                    JSONArray matchesArray = matchesJson.getJSONObject("data").getJSONArray("matches");
                    
                    for (int i = 0; i < matchesArray.length(); i++) {
                        matches.add(Match.fromJson(matchesArray.getJSONObject(i)));
                    }
                    
                    runOnUiThread(() -> {
                        matchesLoaded[0] = true;
                        if (channelsLoaded[0]) {
                            navigateToMainActivity();
                        }
                    });
                } else {
                    runOnUiThread(() -> {
                        Toast.makeText(this, "Error loading matches", Toast.LENGTH_LONG).show();
                        statusText.setText("Error loading matches");
                    });
                }
                
            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() -> {
                    Toast.makeText(this, "Error loading matches: " + e.getMessage(), Toast.LENGTH_LONG).show();
                    statusText.setText("Error loading matches");
                });
            }
        });
        
        // Load channels
        executor.execute(() -> {
            try {
                String channelsUrl = serverUrl + "/api/client/channels";
                String channelsResponse = makeHttpRequest(channelsUrl);
                JSONObject channelsJson = new JSONObject(channelsResponse);
                
                if (channelsJson.getBoolean("success")) {
                    JSONArray categoriesArray = channelsJson.getJSONObject("data").getJSONArray("categories");
                    
                    for (int i = 0; i < categoriesArray.length(); i++) {
                        categories.add(ChannelCategory.fromJson(categoriesArray.getJSONObject(i)));
                    }
                    
                    runOnUiThread(() -> {
                        channelsLoaded[0] = true;
                        if (matchesLoaded[0]) {
                            navigateToMainActivity();
                        }
                    });
                } else {
                    runOnUiThread(() -> {
                        Toast.makeText(this, "Error loading channels", Toast.LENGTH_LONG).show();
                        statusText.setText("Error loading channels");
                    });
                }
                
            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() -> {
                    Toast.makeText(this, "Error loading channels: " + e.getMessage(), Toast.LENGTH_LONG).show();
                    statusText.setText("Error loading channels");
                });
            }
        });
        
        executor.shutdown();
    }
    
    private void navigateToMainActivity() {
        statusText.setText("Loading complete");
        
        // Store data in application state or pass to next activity
        AppData.getInstance().setMatches(matches);
        AppData.getInstance().setCategories(categories);
        AppData.getInstance().setServerUrl(serverUrl);
        
        // Navigate to main activity
        new Handler().postDelayed(() -> {
            Intent intent = new Intent(SplashActivity.this, MainActivity.class);
            startActivity(intent);
            finish();
        }, 500);
    }
    
    private void showUpdateDialog() {
        new AlertDialog.Builder(this)
                .setTitle(R.string.update_required)
                .setMessage(R.string.update_message)
                .setPositiveButton(R.string.visit_website, (dialog, which) -> {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(WEBSITE_URL));
                    startActivity(intent);
                    finish();
                })
                .setCancelable(false)
                .show();
    }
    
    private String makeHttpRequest(String urlString) throws IOException, JSONException {
        URL url = new URL(urlString);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        
        try {
            BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
            StringBuilder response = new StringBuilder();
            String line;
            
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            
            return response.toString();
            
        } finally {
            connection.disconnect();
        }
    }
}
