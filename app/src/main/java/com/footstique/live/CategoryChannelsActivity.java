package com.footstique.live;

import android.content.Intent;
import android.os.Bundle;
import android.view.MenuItem;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.footstique.live.adapters.ChannelAdapter;
import com.footstique.live.models.Channel;
import com.footstique.live.models.ChannelCategory;
import com.footstique.live.utils.ImageLoader;

public class CategoryChannelsActivity extends AppCompatActivity implements ChannelAdapter.OnChannelClickListener {

    private ChannelCategory category;
    private ImageView ivCategoryLogo;
    private TextView tvCategoryName, tvChannelCount;
    private RecyclerView recyclerViewChannels;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_category_channels);

     
        
        // Initialize views
        ivCategoryLogo = findViewById(R.id.ivCategoryLogo);
        tvCategoryName = findViewById(R.id.tvCategoryName);
        tvChannelCount = findViewById(R.id.tvChannelCount);
        recyclerViewChannels = findViewById(R.id.recyclerViewChannels);

        // Get category from intent
        category = (ChannelCategory) getIntent().getSerializableExtra("category");
        if (category == null) {
            finish();
            return;
        }

        tvCategoryName.setText(category.getName());
        // Use simple text instead of string resource
        tvChannelCount.setText(category.getChannelsCount() + " channels");
        ImageLoader.loadImage(
                category.getLogo(),
                ivCategoryLogo,
                R.color.fs_dark_grey_secondary
        );

        // Set up RecyclerView for channels
        recyclerViewChannels.setLayoutManager(new LinearLayoutManager(this));
        ChannelAdapter adapter = new ChannelAdapter(this, category.getChannels(), this);
        recyclerViewChannels.setAdapter(adapter);
    }

    @Override
    public void onChannelClick(Channel channel) {
        // Open player directly with the channel streams
        Intent intent = new Intent();
        intent.setClassName(this, "com.footstique.player.PlayerActivity");
        java.util.ArrayList<java.util.HashMap<String, String>> payload = new java.util.ArrayList<>();
        for (com.footstique.live.models.Stream s : channel.getStreams()) {
            java.util.HashMap<String, String> m = new java.util.HashMap<>();
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
        startActivity(intent);
    }

 
}
