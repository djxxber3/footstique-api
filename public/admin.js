const { useState, useEffect, useMemo, useCallback } = React;

// Utility functions for Algeria timezone and Latin numbers
const utils = {
    toLatinNumbers(str) {
        if (!str) return str;
        const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        const latinNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        
        let result = str.toString();
        for (let i = 0; i < arabicNumbers.length; i++) {
            result = result.replace(new RegExp(arabicNumbers[i], 'g'), latinNumbers[i]);
        }
        return result;
    },

    formatAlgeriaTime(dateString) {
        try {
            const date = new Date(dateString);
            const algeriaTime = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Africa/Algiers',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(date);
            return this.toLatinNumbers(algeriaTime);
        } catch (error) {
            console.error('Error formatting time:', error);
            return 'N/A';
        }
    },

    formatAlgeriaDate(dateString) {
        try {
            const date = new Date(dateString);
            const algeriaDate = new Intl.DateTimeFormat('ar-DZ', {
                timeZone: 'Africa/Algiers',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).format(date);
            return this.toLatinNumbers(algeriaDate);
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'N/A';
        }
    }
};

// API Helper
const api = {
    baseURL: '/api',
    
    async call(endpoint, method = 'GET', body = null) {
        try {
            const passkey = sessionStorage.getItem('adminPasskey');
            
            const headers = {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            };
            
            if (passkey) {
                headers['X-Admin-Passkey'] = passkey;
            }
            
            // Add cache busting parameter for GET requests
            let finalEndpoint = endpoint;
            if (method === 'GET') {
                const separator = endpoint.includes('?') ? '&' : '?';
                finalEndpoint = `${endpoint}${separator}_t=${Date.now()}`;
            }
            
            const options = { 
                method, 
                headers,
                cache: 'no-cache' // Force no cache
            };
            if (body) options.body = JSON.stringify(body);
            
            const response = await fetch(`${this.baseURL}${finalEndpoint}`, options);
            
            if (response.status === 401) {
                sessionStorage.removeItem('adminPasskey');
                throw new Error('Unauthorized');
            }
            
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ message: 'Request failed' }));
                throw new Error(errData.message || `HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API Error: ${method} ${endpoint}`, error);
            throw error;
        }
    }
};

// Login Component
const LoginComponent = ({ onLogin }) => {
    const [passkey, setPasskey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!passkey.trim()) return;

        setLoading(true);
        setError('');

        try {
            // Temporarily set the passkey for the verification call
            sessionStorage.setItem('adminPasskey', passkey);
            await api.call('/admin/verify-passkey', 'POST');
            // If successful, keep it, otherwise it will be removed in the catch block
            onLogin();
        } catch (err) {
            sessionStorage.removeItem('adminPasskey');
            setError(err.message === 'Unauthorized' ? 'كلمة مرور غير صحيحة' : 'حدث خطأ ما');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md fade-in">
                <div className="text-center mb-8">
                    <i className="fas fa-shield-alt text-5xl text-blue-600 mb-4"></i>
                    <h1 className="text-2xl font-bold text-gray-800">لوحة إدارة المباريات</h1>
                    <p className="text-gray-600 mt-2">أدخل كلمة المرور للوصول</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            كلمة المرور
                        </label>
                        <input
                            type="password"
                            value={passkey}
                            onChange={(e) => setPasskey(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="أدخل كلمة المرور"
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !passkey.trim()}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
                    >
                        {loading ? (
                            <>
                                <div className="loading-spinner ml-2"></div>
                                جاري التحقق...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-sign-in-alt ml-2"></i>
                                دخول
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

// Channel Modal Component
const ChannelModal = ({ isOpen, onClose, channel = null, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        logo_url: '',
        category_id: '',
        streams: [{ 
            url: '', label: '',
            userAgent: '', referer: '', origin: '', cookie: ''
        }]
    });
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Load categories
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const response = await api.call('/admin/categories');
                setCategories(response.data?.categories || []);
            } catch (err) {
                console.error('Error loading categories:', err);
            }
        };
        if (isOpen) {
            loadCategories();
        }
    }, [isOpen]);


useEffect(() => {
    if (channel) {
        setFormData({
            name: channel.name || '',
            logo_url: channel.logo_url || '',
            category_id: channel.category ? channel.category.id : '',
            streams: channel.streams && channel.streams.length > 0
                ? channel.streams.map(s => ({
                    url: s.url || '',
                    label: s.label || '',
                    userAgent: s.userAgent || '',
                    referer: s.referer || '',
                    origin: s.origin || '',
                    cookie: s.cookie || ''
                }))
                : [{ url: '', label: '', userAgent: '', referer: '', origin: '', cookie: '' }]
        });
    } else {
        setFormData({
            name: '',
            logo_url: '',
            category_id: '',
            streams: [{ url: '', label: '', userAgent: '', referer: '', origin: '', cookie: '' }]
        });
    }
    setError('');
}, [channel, isOpen]);

    const addStream = () => {
        setFormData(prev => ({
            ...prev,
            streams: [...prev.streams, { url: '', label: '', userAgent: '', referer: '', origin: '', cookie: '' }]
        }));
    };

    const removeStream = (index) => {
        if (formData.streams.length > 1) {
            setFormData(prev => ({
                ...prev,
                streams: prev.streams.filter((_, i) => i !== index)
            }));
        }
    };

    const updateStream = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            streams: prev.streams.map((stream, i) => 
                i === index ? { ...stream, [field]: value } : stream
            )
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate streams
    const validStreams = formData.streams.filter(s => s.url.trim());
        if (validStreams.length === 0) {
            setError('يجب إضافة رابط واحد على الأقل');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const submitData = {
                name: formData.name,
                logo_url: formData.logo_url,
                category_id: formData.category_id || null,
                streams: validStreams.map((stream, index) => ({
                    url: stream.url.trim(),
                    label: (stream.label || '').trim(),
                    userAgent: (stream.userAgent || '').trim() || undefined,
                    referer: (stream.referer || '').trim() || undefined,
                    origin: (stream.origin || '').trim() || undefined,
                    cookie: (stream.cookie || '').trim() || undefined,
                    sort_order: index
                }))
            };

            if (channel) {
                await api.call(`/admin/channels/${channel.id}`, 'PUT', submitData);
            } else {
                await api.call('/admin/channels', 'POST', submitData);
            }
            onSave();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto modal-container">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base sm:text-lg font-semibold">
                        {channel ? 'تعديل قناة' : 'إضافة قناة جديدة'}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            اسم القناة *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base ios-fix"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            الفئة
                        </label>
                        <select
                            value={formData.category_id}
                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                            className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base ios-fix"
                            disabled={loading}
                        >
                            <option value="">اختر الفئة (اختياري)</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            رابط الشعار
                        </label>
                        <input
                            type="url"
                            value={formData.logo_url}
                            onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                            className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base ios-fix"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                روابط التشغيل *
                            </label>
                            <button
                                type="button"
                                onClick={addStream}
                                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                                disabled={loading}
                            >
                                <i className="fas fa-plus ml-1"></i>
                                إضافة رابط
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {formData.streams.map((stream, index) => (
                                <div key={index} className="p-3 border border-gray-200 rounded-md">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-600">
                                            رابط #{utils.toLatinNumbers(index + 1)}
                                        </span>
                                        {formData.streams.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeStream(index)}
                                                className="text-red-600 hover:text-red-800 text-sm"
                                                disabled={loading}
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="stream-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                        <input
                                            type="url"
                                            placeholder="رابط التشغيل"
                                            value={stream.url}
                                            onChange={(e) => updateStream(index, 'url', e.target.value)}
                                            className="px-3 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base ios-fix"
                                            disabled={loading}
                                        />
                                        
                                        
                                        <input
                                            type="text"
                                            placeholder="تسمية الرابط (اختياري)"
                                            value={stream.label}
                                            onChange={(e) => updateStream(index, 'label', e.target.value)}
                                            className="px-3 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base ios-fix"
                                            disabled={loading}
                                        />
                                        <input
                                            type="text"
                                            placeholder="User-Agent (اختياري)"
                                            value={stream.userAgent}
                                            onChange={(e) => updateStream(index, 'userAgent', e.target.value)}
                                            className="px-3 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base ios-fix"
                                            disabled={loading}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Referer (اختياري)"
                                            value={stream.referer}
                                            onChange={(e) => updateStream(index, 'referer', e.target.value)}
                                            className="px-3 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base ios-fix"
                                            disabled={loading}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Origin (اختياري)"
                                            value={stream.origin}
                                            onChange={(e) => updateStream(index, 'origin', e.target.value)}
                                            className="px-3 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base ios-fix"
                                            disabled={loading}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Cookie (اختياري)"
                                            value={stream.cookie}
                                            onChange={(e) => updateStream(index, 'cookie', e.target.value)}
                                            className="px-3 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base ios-fix"
                                            disabled={loading}
                                        />
                                        
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
                            {error}
                        </div>
                    )}

                    <div className="btn-group flex flex-col sm:flex-row gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200 min-h-[44px]"
                        >
                            {loading ? 'جاري الحفظ...' : (channel ? 'تحديث' : 'إضافة')}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400 disabled:opacity-50 transition-colors duration-200 min-h-[44px]"
                        >
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Channel Management Component
const ChannelManagement = () => {
    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingChannel, setEditingChannel] = useState(null);

    const loadChannels = useCallback(async () => {
        try {
            const response = await api.call('/admin/channels?include_inactive=true');
            setChannels(response.data?.channels || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadChannels();
    }, [loadChannels]);

    const handleAddChannel = () => {
        setEditingChannel(null);
        setShowModal(true);
    };

    const handleEditChannel = (channel) => {
        setEditingChannel(channel);
        setShowModal(true);
    };

    const handleDeleteChannel = async (channelId) => {
        if (!confirm('هل أنت متأكد من حذف هذه القناة؟ سيتم حذف جميع روابطها وروابطها بالمباريات بشكل دائم.')) return;

        try {
            await api.call(`/admin/channels/${channelId}`, 'DELETE');
            await loadChannels();
            alert('تم حذف القناة بنجاح');
        } catch (err) {
            alert(`خطأ في حذف القناة: ${err.message}`);
        }
    };

    const handleToggleActive = async (channel) => {
        try {
            const endpoint = channel.is_active ? 'deactivate' : 'activate';
            await api.call(`/admin/channels/${channel.id}/${endpoint}`, 'PATCH');
            await loadChannels();
        } catch (err) {
            alert(`خطأ في تغيير حالة القناة: ${err.message}`);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="loading-spinner ml-2"></div>
                <span>جاري تحميل القنوات...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">إدارة القنوات</h2>
                <button
                    onClick={handleAddChannel}
                    className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center w-full sm:w-auto min-h-[44px]"
                >
                    <i className="fas fa-plus ml-2"></i>
                    إضافة قناة جديدة
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {channels.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <i className="fas fa-tv text-4xl text-gray-400 mb-4"></i>
                    <h3 className="text-lg font-medium text-gray-600 mb-2">لا توجد قنوات</h3>
                    <p className="text-gray-500 mb-4">ابدأ بإضافة قناة جديدة لعرض المباريات</p>
                    <button
                        onClick={handleAddChannel}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                        إضافة أول قناة
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {channels.map(channel => (
                        <div key={channel.id} className="bg-white p-3 sm:p-4 rounded-lg shadow border channel-card">
                            <div className="flex flex-col sm:flex-row items-start gap-4">
                                <div className="channel-info flex items-center space-x-4 space-x-reverse flex-1 w-full">
                                    {channel.logo_url && (
                                        <img
                                            src={channel.logo_url}
                                            alt={channel.name}
                                            className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded"
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">{channel.name}</h3>
                                        
                                        {/* Stream Links */}
                                        <div className="space-y-1">
                                            {channel.streams && channel.streams.length > 0 ? (
                                                channel.streams.map((stream, index) => (
                                                    <div key={stream.id || index} className="flex items-center gap-2 text-sm">
                                                        <span className="text-gray-600 truncate max-w-xs">
                                                            {stream.label || 'Stream'}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-red-500 text-sm">لا توجد روابط تشغيل</span>
                                            )}
                                        </div>
                                        
                                        <div className="mt-2">
                                            <span className={`px-2 py-1 rounded text-xs ${
                                                channel.is_active 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {channel.is_active ? 'نشط' : 'غير نشط'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="channel-actions flex items-center gap-2 w-full sm:w-auto">
                                    <button
                                        onClick={() => handleToggleActive(channel)}
                                        className={`px-3 py-2 rounded text-sm transition-colors duration-200 flex-1 sm:flex-none ${
                                            channel.is_active
                                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                        }`}
                                    >
                                        {channel.is_active ? 'إلغاء تفعيل' : 'تفعيل'}
                                    </button>
                                    <button
                                        onClick={() => handleEditChannel(channel)}
                                        className="text-blue-600 hover:text-blue-800 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                    >
                                        <i className="fas fa-edit"></i>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteChannel(channel.id)}
                                        className="text-red-600 hover:text-red-800 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                    >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ChannelModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                channel={editingChannel}
                onSave={loadChannels}
            />
        </div>
    );
};

// Link Channels Modal
const LinkChannelsModal = ({ isOpen, onClose, match, onSave }) => {
    const [channels, setChannels] = useState([]);
    const [selectedChannels, setSelectedChannels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadAndSetChannels = async () => {
            if (match) {
                try {
                    const response = await api.call('/admin/channels');
                    setChannels(response.data?.channels || []);
                    // Ensure match.channels is an array before mapping
                    const initialSelected = Array.isArray(match.channels) ? match.channels.map(c => c.id) : [];
                    setSelectedChannels(initialSelected);
                } catch (err) {
                    setError(err.message);
                }
            }
        };

        if (isOpen) {
            loadAndSetChannels();
        }
    }, [isOpen, match]);
    
    const handleSave = async () => {
        setLoading(true);
        setError('');

        try {
            await api.call('/admin/matches/link-channels', 'POST', {
                match_id: match.match_id,
                channel_ids: selectedChannels
            });
            onSave();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleChannel = (channelId) => {
        setSelectedChannels(prev =>
            prev.includes(channelId)
                ? prev.filter(id => id !== channelId)
                : [...prev, channelId]
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto modal-container">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base sm:text-lg font-semibold">ربط القنوات بالمباراة</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {match && (
                    <div className="mb-4 p-3 bg-gray-50 rounded">
                        <div className="text-sm font-medium text-center">
                            {match.home_team_name} vs {match.away_team_name}
                        </div>
                        <div className="text-xs text-gray-600 text-center mt-1">
                            {utils.formatAlgeriaDate(match.kickoff_time)} - {utils.formatAlgeriaTime(match.kickoff_time)}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm mb-4">
                        {error}
                    </div>
                )}

                {channels.length === 0 ? (
                    <div className="text-center py-8">
                        <i className="fas fa-tv text-3xl text-gray-400 mb-3"></i>
                        <p className="text-gray-600">لا توجد قنوات متاحة</p>
                        <p className="text-sm text-gray-500 mt-1">يجب إضافة قنوات أولاً من تبويب القنوات</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {channels.map(channel => (
                            <div
                                key={channel.id}
                                className={`p-3 border rounded cursor-pointer transition-colors duration-200 ${
                                    selectedChannels.includes(channel.id)
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:bg-gray-50'
                                }`}
                                onClick={() => toggleChannel(channel.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedChannels.includes(channel.id)}
                                            onChange={() => toggleChannel(channel.id)}
                                            className="ml-2"
                                        />
                                        <span className="font-medium">{channel.name}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        {channel.streams && channel.streams.length > 0 && (
                                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                                {utils.toLatinNumbers(channel.streams.length)} روابط
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="btn-group flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                        onClick={handleSave}
                        disabled={loading || channels.length === 0}
                        className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200 min-h-[44px]"
                    >
                        {loading ? 'جاري الحفظ...' : 'حفظ'}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400 disabled:opacity-50 transition-colors duration-200 min-h-[44px]"
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
};

// Matches Component
const MatchesComponent = () => {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [linkModalMatch, setLinkModalMatch] = useState(null);

    const loadMatches = useCallback(async (date) => {
        setLoading(true);
        setError('');
        try {
            const response = await api.call(`/admin/matches/${date}`);
            setMatches(response.data?.matches || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMatches(selectedDate);
    }, [selectedDate, loadMatches]);

    // Group matches by competition
    const matchesByCompetition = useMemo(() => {
        if (!Array.isArray(matches)) return [];
        const groupedMatches = {};
        matches.forEach(match => {
            const competitionName = match.competition_name || 'Unknown Competition';
            if (!groupedMatches[competitionName]) {
                groupedMatches[competitionName] = {
                    name: competitionName,
                    logo: match.competition_logo,
                    country: match.competition_country,
                    matches: []
                };
            }
            groupedMatches[competitionName].matches.push(match);
        });
        return Object.values(groupedMatches);
    }, [matches]);

    const getStatusDisplay = (status) => {
        const statusMap = {
            'NS': { text: 'لم تبدأ', color: 'bg-gray-500' },
            'LIVE': { text: 'مباشر', color: 'bg-red-500 status-live' },
            'HT': { text: 'استراحة', color: 'bg-yellow-500' },
            'FT': { text: 'انتهت', color: 'bg-green-500' },
            'CANC': { text: 'ملغية', color: 'bg-red-800' },
            'PST': { text: 'مؤجلة', color: 'bg-orange-500' }
        };
        return statusMap[status] || { text: status, color: 'bg-gray-500' };
    };

    const formatScore = (homeGoals, awayGoals) => {
        if (homeGoals !== null && awayGoals !== null) {
            return `${utils.toLatinNumbers(homeGoals)} - ${utils.toLatinNumbers(awayGoals)}`;
        }
        return 'vs';
    };

    // Navigate to previous day
    const goToPreviousDay = () => {
        const currentDate = new Date(selectedDate);
        currentDate.setDate(currentDate.getDate() - 1);
        setSelectedDate(currentDate.toISOString().split('T')[0]);
    };

    // Navigate to next day
    const goToNextDay = () => {
        const currentDate = new Date(selectedDate);
        currentDate.setDate(currentDate.getDate() + 1);
        setSelectedDate(currentDate.toISOString().split('T')[0]);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="loading-spinner ml-2"></div>
                <span>جاري تحميل المباريات...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">المباريات</h2>

                <div className="flex items-center space-x-2 space-x-reverse">
                    <button 
                        onClick={goToPreviousDay} 
                        className="bg-white text-gray-700 px-3 py-2 rounded-md border shadow-sm hover:bg-gray-50"
                        aria-label="اليوم السابق"
                    >
                        <i className="fas fa-chevron-right"></i>
                    </button>
                    
                    <div className="flex items-center border rounded-md shadow-sm overflow-hidden">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="date-picker px-3 py-2 border-0 focus:ring-0 text-center ios-fix w-full"
                        />
                    </div>
                    
                    <button 
                        onClick={goToNextDay} 
                        className="bg-white text-gray-700 px-3 py-2 rounded-md border shadow-sm hover:bg-gray-50"
                        aria-label="اليوم التالي"
                    >
                        <i className="fas fa-chevron-left"></i>
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {`حدث خطأ: ${error}`}
                </div>
            )}

            {!loading && matchesByCompetition.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <i className="fas fa-futbol text-4xl text-gray-400 mb-4"></i>
                    <h3 className="text-lg font-medium text-gray-600 mb-2">لا توجد مباريات</h3>
                    <p className="text-gray-500">لا توجد مباريات في هذا التاريخ</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {matchesByCompetition.map(competition => (
                        <div key={competition.name} className="bg-white rounded-lg shadow border overflow-hidden">
                            {/* Competition Header */}
                            <div className="bg-gray-800 text-white p-3 flex items-center gap-3">
                                {competition.logo && (
                                    <img 
                                        src={competition.logo} 
                                        alt={competition.name} 
                                        className="w-6 h-6 object-contain"
                                        onError={(e) => e.target.style.display = 'none'}
                                    />
                                )}
                                <h3 className="font-medium">{competition.name}</h3>
                                {competition.country && (
                                    <span className="text-xs text-gray-300">({competition.country})</span>
                                )}
                            </div>
                            
                            {/* Matches List */}
                            <div className="divide-y divide-gray-100">
                                {competition.matches.map(match => {
                                    const statusInfo = getStatusDisplay(match.status);
                                    const matchChannels = Array.isArray(match.channels) ? match.channels : [];
                                    return (
                                        <div key={match.match_id} className="p-3 sm:p-4 match-card hover:bg-gray-50">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2 sm:gap-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`status-badge px-2 sm:px-3 py-1 rounded-full text-white text-xs font-medium ${statusInfo.color}`}>
                                                        {statusInfo.text}
                                                    </span>
                                                    <span className="text-sm text-gray-500">
                                                        {utils.formatAlgeriaTime(match.kickoff_time)}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => setLinkModalMatch(match)}
                                                    className="text-blue-600 hover:text-blue-800 px-3 py-2 rounded border border-blue-300 hover:border-blue-500 text-sm transition-colors duration-200 w-full sm:w-auto text-center"
                                                >
                                                    <i className="fas fa-link ml-1"></i>
                                                    ربط القنوات
                                                </button>
                                            </div>

                                            <div className="match-teams flex flex-col sm:flex-row items-center justify-between gap-4">
                                                <div className="flex items-center gap-4 w-full">
                                                    {/* Home Team */}
                                                    <div className="team-info flex items-center gap-2 flex-1">
                                                        {match.home_team_logo && (
                                                            <img
                                                                src={match.home_team_logo}
                                                                alt={match.home_team_name}
                                                                className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                                                                onError={(e) => e.target.style.display = 'none'}
                                                            />
                                                        )}
                                                        <span className="font-medium text-sm sm:text-base text-right">{match.home_team_name}</span>
                                                    </div>

                                                    {/* Score */}
                                                    <div className="match-score text-center px-2 sm:px-4">
                                                        <div className="text-lg sm:text-xl font-bold text-gray-800">
                                                            {formatScore(match.home_team_goals, match.away_team_goals)}
                                                        </div>
                                                    </div>

                                                    {/* Away Team */}
                                                    <div className="team-info flex items-center gap-2 flex-1 justify-end">
                                                        <span className="font-medium text-sm sm:text-base text-left">{match.away_team_name}</span>
                                                        {match.away_team_logo && (
                                                            <img
                                                                src={match.away_team_logo}
                                                                alt={match.away_team_name}
                                                                className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                                                                onError={(e) => e.target.style.display = 'none'}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Channels */}
                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                                <div className="flex items-center justify-end">
                                                    {matchChannels.length > 0 ? (
                                                        <div className="channel-badges flex flex-wrap gap-1">
                                                            {matchChannels.slice(0, 3).map(channel => (
                                                                <span
                                                                    key={channel.id}
                                                                    className="channel-badge text-white px-2 py-1 rounded text-xs"
                                                                >
                                                                    {channel.name}
                                                                </span>
                                                            ))}
                                                            {matchChannels.length > 3 && (
                                                                <span className="text-xs text-gray-500">
                                                                    +{utils.toLatinNumbers(matchChannels.length - 3)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-red-600">
                                                            ⚠️ لا توجد قنوات مرتبطة
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <LinkChannelsModal
                isOpen={!!linkModalMatch}
                onClose={() => setLinkModalMatch(null)}
                match={linkModalMatch}
                onSave={() => loadMatches(selectedDate)}
            />
        </div>
    );
};

// Sync Component
const SyncComponent = () => {
    const [syncStatus, setSyncStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadSyncStatus = useCallback(async () => {
        try {
            const response = await api.call('/admin/sync/status');
            setSyncStatus(response.data);
        } catch (err) {
            setError(err.message);
        }
    }, []);

    useEffect(() => {
        loadSyncStatus();
        // Poll status periodically to keep UI fresh
        const id = setInterval(loadSyncStatus, 60000);
        return () => clearInterval(id);
    }, [loadSyncStatus]);

    const handleSync = async () => {
        setLoading(true);
        setError('');

        try {
            await api.call('/admin/sync', 'POST');
            await loadSyncStatus();
            alert('تم تحديث البيانات بنجاح');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">مزامنة البيانات</h2>
                <button
                    onClick={handleSync}
                    disabled={loading}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors duration-200 flex items-center"
                >
                    {loading ? (
                        <>
                            <div className="loading-spinner ml-2"></div>
                            جاري المزامنة...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-sync-alt ml-2"></i>
                            مزامنة الآن
                        </>
                    )}
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {syncStatus && (
                <div className="bg-white p-6 rounded-lg shadow border">
                    <h3 className="text-lg font-semibold mb-4">حالة المزامنة</h3>
                    <div className="grid grid-responsive md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">الحالة:</span>
                                <span className={`font-medium`}>
                                    {syncStatus.isRunning
                                        ? <span className="text-blue-600">قيد التشغيل</span>
                                        : syncStatus.isScheduled
                                            ? <span className="text-gray-600">مجدول</span>
                                            : <span className="text-red-600">متوقف</span>
                                    }
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">آخر مزامنة:</span>
                                <span className="font-medium">
                                    {syncStatus.lastSyncDate 
                                        ? utils.formatAlgeriaDate(syncStatus.lastSyncDate)
                                        : 'لم تتم بعد'
                                    }
                                </span>
                            </div>
                            {syncStatus.isScheduled && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">المزامنة القادمة:</span>
                                    <span className="font-medium">
                                        {syncStatus.nextRun ? `${utils.formatAlgeriaDate(syncStatus.nextRun)} - ${utils.formatAlgeriaTime(syncStatus.nextRun)}` : 'غير معروف'}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">عدد المحاولات:</span>
                                <span className="font-medium">
                                    {utils.toLatinNumbers(syncStatus.totalRuns || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">آخر خطأ:</span>
                                <span className="font-medium">
                                    {syncStatus.lastError ? 'يوجد خطأ' : 'لا يوجد'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Category Management Component
const CategoryManagement = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const loadCategories = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.call('/admin/categories?include_inactive=true');
            setCategories(response.data?.categories || []);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    const handleAddCategory = () => {
        setEditingCategory(null);
        setShowModal(true);
    };

    const handleEditCategory = (category) => {
        setEditingCategory(category);
        setShowModal(true);
    };

    const handleDeleteCategory = async (categoryId) => {
        if (!confirm('هل أنت متأكد من حذف هذه الفئة؟ سيتم نقل جميع القنوات إلى "غير مصنف"')) return;

        try {
            await api.call(`/admin/categories/${categoryId}`, 'DELETE');
            await loadCategories();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleToggleStatus = async (category) => {
        try {
            await api.call(`/admin/categories/${category.id}/toggle`, 'PATCH', {
                is_active: !category.is_active
            });
            await loadCategories();
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="mr-3">جاري التحميل...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">إدارة فئات القنوات</h2>
                <button
                    onClick={handleAddCategory}
                    className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center w-full sm:w-auto min-h-[44px]"
                >
                    <i className="fas fa-plus ml-2"></i>
                    إضافة فئة جديدة
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {categories.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <i className="fas fa-layer-group text-4xl text-gray-400 mb-4"></i>
                    <h3 className="text-lg font-medium text-gray-600 mb-2">لا توجد فئات</h3>
                    <p className="text-gray-500 mb-4">ابدأ بإضافة فئة جديدة لتنظيم القنوات</p>
                    <button
                        onClick={handleAddCategory}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                        إضافة أول فئة
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {categories.map(category => (
                        <div key={category.id} className="bg-white p-3 sm:p-4 rounded-lg shadow border category-card">
                            <div className="flex flex-col sm:flex-row items-start gap-4">
                                <div className="category-info flex items-center space-x-4 space-x-reverse flex-1 w-full">
                                    {category.logo_url && (
                                        <img
                                            src={category.logo_url}
                                            alt={category.name}
                                            className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded"
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                                                {category.name}
                                            </h3>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                category.is_active 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {category.is_active ? 'نشط' : 'معطل'}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 text-xs sm:text-sm mb-1">
                                            {category.channels_count || 0} قناة
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <button
                                        onClick={() => handleToggleStatus(category)}
                                        className={`p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded transition-colors ${
                                            category.is_active 
                                                ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                                                : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                                        }`}
                                        title={category.is_active ? 'تعطيل' : 'تفعيل'}
                                    >
                                        <i className={`fas fa-${category.is_active ? 'pause' : 'play'}`}></i>
                                    </button>
                                    <button
                                        onClick={() => handleEditCategory(category)}
                                        className="text-blue-600 hover:text-blue-800 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-blue-50 rounded transition-colors"
                                    >
                                        <i className="fas fa-edit"></i>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCategory(category.id)}
                                        className="text-red-600 hover:text-red-800 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-red-50 rounded transition-colors"
                                    >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <CategoryModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                category={editingCategory}
                onSave={loadCategories}
            />
        </div>
    );
};

// Category Modal Component
const CategoryModal = ({ isOpen, onClose, category, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        logo_url: '',
        sort_order: 0
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name || '',
                logo_url: category.logo_url || '',
                sort_order: category.sort_order || 0
            });
        } else {
            setFormData({
                name: '',
                logo_url: '',
                sort_order: 0
            });
        }
        setError('');
    }, [category, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            setError('الاسم مطلوب');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const url = category ? `/admin/categories/${category.id}` : '/admin/categories';
            const method = category ? 'PUT' : 'POST';
            
            await api.call(url, method, formData);
            onSave();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">
                    {category ? 'تعديل الفئة' : 'إضافة فئة جديدة'}
                </h3>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            الاسم *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="مثال: قنوات رياضية"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            رابط الشعار
                        </label>
                        <input
                            type="url"
                            value={formData.logo_url}
                            onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="https://example.com/logo.png"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            ترتيب العرض
                        </label>
                        <input
                            type="number"
                            value={formData.sort_order}
                            onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            min="0"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'جاري الحفظ...' : (category ? 'تحديث' : 'إضافة')}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                        >
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Main Admin Component
const AdminComponent = () => {
    const [activeTab, setActiveTab] = useState('matches');

    const handleLogout = () => {
        if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
            sessionStorage.removeItem('adminPasskey');
            window.location.reload();
        }
    };

    const tabs = [
        { id: 'matches', label: 'المباريات', icon: 'fas fa-futbol' },
        { id: 'channels', label: 'القنوات', icon: 'fas fa-tv' },
        { id: 'categories', label: 'فئات القنوات', icon: 'fas fa-layer-group' },
        { id: 'sync', label: 'المزامنة', icon: 'fas fa-sync-alt' }
    ];

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <div className="admin-header text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                        <div className="flex items-center">
                            <i className="fas fa-futbol text-2xl ml-3"></i>
                            <h1 className="text-lg sm:text-xl font-bold">لوحة إدارة المباريات</h1>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors duration-200 flex items-center w-full sm:w-auto justify-center"
                        >
                            <i className="fas fa-sign-out-alt ml-2"></i>
                            خروج
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4">
                    <nav className="nav-tabs overflow-x-auto">
                        <div className="flex space-x-4 space-x-reverse min-w-max">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`tab-nav py-3 px-4 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <i className={`${tab.icon} ml-2`}></i>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </nav>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
                <div className="fade-in content-container">
                    {activeTab === 'matches' && <MatchesComponent />}
                    {activeTab === 'channels' && <ChannelManagement />}
                    {activeTab === 'categories' && <CategoryManagement />}
                    {activeTab === 'sync' && <SyncComponent />}
                </div>
            </div>
        </div>
    );
};

// Main App Component
const App = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const passkey = sessionStorage.getItem('adminPasskey');
        if (passkey) {
            // Verify the stored passkey
            api.call('/admin/verify-passkey', 'POST')
                .then(() => setIsAuthenticated(true))
                .catch(() => sessionStorage.removeItem('adminPasskey'))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="loading-spinner ml-2"></div>
                <span>جاري التحميل...</span>
            </div>
        );
    }

    return isAuthenticated ? (
        <AdminComponent />
    ) : (
        <LoginComponent onLogin={() => setIsAuthenticated(true)} />
    );
};

// Render the app
try {
    const root = ReactDOM.createRoot(document.getElementById('app'));
    root.render(<App />);
} catch (error) {
    console.error('Error rendering app:', error);
    // Fallback rendering
    ReactDOM.render(<App />, document.getElementById('app'));
}
