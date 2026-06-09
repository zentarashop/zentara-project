const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const getToken = () => localStorage.getItem('zentara_token');

const h = (extra = {}) => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  ...extra,
});

const handle = async (res) => {
  const data = await res.json();
  if (!res.ok) {
    // Auto logout เมื่อ token หมดอายุ
    if (res.status === 401) {
      localStorage.removeItem('zentara_token');
      localStorage.removeItem('zentara_user');
      window.dispatchEvent(new Event('zentara_logout'));
    }
    throw new Error(data.error || 'เกิดข้อผิดพลาด');
  }
  return data;
};

export const authApi = {
  register:       (body)  => fetch(`${BASE_URL}/auth/register`,        { method: 'POST',  headers: h(), body: JSON.stringify(body) }).then(handle),
  login:          (body)  => fetch(`${BASE_URL}/auth/login`,           { method: 'POST',  headers: h(), body: JSON.stringify(body) }).then(handle),
  me:             ()      => fetch(`${BASE_URL}/auth/me`,              { headers: h() }).then(handle),
  forgotPassword: (email) => fetch(`${BASE_URL}/auth/forgot-password`, { method: 'POST',  headers: h(), body: JSON.stringify({ email }) }).then(handle),
  updateProfile:  (body)  => fetch(`${BASE_URL}/auth/profile`,        { method: 'PATCH', headers: h(), body: JSON.stringify(body) }).then(handle),
};

export const productsApi = {
  getAll: ()    => fetch(`${BASE_URL}/products`).then(handle),
  getOne: (id)  => fetch(`${BASE_URL}/products/${id}`).then(handle),
};

export const ordersApi = {
  create:     (body) => fetch(`${BASE_URL}/orders`,            { method: 'POST', headers: h(), body: JSON.stringify(body) }).then(handle),
  getAll:     ()     => fetch(`${BASE_URL}/orders`,            { headers: h() }).then(handle),
  getOne:     (id)   => fetch(`${BASE_URL}/orders/${id}`,      { headers: h() }).then(handle),
  uploadSlip: (id, file) => {
    const form = new FormData();
    form.append('slip', file);
    return fetch(`${BASE_URL}/orders/${id}/slip`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    }).then(handle);
  },
};

export const discountsApi = {
  verify: (code) => fetch(`${BASE_URL}/discounts/verify`, { method: 'POST', headers: h(), body: JSON.stringify({ code }) }).then(handle),
};

export const reviewsApi = {
  submit: (body) => fetch(`${BASE_URL}/reviews`, { method: 'POST', headers: h(), body: JSON.stringify(body) }).then(handle),
};

export const adminApi = {
  getCustomers:      ()           => fetch(`${BASE_URL}/admin/customers`,              { headers: h() }).then(handle),
  getStats:          ()           => fetch(`${BASE_URL}/admin/stats`,                  { headers: h() }).then(handle),
  getOrders:         ()           => fetch(`${BASE_URL}/admin/orders`,                 { headers: h() }).then(handle),
  updateOrder:       (id, body)   => fetch(`${BASE_URL}/admin/orders/${id}`,           { method: 'PATCH', headers: h(), body: JSON.stringify(body) }).then(handle),
  getProducts:       ()           => fetch(`${BASE_URL}/admin/products`,               { headers: h() }).then(handle),
  updateProduct:     (id, body)   => fetch(`${BASE_URL}/admin/products/${id}`,         { method: 'PATCH', headers: h(), body: JSON.stringify(body) }).then(handle),
  updateSize:        (id, sz, b)  => fetch(`${BASE_URL}/admin/products/${id}/sizes/${sz}`, { method: 'PATCH', headers: h(), body: JSON.stringify(b) }).then(handle),
  getReviews:        ()           => fetch(`${BASE_URL}/admin/reviews`,                { headers: h() }).then(handle),
  updateReview:      (id, body)   => fetch(`${BASE_URL}/admin/reviews/${id}`,          { method: 'PATCH', headers: h(), body: JSON.stringify(body) }).then(handle),
  deleteReview:      (id)         => fetch(`${BASE_URL}/admin/reviews/${id}`,          { method: 'DELETE', headers: h() }).then(handle),
  getDiscounts:      ()           => fetch(`${BASE_URL}/admin/discounts`,              { headers: h() }).then(handle),
  createDiscount:    (body)       => fetch(`${BASE_URL}/admin/discounts`,              { method: 'POST', headers: h(), body: JSON.stringify(body) }).then(handle),
  toggleDiscount:    (id, active) => fetch(`${BASE_URL}/admin/discounts/${id}`,        { method: 'PATCH',  headers: h(), body: JSON.stringify({ active }) }).then(handle),
  deleteDiscount:    (id)         => fetch(`${BASE_URL}/admin/discounts/${id}`,        { method: 'DELETE', headers: h() }).then(handle),
};
