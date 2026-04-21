'use client';

import { useState, useEffect } from 'react';
import { Camera, Type, Video, X } from 'lucide-react';
import { StatusUpdate } from '@/types';
import { subscribeToStatusUpdates, createStatusUpdate } from '@/lib/statusUpdates';

interface StatusUpdatesProps {
  userId: string;
  friendIds: string[];
}

export default function StatusUpdates({ userId, friendIds }: StatusUpdatesProps) {
  const [statuses, setStatuses] = useState<StatusUpdate[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusType, setStatusType] = useState<'text' | 'image' | 'video'>('text');
  const [statusContent, setStatusContent] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToStatusUpdates(userId, friendIds, setStatuses);
    return unsubscribe;
  }, [userId, friendIds]);

  const handleCreateStatus = async () => {
    if (statusContent.trim()) {
      await createStatusUpdate(userId, statusType, statusContent);
      setShowCreateModal(false);
      setStatusContent('');
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Status</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="p-2 bg-blue-500 text-white rounded-full"
        >
          <Camera size={20} />
        </button>
      </div>

      {/* Status list */}
      <div className="flex space-x-4 overflow-x-auto">
        {/* My status */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
            <Camera size={24} />
          </div>
          <span className="text-xs mt-1">My Status</span>
        </div>

        {/* Friends' statuses */}
        {statuses.map(status => (
          <div key={status.id} className="flex flex-col items-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-1">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                {status.type === 'text' && <Type size={20} />}
                {status.type === 'image' && status.mediaUrl && <img src={status.mediaUrl} className="w-full h-full rounded-full object-cover" />}
                {status.type === 'video' && <Video size={20} />}
              </div>
            </div>
            <span className="text-xs mt-1">{status.userId}</span>
          </div>
        ))}
      </div>

      {/* Create status modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Create Status</h3>
              <button onClick={() => setShowCreateModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => setStatusType('text')}
                className={`p-2 rounded ${statusType === 'text' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                <Type size={20} />
              </button>
              <button
                onClick={() => setStatusType('image')}
                className={`p-2 rounded ${statusType === 'image' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                <Camera size={20} />
              </button>
              <button
                onClick={() => setStatusType('video')}
                className={`p-2 rounded ${statusType === 'video' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                <Video size={20} />
              </button>
            </div>

            {statusType === 'text' && (
              <textarea
                value={statusContent}
                onChange={(e) => setStatusContent(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full p-2 border rounded mb-4"
                rows={4}
              />
            )}

            <button
              onClick={handleCreateStatus}
              className="w-full bg-blue-500 text-white py-2 rounded"
            >
              Share Status
            </button>
          </div>
        </div>
      )}
    </div>
  );
}