import { useState } from 'react';
import { Send, Plus, X } from 'lucide-react';
import { HttpMethod, BodyType, AuthType, KeyValuePair, RequestConfig } from '../types';

type RequestBuilderProps = {
  config: RequestConfig;
  onChange: (config: RequestConfig) => void;
  onSend: () => void;
  isSending: boolean;
};

export default function RequestBuilder({ config, onChange, onSend, isSending }: RequestBuilderProps) {
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'auth'>('params');

  const httpMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

  const addKeyValuePair = (type: 'headers' | 'queryParams') => {
    const newPair: KeyValuePair = {
      id: Date.now().toString(),
      key: '',
      value: '',
      enabled: true,
    };
    onChange({
      ...config,
      [type]: [...config[type], newPair],
    });
  };

  const updateKeyValuePair = (
    type: 'headers' | 'queryParams',
    id: string,
    field: keyof KeyValuePair,
    value: string | boolean
  ) => {
    onChange({
      ...config,
      [type]: config[type].map(pair =>
        pair.id === id ? { ...pair, [field]: value } : pair
      ),
    });
  };

  const removeKeyValuePair = (type: 'headers' | 'queryParams', id: string) => {
    onChange({
      ...config,
      [type]: config[type].filter(pair => pair.id !== id),
    });
  };

  const renderKeyValueEditor = (type: 'headers' | 'queryParams', pairs: KeyValuePair[]) => (
    <div className="space-y-2">
      {pairs.map(pair => (
        <div key={pair.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <input
            type="checkbox"
            checked={pair.enabled}
            onChange={e => updateKeyValuePair(type, pair.id, 'enabled', e.target.checked)}
            className="w-4 h-4 text-orange-600 rounded mt-2.5 sm:mt-0"
          />
          <input
            type="text"
            placeholder="Key"
            value={pair.key}
            onChange={e => updateKeyValuePair(type, pair.id, 'key', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
          />
          <input
            type="text"
            placeholder="Value"
            value={pair.value}
            onChange={e => updateKeyValuePair(type, pair.id, 'value', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
          />
          <button
            onClick={() => removeKeyValuePair(type, pair.id)}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>
      ))}
      <button
        onClick={() => addKeyValuePair(type)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors font-medium"
      >
        <Plus size={16} />
        Add {type === 'headers' ? 'Header' : 'Parameter'}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 lg:p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row gap-2 lg:gap-3 mb-4">
          <select
            value={config.method}
            onChange={e => onChange({ ...config, method: e.target.value as HttpMethod })}
            className="px-3 lg:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-semibold text-sm lg:text-base w-28 lg:w-auto"
          >
            {httpMethods.map(method => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="https://api.example.com/users"
            value={config.url}
            onChange={e => onChange({ ...config, url: e.target.value })}
            className="flex-1 px-3 lg:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm lg:text-base"
          />
          <button
            onClick={onSend}
            disabled={isSending || !config.url}
            className="px-4 lg:px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors text-sm lg:text-base whitespace-nowrap"
          >
            <Send size={18} />
            <span className="hidden sm:inline">{isSending ? 'Sending...' : 'Send'}</span>
          </button>
        </div>

        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
          {(['params', 'headers', 'body', 'auth'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 lg:px-4 py-2 text-sm font-medium capitalize transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {activeTab === 'params' && renderKeyValueEditor('queryParams', config.queryParams)}

        {activeTab === 'headers' && renderKeyValueEditor('headers', config.headers)}

        {activeTab === 'body' && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {(['none', 'json', 'xml', 'form', 'raw'] as BodyType[]).map(type => (
                <button
                  key={type}
                  onClick={() => onChange({ ...config, body: { ...config.body, type } })}
                  className={`px-3 lg:px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
                    config.body.type === type
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
            {config.body.type !== 'none' && (
              <textarea
                value={config.body.content}
                onChange={e => onChange({ ...config, body: { ...config.body, content: e.target.value } })}
                placeholder={`Enter ${config.body.type.toUpperCase()} content`}
                className="w-full h-48 lg:h-64 px-3 lg:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
              />
            )}
          </div>
        )}

        {activeTab === 'auth' && (
          <div className="space-y-4">
            <select
              value={config.auth.type}
              onChange={e => onChange({ ...config, auth: { type: e.target.value as AuthType } })}
              className="w-full px-3 lg:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            >
              <option value="none">No Auth</option>
              <option value="bearer">Bearer Token</option>
              <option value="apikey">API Key</option>
              <option value="basic">Basic Auth</option>
            </select>

            {config.auth.type === 'bearer' && (
              <input
                type="text"
                placeholder="Token"
                value={config.auth.token || ''}
                onChange={e => onChange({ ...config, auth: { ...config.auth, token: e.target.value } })}
                className="w-full px-3 lg:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            )}

            {config.auth.type === 'apikey' && (
              <>
                <input
                  type="text"
                  placeholder="Key"
                  value={config.auth.key || ''}
                  onChange={e => onChange({ ...config, auth: { ...config.auth, key: e.target.value } })}
                  className="w-full px-3 lg:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={config.auth.value || ''}
                  onChange={e => onChange({ ...config, auth: { ...config.auth, value: e.target.value } })}
                  className="w-full px-3 lg:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </>
            )}

            {config.auth.type === 'basic' && (
              <>
                <input
                  type="text"
                  placeholder="Username"
                  value={config.auth.username || ''}
                  onChange={e => onChange({ ...config, auth: { ...config.auth, username: e.target.value } })}
                  className="w-full px-3 lg:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={config.auth.password || ''}
                  onChange={e => onChange({ ...config, auth: { ...config.auth, password: e.target.value } })}
                  className="w-full px-3 lg:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
