package com.footstique.live.adapters;

import android.content.Context;
import android.content.Intent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.footstique.live.R;
import com.footstique.live.models.MatchChannel;
import com.footstique.live.utils.ImageLoader;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

/**
 * Adapter to display only the broadcasting channels for a match (no stream links).
 */
public class MatchChannelAdapter extends RecyclerView.Adapter<MatchChannelAdapter.ChannelViewHolder> {

    private final Context context;
    private final List<MatchChannel> channels;

    public MatchChannelAdapter(Context context, List<MatchChannel> channels) {
        this.context = context;
        this.channels = channels;
    }

    @NonNull
    @Override
    public ChannelViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_channel, parent, false);
        return new ChannelViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ChannelViewHolder holder, int position) {
        MatchChannel channel = channels.get(position);
        holder.tvChannelName.setText(channel.getName());
        holder.tvTodayMatches.setVisibility(View.GONE);
        ImageLoader.loadImage(channel.getLogo(), holder.ivChannelLogo, R.color.fs_dark_grey_secondary);
        // Open player with this channel's streams on item click
        holder.itemView.setOnClickListener(v -> {
            Intent intent = new Intent();
            intent.setClassName(context, "com.footstique.player.PlayerActivity");
            ArrayList<HashMap<String, String>> payload = new ArrayList<>();
            for (com.footstique.live.models.Stream s : channel.getStreams()) {
                HashMap<String, String> m = new HashMap<>();
                m.put("url", s.getUrl());
                m.put("quality", s.getQuality());
                m.put("label", s.getLabel());
                if (s.getUserAgent() != null && !s.getUserAgent().isEmpty()) m.put("userAgent", s.getUserAgent());
                if (s.getReferer() != null && !s.getReferer().isEmpty()) m.put("referer", s.getReferer());
                if (s.getCookie() != null && !s.getCookie().isEmpty()) m.put("cookie", s.getCookie());
                if (s.getOrigin() != null && !s.getOrigin().isEmpty()) m.put("origin", s.getOrigin());
                if (s.getDrmKey() != null && !s.getDrmKey().isEmpty()) m.put("drmKey", s.getDrmKey());
                if (s.getDrmScheme() != null && !s.getDrmScheme().isEmpty()) m.put("drmScheme", s.getDrmScheme());
                payload.add(m);
            }
            intent.putExtra("streams", payload);
            context.startActivity(intent);
        });
    }

    @Override
    public int getItemCount() {
        return channels != null ? channels.size() : 0;
    }

    static class ChannelViewHolder extends RecyclerView.ViewHolder {
        ImageView ivChannelLogo;
        TextView tvChannelName, tvTodayMatches;

        public ChannelViewHolder(@NonNull View itemView) {
            super(itemView);
            ivChannelLogo = itemView.findViewById(R.id.ivChannelLogo);
            tvChannelName = itemView.findViewById(R.id.tvChannelName);
            tvTodayMatches = itemView.findViewById(R.id.tvTodayMatches);
        }
    }
}
