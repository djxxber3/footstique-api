package com.footstique.live.adapters;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.footstique.live.R;
import com.footstique.live.models.Match;
import com.footstique.live.utils.ImageLoader;

import java.text.SimpleDateFormat;
import java.util.List;
import java.util.Locale;

public class MatchAdapter extends RecyclerView.Adapter<MatchAdapter.MatchViewHolder> {

    private Context context;
    private List<Match> matches;
    private OnMatchClickListener listener;
    private SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.US);

    public interface OnMatchClickListener {
        void onMatchClick(Match match);
    }

    public MatchAdapter(Context context, List<Match> matches, OnMatchClickListener listener) {
        this.context = context;
        this.matches = matches;
        this.listener = listener;
    }

    @NonNull
    @Override
    public MatchViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_match, parent, false);
        return new MatchViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull MatchViewHolder holder, int position) {
        Match match = matches.get(position);
        
        // Set competition name
        holder.tvCompetitionName.setText(match.getCompetition().getName());
        
        // Set team names
        holder.tvHomeTeamName.setText(match.getHomeTeam().getName());
        holder.tvAwayTeamName.setText(match.getAwayTeam().getName());
        
        // Set team logos using our simple ImageLoader
        ImageLoader.loadImage(
                match.getHomeTeam().getLogo(),
                holder.ivHomeTeamLogo,
                R.color.fs_dark_grey_secondary
        );
                
        ImageLoader.loadImage(
                match.getAwayTeam().getLogo(),
                holder.ivAwayTeamLogo,
                R.color.fs_dark_grey_secondary
        );
        
        // Set match time and status - using the correct field from layout
        holder.tvMatchStatus.setText(match.getStatusText());
        
        // Set click listener
        holder.itemView.setOnClickListener(v -> {
            if (listener != null) {
                listener.onMatchClick(match);
            }
        });
    }

    @Override
    public int getItemCount() {
        return matches.size();
    }

    public static class MatchViewHolder extends RecyclerView.ViewHolder {
        TextView tvCompetitionName, tvHomeTeamName, tvAwayTeamName, tvMatchStatus;
        ImageView ivHomeTeamLogo, ivAwayTeamLogo;

        public MatchViewHolder(@NonNull View itemView) {
            super(itemView);
            tvCompetitionName = itemView.findViewById(R.id.txt_league_name);
            tvHomeTeamName = itemView.findViewById(R.id.txt_team_home);
            tvAwayTeamName = itemView.findViewById(R.id.txt_team_away);
            tvMatchStatus = itemView.findViewById(R.id.txt_match_status);
            ivHomeTeamLogo = itemView.findViewById(R.id.img_team_home);
            ivAwayTeamLogo = itemView.findViewById(R.id.img_team_away);
        }
    }
}
