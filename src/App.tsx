import { useState, useEffect } from 'react';
import { Save, Code2 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import RequestBuilder from './components/RequestBuilder';
import ResponseViewer from './components/ResponseViewer';
import SaveRequestModal from './components/SaveRequestModal';
import CodeGeneratorModal from './components/CodeGeneratorModal';
import { RequestConfig, ApiResponse, KeyValuePair } from './types';
import { supabase, SavedRequest } from './lib/supabase';

function App() {
  const [config, setConfig] = useState<RequestConfig>({
    method: 'GET',
    url: '',
    headers: [],
    queryParams: [],
    body: {
      type: 'none',
      content: '',
    },
    auth: {
      type: 'none',
    },
  });

  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);

  const buildUrl = () => {
    const enabledParams = config.queryParams.filter(p => p.enabled && p.key);
    if (enabledParams.length === 0) return config.url;

    const queryString = enabledParams
      .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');

    return config.url.includes('?') ? `${config.url}&${queryString}` : `${config.url}?${queryString}`;
  };

  const buildHeaders = () => {
    const headers: Record<string, string> = {};

    config.headers.filter(h => h.enabled && h.key).forEach(h => {
      headers[h.key] = h.value;
    });

    if (config.auth.type === 'bearer' && config.auth.token) {
      headers['Authorization'] = `Bearer ${config.auth.token}`;
    } else if (config.auth.type === 'apikey' && config.auth.key && config.auth.value) {
      headers[config.auth.key] = config.auth.value;
    } else if (config.auth.type === 'basic' && config.auth.username && config.auth.password) {
      const credentials = btoa(`${config.auth.username}:${config.auth.password}`);
      headers['Authorization'] = `Basic ${credentials}`;
    }

    if (config.body.type === 'json' && config.body.content) {
      headers['Content-Type'] = 'application/json';
    } else if (config.body.type === 'xml' && config.body.content) {
      headers['Content-Type'] = 'application/xml';
    } else if (config.body.type === 'form' && config.body.content) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    return headers;
  };

  const sendRequest = async () => {
    if (!config.url) return;

    setIsSending(true);
    const startTime = Date.now();

    try {
      const url = buildUrl();
      const headers = buildHeaders();

      const body = config.body.type !== 'none' && config.body.content && config.method !== 'GET' && config.method !== 'HEAD'
        ? config.body.content
        : undefined;

      const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-proxy`;

      const proxyResponse = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          method: config.method,
          url,
          headers,
          body,
        }),
      });

      const responseTime = Date.now() - startTime;
      const data = await proxyResponse.json();

      if (!proxyResponse.ok) {
        throw new Error(data.error || 'Request failed');
      }

      const apiResponse: ApiResponse = {
        status: data.status,
        statusText: data.statusText,
        headers: data.headers,
        body: data.body,
        time: data.time || responseTime,
        size: data.size,
      };

      setResponse(apiResponse);

      await supabase.from('request_history').insert([{
        method: config.method,
        url: config.url,
        headers: Object.fromEntries(config.headers.filter(h => h.enabled && h.key).map(h => [h.key, h.value])),
        query_params: Object.fromEntries(config.queryParams.filter(p => p.enabled && p.key).map(p => [p.key, p.value])),
        body: config.body,
        auth: config.auth,
        response_status: data.status,
        response_time: data.time || responseTime,
        response_size: data.size,
        response_headers: data.headers,
        response_body: data.body,
      }]);

    } catch (error) {
      const errorTime = Date.now() - startTime;
      setResponse({
        status: 0,
        statusText: 'Error',
        headers: {},
        body: error instanceof Error ? error.message : 'An error occurred',
        time: errorTime,
        size: 0,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveRequest = async (name: string, collectionId: string | null) => {
    const requestData = {
      name,
      collection_id: collectionId,
      method: config.method,
      url: config.url,
      headers: Object.fromEntries(config.headers.filter(h => h.enabled && h.key).map(h => [h.key, h.value])),
      query_params: Object.fromEntries(config.queryParams.filter(p => p.enabled && p.key).map(p => [p.key, p.value])),
      body: config.body,
      auth: config.auth,
    };

    if (currentRequestId) {
      await supabase
        .from('saved_requests')
        .update(requestData)
        .eq('id', currentRequestId);
    } else {
      const { data } = await supabase
        .from('saved_requests')
        .insert([requestData])
        .select()
        .single();

      if (data) {
        setCurrentRequestId(data.id);
      }
    }
  };

  const handleSelectRequest = (request: SavedRequest) => {
    setCurrentRequestId(request.id);

    const headers: KeyValuePair[] = Object.entries(request.headers || {}).map(([key, value], index) => ({
      id: `header-${index}`,
      key,
      value: value as string,
      enabled: true,
    }));

    const queryParams: KeyValuePair[] = Object.entries(request.query_params || {}).map(([key, value], index) => ({
      id: `param-${index}`,
      key,
      value: value as string,
      enabled: true,
    }));

    setConfig({
      method: request.method as any,
      url: request.url,
      headers,
      queryParams,
      body: request.body,
      auth: request.auth,
    });

    setResponse(null);
  };

  const handleNewRequest = () => {
    setCurrentRequestId(null);
    setConfig({
      method: 'GET',
      url: '',
      headers: [],
      queryParams: [],
      body: {
        type: 'none',
        content: '',
      },
      auth: {
        type: 'none',
      },
    });
    setResponse(null);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50">
      <Sidebar
        onSelectRequest={handleSelectRequest}
        onSelectHistory={() => {}}
        onNewRequest={handleNewRequest}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 lg:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg lg:text-xl font-bold text-gray-800">
              {currentRequestId ? 'Saved Request' : 'New Request'}
            </h2>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowCodeModal(true)}
              disabled={!config.url}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 lg:px-4 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 rounded-lg transition-colors text-sm lg:text-base font-medium"
            >
              <Code2 size={18} />
              <span className="hidden sm:inline">Code</span>
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              disabled={!config.url}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 lg:px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm lg:text-base font-medium"
            >
              <Save size={18} />
              <span className="hidden sm:inline">Save</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="flex-1 lg:border-r border-gray-200 overflow-hidden min-h-64 lg:min-h-auto">
            <RequestBuilder
              config={config}
              onChange={setConfig}
              onSend={sendRequest}
              isSending={isSending}
            />
          </div>

          <div className="flex-1 overflow-hidden min-h-64 lg:min-h-auto border-t lg:border-t-0 border-gray-200">
            <ResponseViewer response={response} />
          </div>
        </div>
      </div>

      <SaveRequestModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveRequest}
      />

      <CodeGeneratorModal
        isOpen={showCodeModal}
        onClose={() => setShowCodeModal(false)}
        config={config}
      />
    </div>
  );
}

export default App;
