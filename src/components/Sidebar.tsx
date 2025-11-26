import { useState, useEffect } from 'react';
import { FolderOpen, History, Plus, Settings, ChevronRight, ChevronDown, Search, Trash2, Edit2, Share2 } from 'lucide-react';
import { supabase, Collection, SavedRequest } from '../lib/supabase';

type SidebarProps = {
  onSelectRequest: (request: SavedRequest) => void;
  onSelectHistory: (historyId: string) => void;
  onNewRequest: () => void;
};

export default function Sidebar({ onSelectRequest, onSelectHistory, onNewRequest }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'collections' | 'history'>('collections');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [requestsByCollection, setRequestsByCollection] = useState<Record<string, SavedRequest[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [contextMenu, setContextMenu] = useState<{ collectionId: string; x: number; y: number } | null>(null);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    const { data: collectionsData } = await supabase
      .from('collections')
      .select('*')
      .order('created_at', { ascending: false });

    if (collectionsData) {
      setCollections(collectionsData);
      loadRequestsForCollections(collectionsData.map(c => c.id));
      setExpandedCollections(new Set(collectionsData.map(c => c.id)));
    }
  };

  const loadRequestsForCollections = async (collectionIds: string[]) => {
    const { data: requestsData } = await supabase
      .from('saved_requests')
      .select('*')
      .in('collection_id', collectionIds)
      .order('created_at', { ascending: false });

    if (requestsData) {
      const grouped = requestsData.reduce((acc, req) => {
        const collId = req.collection_id || 'uncategorized';
        if (!acc[collId]) acc[collId] = [];
        acc[collId].push(req);
        return acc;
      }, {} as Record<string, SavedRequest[]>);
      setRequestsByCollection(grouped);
    }
  };

  const toggleCollection = (collectionId: string) => {
    setExpandedCollections(prev => {
      const next = new Set(prev);
      if (next.has(collectionId)) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
      }
      return next;
    });
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'text-green-500',
      POST: 'text-orange-500',
      PUT: 'text-blue-500',
      PATCH: 'text-yellow-500',
      DELETE: 'text-red-500',
      OPTIONS: 'text-gray-500',
      HEAD: 'text-gray-500',
    };
    return colors[method] || 'text-gray-500';
  };

  const deleteCollection = async (collectionId: string) => {
    await supabase.from('collections').delete().eq('id', collectionId);
    loadCollections();
    setContextMenu(null);
  };

  const filteredRequests = (requests: SavedRequest[]) => {
    if (!searchTerm) return requests;
    return requests.filter(req =>
      req.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.url.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <div className="w-full lg:w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">M2H Postman</h1>
        </div>
        <button
          onClick={onNewRequest}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          New Request
        </button>
      </div>

      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab('collections')}
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-all ${
            activeTab === 'collections'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Collections
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-all ${
            activeTab === 'history'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          History
        </button>
      </div>

      <div className="p-4 bg-white border-b border-gray-200">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'collections' ? (
          <div className="p-2">
            {collections.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8 px-4">
                <FolderOpen size={32} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No collections yet</p>
                <p className="text-xs mt-1">Create your first collection to get started</p>
              </div>
            ) : (
              collections.map(collection => {
                const requests = requestsByCollection[collection.id] || [];
                const filtered = filteredRequests(requests);

                return (
                  <div key={collection.id} className="mb-2">
                    <button
                      onContextMenu={e => {
                        e.preventDefault();
                        setContextMenu({ collectionId: collection.id, x: e.clientX, y: e.clientY });
                      }}
                      onClick={() => toggleCollection(collection.id)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-100 rounded-lg text-left transition-colors group"
                    >
                      {expandedCollections.has(collection.id) ? (
                        <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                      )}
                      <FolderOpen size={16} className="text-orange-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700 flex-1 truncate">
                        {collection.name}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                        {filtered.length}
                      </span>
                    </button>

                    {expandedCollections.has(collection.id) && filtered.length > 0 && (
                      <div className="ml-6 mt-1 space-y-1">
                        {filtered.map(request => (
                          <button
                            key={request.id}
                            onClick={() => onSelectRequest(request)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg text-left transition-colors group"
                          >
                            <span className={`text-xs font-bold ${getMethodColor(request.method)} w-10 flex-shrink-0`}>
                              {request.method}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-800 truncate font-medium">
                                {request.name}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {request.url}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500 text-sm">
            <History size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Request history</p>
            <p className="text-xs mt-1">Your requests will appear here</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-white space-y-2">
        <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors text-sm">
          <Settings size={16} />
          Settings
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors text-sm">
          <Share2 size={16} />
          Share
        </button>
      </div>

      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left">
              <Edit2 size={16} />
              Rename
            </button>
            <button
              onClick={() => deleteCollection(contextMenu.collectionId)}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
