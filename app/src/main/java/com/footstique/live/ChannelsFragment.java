package com.footstique.live;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.footstique.live.adapters.CategoryAdapter;
import com.footstique.live.models.ChannelCategory;

public class ChannelsFragment extends Fragment implements CategoryAdapter.OnCategoryClickListener {

    private RecyclerView recyclerView;
    
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_channels, container, false);
        
        recyclerView = view.findViewById(R.id.recyclerViewCategories);
        
        // Set up RecyclerView with a grid layout (2 columns)
        recyclerView.setLayoutManager(new GridLayoutManager(getContext(), 2));
        
        // Create and set the adapter
        CategoryAdapter adapter = new CategoryAdapter(getContext(), AppData.getInstance().getCategories(), this);
        recyclerView.setAdapter(adapter);
        
        return view;
    }
    
    @Override
    public void onCategoryClick(ChannelCategory category) {
        Intent intent = new Intent(getActivity(), CategoryChannelsActivity.class);
        intent.putExtra("category", category);
        startActivity(intent);
    }
}
