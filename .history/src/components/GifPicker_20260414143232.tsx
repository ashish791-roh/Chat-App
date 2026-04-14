import React, { useState } from 'react';
import { ImagePlay } from 'lucide-react'; // Or whichever icon you settle on

export const ChatInput = () => {
  const [showGifPicker, setShowGifPicker] = useState(false);

  return (
    {/* 1. Parent container must be relative */}
    <div className="relative w-full border border-gray-700 bg-gray-900 rounded-full p-2 flex items-center mt-4">
      
      {/* 2. The GIF Picker Popover */}
      {showGifPicker && (
        <div 
          className="absolute bottom-[110%] left-4 mb-2 w-[350px] max-h-[400px] flex flex-col bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50"
        >
          {/* Search Bar Area */}
          <div className="p-3 border-b border-gray-800">
            <input 
              type="text" 
              placeholder="Search GIFs..." 
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Scrolling GIF Grid */}
          <div className="p-2 overflow-y-auto grid grid-cols-2 gap-2 custom-scrollbar">
            {/* Placeholder for GIFs - map through your API results here */}
            <div className="h-28 bg-gray-800 rounded-lg animate-pulse"></div>
            <div className="h-28 bg-gray-800 rounded-lg animate-pulse"></div>
            <div className="h-28 bg-gray-800 rounded-lg animate-pulse"></div>
            <div className="h-28 bg-gray-800 rounded-lg animate-pulse"></div>
          </div>
        </div>
      )}

      {/* 3. Your Input Bar Icons */}
      <div className="flex items-center gap-4 px-3 text-gray-400">
        {/* ... other icons ... */}
        
        <button 
          onClick={() => setShowGifPicker(!showGifPicker)}
          className={`hover:text-indigo-400 transition-colors ${showGifPicker ? 'text-indigo-500' : ''}`}
        >
           {/* Your GIF icon trigger */}
           <ImagePlay size={20} />
        </button>
      </div>

      <input 
        type="text" 
        placeholder="Write a message..." 
        className="flex-1 bg-transparent outline-none text-white px-4"
      />
      
      {/* ... mic/send button ... */}
    </div>
  );
};