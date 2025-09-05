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
import com.footstique.live.models.ChannelCategory;
import com.footstique.live.utils.ImageLoader;

import java.util.List;

public class CategoryAdapter extends RecyclerView.Adapter<CategoryAdapter.CategoryViewHolder> {

    private Context context;
    private List<ChannelCategory> categories;
    private OnCategoryClickListener listener;

    public interface OnCategoryClickListener {
        void onCategoryClick(ChannelCategory category);
    }

    public CategoryAdapter(Context context, List<ChannelCategory> categories, OnCategoryClickListener listener) {
        this.context = context;
        this.categories = categories;
        this.listener = listener;
    }

    @NonNull
    @Override
    public CategoryViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_category, parent, false);
        return new CategoryViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull CategoryViewHolder holder, int position) {
        ChannelCategory category = categories.get(position);
        
        // Set category name and channels count
        holder.tvCategoryName.setText(category.getName());
        holder.tvChannelsCount.setText(category.getChannelsCount() + " channels");
        
        // Load category logo using our simple ImageLoader
        ImageLoader.loadImage(
                category.getLogo(),
                holder.ivCategoryLogo,
                R.color.fs_dark_grey_secondary
        );
        
        // Set click listener
        holder.itemView.setOnClickListener(v -> {
            if (listener != null) {
                listener.onCategoryClick(category);
            }
        });
    }

    @Override
    public int getItemCount() {
        return categories.size();
    }

    public static class CategoryViewHolder extends RecyclerView.ViewHolder {
        ImageView ivCategoryLogo;
        TextView tvCategoryName, tvChannelsCount;

        public CategoryViewHolder(@NonNull View itemView) {
            super(itemView);
            ivCategoryLogo = itemView.findViewById(R.id.ivCategoryLogo);
            tvCategoryName = itemView.findViewById(R.id.tvCategoryName);
            tvChannelsCount = itemView.findViewById(R.id.tvChannelsCount);
        }
    }
}
