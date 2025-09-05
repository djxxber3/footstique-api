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
import com.footstique.live.models.Channel;
import com.footstique.live.utils.ImageLoader;

import java.util.List;

public class ChannelAdapter extends RecyclerView.Adapter<ChannelAdapter.ChannelViewHolder> {

    private Context context;
    private List<Channel> channels;
    private OnChannelClickListener listener;

    public interface OnChannelClickListener {
        void onChannelClick(Channel channel);
    }

    public ChannelAdapter(Context context, List<Channel> channels, OnChannelClickListener listener) {
        this.context = context;
        this.channels = channels;
        this.listener = listener;
    }

    @NonNull
    @Override
    public ChannelViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_channel, parent, false);
        return new ChannelViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ChannelViewHolder holder, int position) {
        Channel channel = channels.get(position);
        
        holder.tvChannelName.setText(channel.getName());
        
        if (channel.getTodayMatchesCount() > 0) {
            holder.tvTodayMatches.setVisibility(View.VISIBLE);
            // Use simple text instead of string resource
            holder.tvTodayMatches.setText(channel.getTodayMatchesCount() + " matches today");
        } else {
            holder.tvTodayMatches.setVisibility(View.GONE);
        }
        
        ImageLoader.loadImage(
                channel.getLogo(),
                holder.ivChannelLogo,
                R.color.fs_dark_grey_secondary
        );
        
        holder.itemView.setOnClickListener(v -> {
            if (listener != null) {
                listener.onChannelClick(channel);
            }
        });
    }

    @Override
    public int getItemCount() {
        return channels.size();
    }

    public static class ChannelViewHolder extends RecyclerView.ViewHolder {
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
