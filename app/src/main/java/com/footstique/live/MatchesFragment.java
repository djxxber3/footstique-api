package com.footstique.live;

import android.app.DatePickerDialog;
import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.footstique.live.adapters.MatchAdapter;
import com.footstique.live.models.Match;

import org.json.JSONArray;
import org.json.JSONObject;
import android.widget.ImageButton;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MatchesFragment extends Fragment implements MatchAdapter.OnMatchClickListener {

    private RecyclerView recyclerView;
   private ImageButton btnPreviousDay, btnNextDay;

    private TextView tvCurrentDate;
    private Calendar currentDate = Calendar.getInstance();
    private SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
   private SimpleDateFormat displayDateFormat = new SimpleDateFormat("EEE, MMM d, yyyy", Locale.getDefault());
    
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_matches, container, false);
        
        recyclerView = view.findViewById(R.id.recyclerViewMatches);
        btnPreviousDay = view.findViewById(R.id.btnPreviousDay);
        btnNextDay = view.findViewById(R.id.btnNextDay);
        tvCurrentDate = view.findViewById(R.id.tvCurrentDate);
        
        // Set up RecyclerView
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        
        // Set the current date
        updateDateDisplay();
        
        // Set click listeners for navigation buttons
        btnPreviousDay.setOnClickListener(v -> {
            currentDate.add(Calendar.DAY_OF_MONTH, -1);
            updateDateDisplay();
            loadMatchesForDate(dateFormat.format(currentDate.getTime()));
        });
        
        btnNextDay.setOnClickListener(v -> {
            currentDate.add(Calendar.DAY_OF_MONTH, 1);
            updateDateDisplay();
            loadMatchesForDate(dateFormat.format(currentDate.getTime()));
        });
        
        // Set click listener for the date to show date picker
        tvCurrentDate.setOnClickListener(v -> showDatePicker());
        
        // Display the current matches
        displayMatches(AppData.getInstance().getMatches());
        
        return view;
    }
    
    private void updateDateDisplay() {
        tvCurrentDate.setText(displayDateFormat.format(currentDate.getTime()));
    }
    
    private void showDatePicker() {
        DatePickerDialog datePickerDialog = new DatePickerDialog(
                requireContext(),
                (view, year, month, dayOfMonth) -> {
                    currentDate.set(Calendar.YEAR, year);
                    currentDate.set(Calendar.MONTH, month);
                    currentDate.set(Calendar.DAY_OF_MONTH, dayOfMonth);
                    updateDateDisplay();
                    loadMatchesForDate(dateFormat.format(currentDate.getTime()));
                },
                currentDate.get(Calendar.YEAR),
                currentDate.get(Calendar.MONTH),
                currentDate.get(Calendar.DAY_OF_MONTH)
        );
        datePickerDialog.show();
    }
    
    private void loadMatchesForDate(String date) {
        String serverUrl = AppData.getInstance().getServerUrl();
        if (serverUrl == null) {
            Toast.makeText(getContext(), "Server URL not available", Toast.LENGTH_SHORT).show();
            return;
        }
        
        String matchesUrl = serverUrl + "/api/client/matches/" + date;
        
        ExecutorService executor = Executors.newSingleThreadExecutor();
        executor.execute(() -> {
            try {
                URL url = new URL(matchesUrl);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                
                BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
                StringBuilder response = new StringBuilder();
                String line;
                
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                
                JSONObject matchesJson = new JSONObject(response.toString());
                List<Match> matches = new ArrayList<>();
                
                if (matchesJson.getBoolean("success")) {
                    JSONArray matchesArray = matchesJson.getJSONObject("data").getJSONArray("matches");
                    
                    for (int i = 0; i < matchesArray.length(); i++) {
                        matches.add(Match.fromJson(matchesArray.getJSONObject(i)));
                    }
                    
                    requireActivity().runOnUiThread(() -> displayMatches(matches));
                } else {
                    requireActivity().runOnUiThread(() -> 
                            Toast.makeText(getContext(), "Error loading matches", Toast.LENGTH_LONG).show());
                }
                
            } catch (Exception e) {
                e.printStackTrace();
                requireActivity().runOnUiThread(() -> 
                        Toast.makeText(getContext(), "Error: " + e.getMessage(), Toast.LENGTH_LONG).show());
            } finally {
                executor.shutdown();
            }
        });
    }
    
    private void displayMatches(List<Match> matches) {
        MatchAdapter adapter = new MatchAdapter(getContext(), matches, this);
        recyclerView.setAdapter(adapter);
    }
    
    @Override
    public void onMatchClick(Match match) {
        Intent intent = new Intent(getActivity(), MatchDetailActivity.class);
        intent.putExtra("match", match);
        startActivity(intent);
    }
}
