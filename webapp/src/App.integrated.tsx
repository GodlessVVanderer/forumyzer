import React, { useState, useEffect, useRef } from 'react';
import { useForumyzer } from './hooks/useForumyzer';
import { Settings, CommentData, YouTubeSearchResult, ApiKeyError, CategoryKey } from './types';
import { parseGoogleApiError, createNetworkError } from './utils/audio';

import Header from './components/Header';
import SignInScreen from './components/SignInScreen';
import InputSection from './components/InputSection';
import SearchResults from './components/SearchResults';
import Forum from './components/Forum';
import SettingsModal from './components/SettingsModal';
import ConversationalAiModal from './components/ConversationalAiModal';
import ApiErrorScreen from './components/ApiErrorScreen';
import ApiKeyBanner from './components/ApiKeyBanner';
import ConfirmationModal from './components/ConfirmationModal';

// Backend API URL (from environment or default to localhost)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Fixed 7 categories (consistent across all videos)
const FORUM_CATEGORIES = {
    discussion: { name: 'Discussion', emoji: '🗣️', color: '#00BCD4' },
    question: { name: 'Questions', emoji: '❓', color: '#2196F3' },
    feedback: { name: 'Feedback', emoji: '💡', color: '#FF9800' },
    genuine: { name: 'Genuine', emoji: '👍', color: '#4CAF50' },
    bot: { name: 'Bot', emoji: '🤖', color: '#9E9E9E' },
    spam: { name: 'Spam', emoji: '🚫', color: '#F44336' },
    toxic: { name: 'Toxic', emoji: '⚠️', color: '#E91E63' }
} as const;

const App: React.FC = () => {
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [videoUrl, setVideoUrl] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const [apiKey, setApiKey] = useState(() =>
        localStorage.getItem('forumyzer_api_key_override') || import.meta.env.VITE_GEMINI_API_KEY
    );
    const [apiKeyError, setApiKeyError] = useState<ApiKeyError | null>(null);
    const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);

    // Live stream state
    const [isLive, setIsLive] = useState(false);
    const [messageBoardId, setMessageBoardId] = useState<string | null>(null);
    const livePollingInterval = useRef<NodeJS.Timeout | null>(null);

    const {
        isLoading: isAnalyzing,
        loadingMessage,
        error: analysisError,
        setForumError: setAnalysisError,
        forumData,
        setForumData,
        hellData,
        heavenData,
        videoId,
        analyzeVideo,
        clearForumData
    } = useForumyzer(apiKey);

    const [activeTab, setActiveTab] = useState<string>(() =>
        localStorage.getItem('forumyzer_activeTab') || 'discussion'
    );
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isConversationModeActive, setIsConversationModeActive] = useState(false);

    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [editingComment, setEditingComment] = useState<{ id: string; text: string } | null>(null);
    const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
    const hasAutoAnalyzed = useRef(false);

    const [settings, setSettings] = useState<Settings>(() => {
        const savedSettings = localStorage.getItem('forumyzer_settings');
        const defaultSettings: Settings = {
            defaultTab: 'discussion', // Changed from 'heaven' to first fixed category
            defaultSort: 'most_liked',
            aiFeedback: true,
            theme: 'dark',
        };
        const loadedSettings = savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
        if (loadedSettings.defaultSort === 'relevance') {
            loadedSettings.defaultSort = 'most_liked';
        }
        return loadedSettings;
    });

    useEffect(() => {
        localStorage.setItem('forumyzer_settings', JSON.stringify(settings));
        if (settings.theme === 'light') {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
    }, [settings]);

    useEffect(() => {
        localStorage.setItem('forumyzer_activeTab', activeTab);
    }, [activeTab]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const videoIdFromUrl = params.get('videoId');
        const commentIdFromUrl = params.get('commentId');

        if (videoIdFromUrl) {
            const url = `https://www.youtube.com/watch?v=${videoIdFromUrl}`;
            setVideoUrl(url);
            if (commentIdFromUrl) {
                setHighlightedCommentId(commentIdFromUrl);
            }
        }
    }, []);

    useEffect(() => {
        if (videoUrl && !forumData && !isAnalyzing && !hasAutoAnalyzed.current) {
            hasAutoAnalyzed.current = true;
            handleForumyzeVideo(new URL(videoUrl).searchParams.get('v')!);
        }
    }, [videoUrl, forumData, isAnalyzing]);

    // Cleanup live polling on unmount
    useEffect(() => {
        return () => {
            if (livePollingInterval.current) {
                clearInterval(livePollingInterval.current);
            }
        };
    }, []);

    const handleSearch = async () => {
        if (!searchQuery.trim() || !apiKey) return;
        setIsSearching(true);
        setSearchError(null);
        setApiKeyError(null);
        setSearchResults([]);
        clearForumData();

        try {
            const searchApiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=10&key=${apiKey}`;
            const response = await fetch(searchApiUrl);
            const data = await response.json();

            if (!response.ok) {
                throw parseGoogleApiError(data, 'Could not fetch search results.');
            }
            setSearchResults(data.items);

        } catch (err) {
            if (err && (err as ApiKeyError).type) {
                setApiKeyError(err as ApiKeyError);
            } else if (err instanceof TypeError) {
                setApiKeyError(createNetworkError());
            } else if (err instanceof Error) {
                setSearchError(err.message);
            } else {
                setSearchError('An unknown error occurred during search.');
            }
        } finally {
            setIsSearching(false);
        }
    };

    // Check if video is live
    const checkLiveStatus = async (selectedVideoId: string): Promise<boolean> => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/video/${selectedVideoId}/live-status`);
            const data = await response.json();
            return data.isLive || false;
        } catch (err) {
            console.error('Failed to check live status:', err);
            return false;
        }
    };

    // Load existing message board from backend
    const loadMessageBoard = async (selectedVideoId: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/messageboard/video/${selectedVideoId}`);
            if (response.ok) {
                const board = await response.json();
                setMessageBoardId(board.id);

                // Convert backend format to frontend format
                // Backend has threads with aiCategory, frontend has categories object
                const categorizedData: Record<string, CommentData[]> = {};

                // Initialize all categories
                Object.keys(FORUM_CATEGORIES).forEach(cat => {
                    categorizedData[cat] = [];
                });

                // Distribute threads into categories
                board.threads?.forEach((thread: CommentData) => {
                    const category = thread.aiCategory || 'discussion';
                    if (categorizedData[category]) {
                        categorizedData[category].push(thread);
                    }
                });

                return categorizedData;
            }
        } catch (err) {
            console.error('Failed to load message board:', err);
        }
        return null;
    };

    // Start live stream polling
    const startLivePolling = async (selectedVideoId: string, boardId: string) => {
        if (livePollingInterval.current) {
            clearInterval(livePollingInterval.current);
        }

        const pollLiveChat = async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/api/forumize/live`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        videoId: selectedVideoId,
                        useAI: true
                    })
                });

                if (response.ok) {
                    const data = await response.json();

                    if (!data.isLive) {
                        // Stream ended
                        setIsLive(false);
                        if (livePollingInterval.current) {
                            clearInterval(livePollingInterval.current);
                            livePollingInterval.current = null;
                        }
                        return;
                    }

                    // Update forum data with new messages
                    if (data.messageBoard?.threads) {
                        const categorizedData: Record<string, CommentData[]> = {};
                        Object.keys(FORUM_CATEGORIES).forEach(cat => {
                            categorizedData[cat] = [];
                        });

                        data.messageBoard.threads.forEach((thread: CommentData) => {
                            const category = thread.aiCategory || 'discussion';
                            if (categorizedData[category]) {
                                categorizedData[category].push(thread);
                            }
                        });

                        setForumData(categorizedData);
                    }
                }
            } catch (err) {
                console.error('Live polling error:', err);
            }
        };

        // Poll every 5 seconds
        pollLiveChat(); // Initial poll
        livePollingInterval.current = setInterval(pollLiveChat, 5000);
    };

    const handleForumyzeVideo = async (selectedVideoId: string) => {
        const url = `https://www.youtube.com/watch?v=${selectedVideoId}`;
        setVideoUrl(url);
        setSearchResults([]);
        setSearchQuery('');
        setSearchError(null);
        setApiKeyError(null);

        try {
            // Check if video is live
            const liveStatus = await checkLiveStatus(selectedVideoId);
            setIsLive(liveStatus);

            // Try to load existing message board from backend
            const existingBoard = await loadMessageBoard(selectedVideoId);

            if (existingBoard && Object.values(existingBoard).some(arr => arr.length > 0)) {
                // Use existing board
                setForumData(existingBoard);

                // If live, start polling for updates
                if (liveStatus && messageBoardId) {
                    startLivePolling(selectedVideoId, messageBoardId);
                }

                // Set active tab
                const firstNonEmptyCategory = Object.keys(existingBoard).find(
                    cat => existingBoard[cat].length > 0
                );
                setActiveTab(firstNonEmptyCategory || 'discussion');
            } else {
                // Analyze with AI (this will also save to backend)
                const result = await analyzeVideo(url, settings.defaultTab);

                if (result && result.initialTab) {
                    if (highlightedCommentId && result.data) {
                        let foundCategory: string | null = null;
                        const findCommentRecursively = (comments: CommentData[]): CommentData | null => {
                            for (const comment of comments) {
                                if (comment.id === highlightedCommentId) return comment;
                                if (comment.replies && comment.replies.length > 0) {
                                    const foundInReply = findCommentRecursively(comment.replies);
                                    if (foundInReply) return foundInReply;
                                }
                            }
                            return null;
                        };

                        for (const categoryName in result.data) {
                            if (findCommentRecursively(result.data[categoryName])) {
                                foundCategory = categoryName;
                                break;
                            }
                        }

                        if (foundCategory) {
                            setActiveTab(foundCategory);
                        } else if (result.hellData?.some(c => c.id === highlightedCommentId)) {
                            setActiveTab('Forumyzer Hell');
                        } else {
                            setActiveTab('Forumyzer Heaven');
                        }
                    } else {
                        setActiveTab(result.initialTab);
                    }
                }

                // If live, start polling
                if (liveStatus && result?.boardId) {
                    setMessageBoardId(result.boardId);
                    startLivePolling(selectedVideoId, result.boardId);
                }
            }
        } catch (err) {
            if (err && (err as ApiKeyError).type) {
                setApiKeyError(err as ApiKeyError);
            } else if (err instanceof Error) {
                setAnalysisError(err.message);
            } else {
                setAnalysisError('An unknown error occurred during analysis.');
            }
        }
    };

    const handleKeyUpdate = (newKey: string) => {
        localStorage.setItem('forumyzer_api_key_override', newKey);
        setApiKey(newKey);
        setApiKeyError(null);
    };

    const handleSignOut = () => {
        setIsSignedIn(false);
        setVideoUrl('');
        setSearchQuery('');
        setSearchResults([]);
        clearForumData();
        setCommentToDeleteId(null);
        setActiveTab('discussion');
        setHighlightedCommentId(null);
        setApiKeyError(null);
        setIsLive(false);
        setMessageBoardId(null);
        hasAutoAnalyzed.current = false;

        // Stop live polling
        if (livePollingInterval.current) {
            clearInterval(livePollingInterval.current);
            livePollingInterval.current = null;
        }

        window.history.replaceState({}, document.title, window.location.pathname);
    };

    const requestDeleteComment = (commentId: string) => {
        setCommentToDeleteId(commentId);
    };

    const handleConfirmDelete = () => {
        if (!commentToDeleteId) return;

        setForumData(prevData => {
            if (!prevData) return null;
            const newData = JSON.parse(JSON.stringify(prevData));

            const deleteRecursively = (comments: CommentData[]): boolean => {
                if (!Array.isArray(comments)) return false;
                const index = comments.findIndex(c => c && c.id === commentToDeleteId);
                if (index > -1) {
                    comments.splice(index, 1);
                    return true;
                }
                for (const comment of comments) {
                    if (comment && comment.replies && Array.isArray(comment.replies) && deleteRecursively(comment.replies)) {
                        return true;
                    }
                }
                return false;
            };

            for (const categoryName in newData) {
                const comments = newData[categoryName];
                if (Array.isArray(comments) && deleteRecursively(comments)) {
                    break;
                }
            }
            return newData;
        });

        setCommentToDeleteId(null);
    };

    const handleSaveEdit = (commentId: string, newText: string) => {
        setForumData(prevData => {
            if (!prevData) return null;
            const newData = JSON.parse(JSON.stringify(prevData));

            const findAndEditRecursively = (comments: CommentData[]): boolean => {
                for (const comment of comments) {
                    if (comment.id === commentId) {
                        comment.text = newText;
                        return true;
                    }
                    if (comment.replies && comment.replies.length > 0) {
                        if (findAndEditRecursively(comment.replies)) {
                            return true;
                        }
                    }
                }
                return false;
            };

            for (const categoryName in newData) {
                if (findAndEditRecursively(newData[categoryName])) {
                    break;
                }
            }
            return newData;
        });

        setEditingComment(null);
    };

    const handlePostReply = (parentId: string, categoryName: string, replyText: string) => {
        if (!replyText.trim()) return;

        const newReply: CommentData = {
            id: `${Date.now()}-${Math.random()}`,
            author: 'Jane Doe',
            text: replyText,
            replies: [],
            publishedAt: new Date(),
            likeCount: 0,
        };

        setForumData(prevData => {
            if (!prevData) return null;
            const newData = JSON.parse(JSON.stringify(prevData));

            const addReplyRecursively = (comments: CommentData[]): boolean => {
                for (const comment of comments) {
                    if (comment.id === parentId) {
                        if (!comment.replies) comment.replies = [];
                        comment.replies.unshift(newReply);
                        return true;
                    }
                    if (comment.replies && addReplyRecursively(comment.replies)) {
                        return true;
                    }
                }
                return false;
            };

            if (newData[categoryName]) {
                addReplyRecursively(newData[categoryName]);
            }

            return newData;
        });
    };

    if (!apiKey) {
        return <ApiErrorScreen />;
    }

    if (!isSignedIn) {
        return <SignInScreen onSignIn={() => setIsSignedIn(true)} />;
    }

    return (
        <div className="app-container">
            <Header
                onSignOut={handleSignOut}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenConversation={() => setIsConversationModeActive(true)}
            />
            <main className="app-main">
                {apiKeyError && <ApiKeyBanner error={apiKeyError} onUpdateKey={handleKeyUpdate} />}

                <InputSection
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    onSearch={handleSearch}
                    isSearching={isSearching}
                />

                {(searchError || analysisError) && !apiKeyError &&
                    <div className="error-message">{searchError || analysisError}</div>
                }

                {searchResults.length > 0 && (
                    <SearchResults
                        results={searchResults}
                        onForumyzeVideo={handleForumyzeVideo}
                    />
                )}

                <div className={`content-area ${(videoId && (isAnalyzing || forumData)) ? 'visible' : ''}`}>
                    {videoId && (
                        <div className="video-container">
                            <iframe
                                src={`https://www.youtube.com/embed/${videoId}`}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>
                    )}
                    <Forum
                        isLoading={isAnalyzing}
                        loadingMessage={loadingMessage}
                        forumData={forumData}
                        heavenData={heavenData}
                        hellData={hellData}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        defaultSort={settings.defaultSort}
                        highlightedCommentId={highlightedCommentId}
                        replyingTo={replyingTo}
                        setReplyingTo={setReplyingTo}
                        editingComment={editingComment}
                        setEditingComment={setEditingComment}
                        onDeleteComment={requestDeleteComment}
                        onSaveEdit={handleSaveEdit}
                        onPostReply={handlePostReply}
                        isLive={isLive}
                        categories={FORUM_CATEGORIES}
                    />
                </div>
            </main>
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                currentSettings={settings}
                onSettingsChange={setSettings}
            />
            <ConversationalAiModal
                isOpen={isConversationModeActive}
                onClose={() => setIsConversationModeActive(false)}
                apiKey={apiKey}
                onApiKeyError={setApiKeyError}
            />
            <ConfirmationModal
                isOpen={!!commentToDeleteId}
                onClose={() => setCommentToDeleteId(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Comment"
                message="Are you sure you want to delete this comment permanently? This action cannot be undone."
                confirmText="Delete"
            />
        </div>
    );
};

export default App;
