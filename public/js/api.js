const API_BASE = 'http://localhost:5000/api'; // نفس الخادم، نستخدم مسارات نسبية

//const API_BASE = '/api';   // كل طلبات API تبدأ بـ /api

const api = {
  getToken() {
    return localStorage.getItem('token');
  },
  async request(method, url, data = null) {
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      }
    };
    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }
    const response = await fetch(API_BASE + url, config);
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'حدث خطأ');
      }
      return result;
    } else {
      const text = await response.text();
      throw new Error(`استجابة غير JSON (${response.status}): ${text.substring(0, 80)}`);
    }
  },
  get(url) { return this.request('GET', url); },
  post(url, data) { return this.request('POST', url, data); },
  put(url, data) { return this.request('PUT', url, data); },
  delete(url) { return this.request('DELETE', url); }
};