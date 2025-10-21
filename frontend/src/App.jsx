import React, { useState } from 'react';
import { Search, AlertCircle, Database, Clock, FileText } from 'lucide-react';

export default function MedCPTSearch() {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLimit, setSearchLimit] = useState(5);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState(null);
    const [timingInfo, setTimingInfo] = useState(null);

    const API_BASE_URL = 'http://localhost:8000';

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setError(null);
        setIsSearching(true);
        setTimingInfo(null);

        try {
            const response = await fetch(`${API_BASE_URL}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: searchQuery,
                    limit: searchLimit
                })
            });

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const data = await response.json();
            setSearchResults(data.results);
            setTimingInfo({
                total: data.total_time,
                embedding: data.embedding_time,
                search: data.search_time,
                count: data.results_count
            });
        } catch (err) {
            setError('Search error: ' + err.message);
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <Database className="text-indigo-600" size={40} />
                        <h1 className="text-4xl font-bold text-gray-800">
                            MedCPT Search
                        </h1>
                    </div>
                    <p className="text-gray-600">Medical literature semantic search powered by MedCPT embeddings</p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow-xl p-8">
                    <div className="flex items-center gap-2 mb-6">
                        <Search className="text-blue-600" size={28} />
                        <h2 className="text-2xl font-semibold text-gray-800">Search Medical Literature</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Query
                            </label>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Enter medical query (e.g., 'diabetes treatment options')..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Results limit: {searchLimit}
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="100"
                                value={searchLimit}
                                onChange={(e) => setSearchLimit(parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <button
                            onClick={handleSearch}
                            disabled={isSearching || !searchQuery.trim()}
                            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium text-lg"
                        >
                            {isSearching ? 'Searching...' : 'Search'}
                        </button>
                    </div>

                    {timingInfo && (
                        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="text-gray-600" size={18} />
                                <span className="font-semibold text-gray-700">Performance Metrics</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div className="bg-white p-2 rounded border border-gray-200">
                                    <div className="text-gray-500 text-xs">Total Time</div>
                                    <div className="font-semibold text-gray-800">{timingInfo.total.toFixed(3)}s</div>
                                </div>
                                <div className="bg-white p-2 rounded border border-gray-200">
                                    <div className="text-gray-500 text-xs">Embedding</div>
                                    <div className="font-semibold text-gray-800">{timingInfo.embedding.toFixed(3)}s</div>
                                </div>
                                <div className="bg-white p-2 rounded border border-gray-200">
                                    <div className="text-gray-500 text-xs">Search</div>
                                    <div className="font-semibold text-gray-800">{timingInfo.search.toFixed(3)}s</div>
                                </div>
                                <div className="bg-white p-2 rounded border border-gray-200">
                                    <div className="text-gray-500 text-xs">Results</div>
                                    <div className="font-semibold text-gray-800">{timingInfo.count}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-8">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">
                            Results ({searchResults.length})
                        </h3>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto">
                            {searchResults.map((result, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow bg-white">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <FileText className="text-blue-500" size={18} />
                                            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        PMID: {result.document.pmid}
                      </span>
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {result.document.date}
                      </span>
                                        </div>
                                        <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded">
                      Score: {result.score.toFixed(4)}
                    </span>
                                    </div>

                                    <h4 className="text-lg font-semibold text-gray-800 mb-2 leading-tight">
                                        {result.document.title}
                                    </h4>

                                    <p className="text-gray-700 leading-relaxed text-sm mb-3">
                                        {result.document.abstract}
                                    </p>

                                    <div className="flex items-center gap-3 text-xs text-gray-500 pt-2 border-t border-gray-100">
                                        <span>Source: {result.document.source_file}</span>
                                        <span>•</span>
                                        <a
                                            href={`https://pubmed.ncbi.nlm.nih.gov/${result.document.pmid}/`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                            View on PubMed →
                                        </a>
                                    </div>
                                </div>
                            ))}
                            {searchResults.length === 0 && searchQuery && !isSearching && (
                                <div className="text-center py-12">
                                    <Search className="mx-auto text-gray-300 mb-3" size={48} />
                                    <p className="text-gray-500">No results found</p>
                                </div>
                            )}
                            {searchResults.length === 0 && !searchQuery && (
                                <div className="text-center py-12">
                                    <p className="text-gray-400">Enter a medical query to start searching PubMed articles</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-sm text-blue-800">
                            <p className="font-semibold mb-2">💡 Tips:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>API must be running on localhost:8000</li>
                                <li>Results are ranked by semantic similarity using MedCPT embeddings</li>
                                <li>Press Enter to search quickly</li>
                                <li>Click on PubMed links to view full articles</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-gray-600 text-sm">
                        Made with ❤️ by Krzysztof Wydrzyński
                    </p>
                </div>
            </div>
        </div>
    );
}
